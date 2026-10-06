import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { format } from "date-fns";

interface Feedback {
  id: string;
  created_at: string;
  rating: number;
  comment: string | null;
  question: string | null;
  answer: string | null;
}

interface LogRow {
  id: string;
  created_at: string;
  question: string;
  signed_in: boolean;
}

// Words ignored when finding common topics in visitor questions.
const STOP_WORDS = new Set(
  "a an and are as at be but by can could do does for from get go have help how i i'd i'm im in is it its just like me my of on or our should so some that the their them there they this to up us want was we what when where which who why will with would you your about any am been being did had has into more most much need not now off one only other out over really than then these those too very".split(" "),
);

const AdminConcierge = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"down" | "up" | "all">("down");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [fb, lg] = await Promise.all([
      supabase.from("concierge_feedback").select("*").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("concierge_logs")
        .select("id, created_at, question, signed_in")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    setFeedback((fb.data as Feedback[]) ?? []);
    setLogs((lg.data as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const up = feedback.filter((f) => f.rating === 1).length;
    const down = feedback.filter((f) => f.rating === -1).length;
    const week = logs.filter((l) => new Date(l.created_at).getTime() > Date.now() - 7 * 86400000).length;
    return { up, down, helpful: up + down > 0 ? Math.round((up / (up + down)) * 100) : null, week, month: logs.length };
  }, [feedback, logs]);

  // Most common topics: frequent words across the last 30 days of questions.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) {
      const words = new Set(
        l.question
          .toLowerCase()
          .replace(/[^a-z\s'-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
      );
      words.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [logs]);

  const shown = feedback.filter((f) => filter === "all" || (filter === "down" ? f.rating === -1 : f.rating === 1));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-medium">AI Concierge</h1>
            <p className="text-sm text-muted-foreground">
              What visitors ask and how helpful the answers are. Questions and feedback are anonymised and kept for 90 days.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                ["Questions (7 days)", stats.week],
                ["Questions (30 days)", stats.month],
                ["Helpful rating", stats.helpful == null ? "—" : `${stats.helpful}%`],
                ["Not helpful", stats.down],
              ].map(([label, value]) => (
                <Card key={label as string}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-medium">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Common topics (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topics.map(([word, n]) => (
                      <Badge key={word} variant="secondary" className="font-normal">
                        {word} · {n}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="text-lg">Feedback</CardTitle>
                <div className="flex gap-1">
                  {([
                    ["down", "Not helpful"],
                    ["up", "Helpful"],
                    ["all", "All"],
                  ] as const).map(([value, label]) => (
                    <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>
                      {label}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {shown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                ) : (
                  shown.map((f) => (
                    <div key={f.id} className="border border-border p-4 text-sm space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {f.rating === 1 ? (
                          <ThumbsUp className="w-3.5 h-3.5 text-foreground" aria-label="Helpful" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5 text-destructive" aria-label="Not helpful" />
                        )}
                        {format(new Date(f.created_at), "MMM d, yyyy h:mm a")}
                      </div>
                      {f.comment && <p className="font-medium">“{f.comment}”</p>}
                      {f.question && (
                        <p>
                          <span className="text-muted-foreground">Visitor: </span>
                          {f.question}
                        </p>
                      )}
                      {f.answer && (
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">Concierge answer</summary>
                          <p className="mt-2 whitespace-pre-line">{f.answer}</p>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent questions</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No questions yet.</p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {logs.slice(0, 100).map((l) => (
                      <li key={l.id} className="py-2 flex gap-3">
                        <span className="shrink-0 w-28 text-xs text-muted-foreground">
                          {format(new Date(l.created_at), "MMM d, h:mm a")}
                        </span>
                        <span className="break-words">{l.question}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminConcierge;
