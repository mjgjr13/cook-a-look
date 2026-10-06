export interface ConciergeMessage {
  role: "user" | "assistant";
  content: string;
}

// Same fallbacks as src/integrations/supabase/client.ts: the Cloudflare build
// doesn't set VITE_SUPABASE_* env vars, so they must not be required here.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://chjmyzzczwattluqpbat.supabase.co";
const PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoam15enpjendhdHRsdXFwYmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDM3NjksImV4cCI6MjA4MzgxOTc2OX0.Y6N53UNdAZ5x02ADZNo7KMbjxEIsAmu8tq5OShOIHOs";
const CHAT_URL = `${SUPABASE_URL}/functions/v1/advisor-chat`;

/**
 * Sends the conversation to the AI Concierge edge function and streams the
 * reply (OpenAI-style SSE). Calls onDelta with the full reply so far.
 */
export interface ConciergeOptions {
  /** Signed-in visitor: lets the concierge use and update its memory. */
  memoryEnabled?: boolean;
  /** What the concierge remembers about a signed-in visitor. */
  profile?: string | null;
  /** Random per-browser-session id, used to group anonymised logs. */
  sessionId?: string;
}

export async function streamConcierge(
  messages: ConciergeMessage[],
  onDelta: (fullText: string) => void,
  signal?: AbortSignal,
  options: ConciergeOptions = {},
): Promise<string> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      memoryEnabled: !!options.memoryEnabled,
      profile: options.memoryEnabled ? options.profile ?? null : null,
      sessionId: options.sessionId,
    }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "The concierge couldn't respond. Please try again.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return text;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content as string | undefined;
        if (delta) {
          text += delta;
          onDelta(text);
        }
      } catch {
        // Partial JSON across chunks: put it back and wait for more data.
        buffer = `${line}\n${buffer}`;
        break;
      }
    }
  }
  return text;
}

/** Advisor ids referenced as [Name](advisor:ID) in a reply, in order, de-duplicated. */
export const extractAdvisorIds = (text: string): string[] => [
  ...new Set([...text.matchAll(/\]\(advisor(?:-corporate)?:([0-9a-f-]{36})\)/gi)].map((m) => m[1])),
];

/** Advisors the concierge suggested for a corporate engagement ([Name](advisor-corporate:ID)). */
export const extractCorporateAdvisorIds = (text: string): Set<string> =>
  new Set([...text.matchAll(/\]\(advisor-corporate:([0-9a-f-]{36})\)/gi)].map((m) => m[1]));

export interface ParsedReply {
  /** Text to show (hidden control lines removed). */
  display: string;
  /** Tappable follow-up replies. */
  suggestions: string[];
  /** Updated memory summary, when the concierge learned something lasting. */
  profile: string | null;
}

/**
 * Splits the concierge's hidden control lines ([[suggestions: a | b]] and
 * [[profile: ...]]) from the visible reply. While streaming, anything from a
 * trailing "[[" onward is hidden so half-written control lines never flash.
 */
export const parseConciergeReply = (text: string): ParsedReply => {
  const suggestionsMatch = text.match(/\[\[suggestions:([^\]]*)\]\]/i);
  const profileMatch = text.match(/\[\[profile:([^\]]*)\]\]/i);
  let display = text.replace(/\[\[(suggestions|profile):[^\]]*\]\]/gi, "");
  const open = display.indexOf("[[");
  if (open !== -1) display = display.slice(0, open);
  return {
    display: display.trim(),
    suggestions: suggestionsMatch
      ? suggestionsMatch[1].split("|").map((x) => x.trim()).filter(Boolean).slice(0, 3)
      : [],
    profile: profileMatch ? profileMatch[1].trim().slice(0, 600) || null : null,
  };
};
