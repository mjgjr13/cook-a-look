import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Calendar, Loader2, MapPin, RotateCcw, ThumbsDown, ThumbsUp, Video } from "lucide-react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { withSampleContent } from "@/lib/sampleAdvisors";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import {
  streamConcierge,
  extractAdvisorIds,
  extractCorporateAdvisorIds,
  parseConciergeReply,
  type ConciergeMessage,
} from "@/lib/conciergeStream";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";
import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "cal_concierge_conversation";
const SESSION_KEY = "cal_concierge_session";

// Random id per browser session, used only to group anonymised logs.
const getSessionId = (): string => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

// Light scrub before feedback text is stored (the server scrubs logs too).
const scrub = (text: string) =>
  text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]");

const FeedbackControls = ({ question, answer, sessionId }: { question: string; answer: string; sessionId: string }) => {
  const [state, setState] = useState<"idle" | "up" | "down" | "sent">("idle");
  const [comment, setComment] = useState("");

  const submit = async (rating: 1 | -1, note?: string) => {
    await supabase.from("concierge_feedback").insert({
      rating,
      comment: note ? scrub(note).slice(0, 1000) : null,
      question: scrub(question).slice(0, 2000),
      answer: scrub(answer).slice(0, 6000),
      session_id: sessionId,
    });
  };

  if (state === "sent" || state === "up") {
    return <p className="mt-2 text-xs text-muted-foreground">Thanks for the feedback.</p>;
  }
  return (
    <div className="mt-2">
      {state === "idle" ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="mr-1 text-xs">Helpful?</span>
          <button
            type="button"
            aria-label="Helpful"
            className="rounded p-1.5 hover:bg-muted hover:text-foreground"
            onClick={() => {
              setState("up");
              void submit(1);
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            className="rounded p-1.5 hover:bg-muted hover:text-foreground"
            onClick={() => setState("down")}
          >
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (containsProfanity(comment)) {
              setComment("");
              return;
            }
            setState("sent");
            void submit(-1, comment.trim() || undefined);
          }}
        >
          <input
            autoFocus
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was wrong or missing? (optional)"
            aria-label="What was wrong or missing?"
            className="h-9 flex-1 border border-border bg-background px-3 text-sm focus:border-foreground focus:outline-none"
          />
          <Button type="submit" size="sm" variant="outline">Send feedback</Button>
        </form>
      )}
    </div>
  );
};

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

const AdvisorSuggestion = ({ advisor, corporate = false }: { advisor: AdvisorCard; corporate?: boolean }) => (
  <div className="flex flex-col border border-border bg-background transition-colors hover:border-foreground">
  <Link to={`/advisors/${advisor.id}`} className="flex gap-3 p-3">
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
        {corporate ? (
          <span className="text-foreground">Corporate services offered</span>
        ) : advisor.price_per_session ? (
          <span className="text-foreground">${advisor.price_per_session}/hour</span>
        ) : null}
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
  {!advisor.isSample && (
    <Link
      to={`/advisors/${advisor.id}?book=${corporate ? "corporate" : "personal"}`}
      className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
    >
      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
      {corporate ? "Book corporate services" : "Check availability"}
    </Link>
  )}
  </div>
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
  const [sessionId] = useState(getSessionId);
  const [user, setUser] = useState<User | null>(null);
  const [memory, setMemory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Signed-in visitors: load what the concierge remembers about them.
  useEffect(() => {
    const load = (u: User | null) => {
      setUser(u);
      if (!u) {
        setMemory(null);
        return;
      }
      supabase
        .from("concierge_profiles")
        .select("summary")
        .eq("user_id", u.id)
        .maybeSingle()
        .then(({ data }) => setMemory(data?.summary || null));
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
      if (containsProfanity(content)) {
        setError(PROFANITY_MESSAGE);
        return;
      }
      setError(null);
      const next: ConciergeMessage[] = [...messages, { role: "user", content }];
      setMessages(next);
      setInput("");
      setSuggestions([]);
      setIsLoading(true);
      try {
        const raw = await streamConcierge(
          next,
          (reply) => setMessages([...next, { role: "assistant", content: parseConciergeReply(reply).display }]),
          undefined,
          { memoryEnabled: !!user, profile: memory, sessionId },
        );
        const parsed = parseConciergeReply(raw);
        setMessages([...next, { role: "assistant", content: parsed.display }]);
        setSuggestions(parsed.suggestions);
        if (user && parsed.profile && parsed.profile !== memory) {
          setMemory(parsed.profile);
          await supabase
            .from("concierge_profiles")
            .upsert({ user_id: user.id, summary: parsed.profile, updated_at: new Date().toISOString() });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        setMessages(next);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages, user, memory, sessionId],
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
    setSuggestions([]);
    setError(null);
    inputRef.current?.focus();
  };

  const hasConversation = messages.length > 0;

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
        href?.startsWith("advisor-corporate:") ? (
          <Link to={`/advisors/${href.slice(18)}?book=corporate`} className="font-semibold text-gold underline underline-offset-4">
            {children}
          </Link>
        ) : href?.startsWith("advisor:") ? (
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
        title="AI Concierge | Cook A Look"
        description="Ask our AI Concierge what to wear for work, a wedding, a date, or travel. Get outfit ideas, brands, and style advisors who fit you."
        path="/ai-concierge"
      />
      <section className="bg-background">
        <div className="container mx-auto max-w-3xl px-5 sm:px-6 py-10 sm:py-14 flex flex-col min-h-[calc(100svh-5rem)]">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl">AI Concierge</h1>
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
                              <AdvisorSuggestion
                                key={id}
                                advisor={advisors[id]}
                                corporate={extractCorporateAdvisorIds(m.content).has(id)}
                              />
                            ))}
                        </div>
                      )}
                      {!(isLoading && i === messages.length - 1) && m.content && (
                        <FeedbackControls
                          key={`fb-${i}-${m.content.length}`}
                          question={messages[i - 1]?.content ?? ""}
                          answer={m.content}
                          sessionId={sessionId}
                        />
                      )}
                      {i === messages.length - 1 && !isLoading && suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => send(sug)}
                              className="min-h-9 border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-foreground"
                            >
                              {sug}
                            </button>
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
                Message the AI Concierge
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
              AI assistant, not a human stylist. It can make mistakes. Questions are saved anonymously for up to 90 days
              to improve the Concierge (
              <Link to="/privacy" className="underline underline-offset-4">privacy</Link>).
              {user ? (
                <>
                  {" "}It remembers your style preferences between visits;{" "}
                  <Link to="/settings#concierge-memory" className="underline underline-offset-4">manage</Link>.
                </>
              ) : null}
            </p>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default StyleConcierge;
