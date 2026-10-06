import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Shows what the AI Concierge remembers about the signed-in user, with a way
// to clear it. The row is readable and deletable only by its owner (RLS).
const ConciergeMemoryCard = ({ userId }: { userId: string | null }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("concierge_profiles")
      .select("summary")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setSummary(data?.summary || null);
        setLoaded(true);
      });
  }, [userId]);

  const clear = async () => {
    if (!userId) return;
    setClearing(true);
    const { error } = await supabase.from("concierge_profiles").delete().eq("user_id", userId);
    setClearing(false);
    if (error) {
      toast({ title: "Couldn't clear memory", description: error.message, variant: "destructive" });
      return;
    }
    setSummary(null);
    toast({ title: "Concierge memory cleared" });
  };

  return (
    <div id="concierge-memory" className="mb-8 border border-border bg-background p-5 sm:p-6">
      <h2 className="font-serif text-xl font-medium flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" aria-hidden="true" />
        AI Concierge memory
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When you're signed in, the AI Concierge keeps a short note of your style preferences (like budget, fit and what
        you dress for) so it doesn't have to ask again. Only you can see it.
      </p>
      <div className="mt-4 border border-border bg-card p-4 text-sm">
        {!loaded ? (
          <span className="text-muted-foreground">Loading…</span>
        ) : summary ? (
          <p className="whitespace-pre-line">{summary}</p>
        ) : (
          <span className="text-muted-foreground">Nothing saved yet.</span>
        )}
      </div>
      {summary && (
        <Button variant="outline" size="sm" className="mt-4" onClick={clear} disabled={clearing}>
          {clearing ? "Clearing…" : "Clear memory"}
        </Button>
      )}
    </div>
  );
};

export default ConciergeMemoryCard;
