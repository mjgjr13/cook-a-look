export interface ConciergeMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/advisor-chat`;

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
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
