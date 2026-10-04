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
 * Sends the conversation to the Style Concierge edge function and streams the
 * reply (OpenAI-style SSE). Calls onDelta with the full reply so far.
 */
export async function streamConcierge(
  messages: ConciergeMessage[],
  onDelta: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
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
  ...new Set([...text.matchAll(/\]\(advisor:([0-9a-f-]{36})\)/gi)].map((m) => m[1])),
];
