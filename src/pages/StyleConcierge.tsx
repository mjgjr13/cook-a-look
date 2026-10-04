import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Loader2, MapPin, RotateCcw, Video } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { withSampleContent } from "@/lib/sampleAdvisors";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { streamConcierge, extractAdvisorIds, type ConciergeMessage } from "@/lib/conciergeStream";

const STORAGE_KEY = "cal_concierge_conversation";

const STARTERS = [
  "I have a wedding coming up and don't know what to wear",
  "Help me refresh my work wardrobe",
  "What should I wear on a first date?",
  "Help me find the right style advisor",
];

interface AdvisorCard {
  id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
  price_per_session: number | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
  isSample: boolean;
}

const loadConversation = (): ConciergeMessage[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConciergeMessage[]) : [];
  } catch {
    return [];
  }
};

const saveConversation = (messages: ConciergeMessage[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage unavailable (private mode); conversation just won't persist
  }
};

const AdvisorSuggestion = ({ advisor }: { advisor: AdvisorCard }) => (
  <Link
    to={`/advisors/${advisor.id}`}
    className="flex gap-3 border border-border bg-background p-3 transition-colors hover:border-foreground"
  >
    <div className="h-20 w-16 shrink-0 overflow-hidden bg-muted">
      {advisor.avatar_url && (
        <img
          src={optimizedImageUrl(advisor.avatar_url, 160, 200)}
          onError={fallbackToOriginal(advisor.avatar_url)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </div>
    <div className="min-w-0 text-sm">
      <p className="font-semibold text-foreground">{advisor.full_name}</p>
      {advisor.specialty && <p className="text-muted-foreground truncate">{advisor.specialty}</p>}
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {advisor.price_per_session ? <span className="text-foreground">${advisor.price_per_session}/hour</span> : null}
        {advisor.virtual_available && (
          <span className="inline-flex items-center gap-1">
            <Video className="h-3 w-3" aria-hidden="true" /> Video
          </span>
        )}
        {advisor.in_person_available && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" /> {advisor.location || "In person"}
          </span>
        )}
      </p>
      {advisor.isSample && <p className="mt-1 text-xs text-muted-foreground">Sample profile</p>}
    </div>
  </Link>
);

const StyleConcierge = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ConciergeMessage[]>(loadConversation);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisors, setAdvisors] = useState<Record<string, AdvisorCard>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    supabase.rpc("get_public_advisor_profiles").then(({ data }) => {
      const map: Record<string, AdvisorCard> = {};
      for (const row of (data ?? []) as Array<Omit<AdvisorCard, "isSample"> & { is_demo?: boolean | null }>) {
        const a = withSampleContent(row);
        map[a.id] = a;
      }
      setAdvisors(map);
    });
  }, []);

  useEffect(() => {
    saveConversation(messages);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;
      setError(null);
      const next: ConciergeMessage[] = [...messages, { role: "user", content }];
      setMessages(next);
      setInput("");
      setIsLoading(true);
      try {
        await streamConcierge(next, (reply) => setMessages([...next, { role: "assistant", content: reply }]));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        setMessages(next);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages],
  );

  // Conversation started from the homepage "What are you dressing for?" buttons.
  useEffect(() => {
    const start = searchParams.get("start");
    if (start && !startedRef.current) {
      startedRef.current = true;
      setSearchParams({}, { replace: true });
      void send(start === "Something else" ? "I'd like some style help." : `I'm dressing for: ${start}.`);
    }
  }, [searchParams, setSearchParams, send]);

  const reset = () => {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const hasConversation = messages.length > 0;

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
        href?.startsWith("advisor:") ? (
          <Link to={`/advisors/${href.slice(8)}`} className="font-semibold text-gold underline underline-offset-4">
            {children}
          </Link>
        ) : (
          <span>{children}</span>
        ),
      p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
      ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
      ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
    }),
    [],
  );

  return (
    <Layout>
      <Seo
        title="Style Concierge | Cook A Look"
        description="Ask our AI Style Concierge what to wear for work, a wedding, a date, or travel. Get outfit ideas, brands, and style advisors who fit you."
        path="/style-concierge"
      />
      <section className="bg-background">
        <div className="container mx-auto max-w-3xl px-5 sm:px-6 py-10 sm:py-14 flex flex-col min-h-[calc(100svh-5rem)]">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl">Style Concierge</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Tell me what you're dressing for and a little about yourself. I'll suggest outfits, pieces, and brands,
                and point you to advisors who fit.
              </p>
            </div>
            {hasConversation && (
              <Button variant="ghost" size="sm" onClick={reset} className="shrink-0">
                <RotateCcw aria-hidden="true" /> New chat
              </Button>
            )}
          </header>

          <div className="mt-8 flex-1" aria-live="polite">
            {!hasConversation ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="min-h-11 border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <ol className="space-y-6">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <li key={i} className="flex justify-end">
                      <div className="max-w-[85%] bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </li>
                  ) : (
                    <li key={i} className="max-w-[92%]">
                      <div className="text-[15px] leading-relaxed text-foreground">
                        <ReactMarkdown components={markdownComponents} urlTransform={(url) => url}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      {extractAdvisorIds(m.content).filter((id) => advisors[id]).length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {extractAdvisorIds(m.content)
                            .filter((id) => advisors[id])
                            .map((id) => (
                              <AdvisorSuggestion key={id} advisor={advisors[id]} />
                            ))}
                        </div>
                      )}
                    </li>
                  ),
                )}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…
                  </li>
                )}
              </ol>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="sticky bottom-0 mt-8 bg-background pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2 border border-border bg-card p-2 focus-within:border-foreground">
              <label htmlFor="concierge-input" className="sr-only">
                Message the Style Concierge
              </label>
              <Textarea
                id="concierge-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={hasConversation ? "Reply…" : "What are you dressing for?"}
                className="min-h-11 max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} aria-label="Send">
                {isLoading ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              AI assistant, not a human stylist. It can make mistakes. For personal advice,{" "}
              <Link to="/advisors" className="underline underline-offset-4">
                book an advisor
              </Link>
              .
            </p>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default StyleConcierge;
