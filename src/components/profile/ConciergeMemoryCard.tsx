import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Shows what the AI Concierge remembers about the signed-in user, with a way
// to clear it. The row is readable and deletable only by its owner (RLS), and
// clearing touches nothing else (bookings, reviews, profile and payments stay).
const ConciergeMemoryCard = ({ userId }: { userId: string | null }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      toast({ title: "Couldn't clear AI preferences", description: error.message, variant: "destructive" });
      return;
    }
    setConfirmOpen(false);
    setSummary(null);
    toast({ title: "AI preferences cleared", description: "The style assistant no longer remembers anything about you." });
  };

  return (
    <div id="concierge-memory" className="mb-8 border border-border bg-background p-5 sm:p-6">
      <h2 className="font-serif text-xl font-normal flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" aria-hidden="true" />
        AI preferences
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When you're signed in, the AI Concierge keeps a short note of your style preferences (like budget, fit and what
        you dress for) so it doesn't have to ask again. Only you can see it.
      </p>
      <div className="mt-4 border border-border bg-card p-4 text-sm" aria-live="polite">
        {!loaded ? (
          <span className="text-muted-foreground">Loading…</span>
        ) : summary ? (
          <p className="whitespace-pre-line">{summary}</p>
        ) : (
          <span className="text-muted-foreground">Nothing saved yet.</span>
        )}
      </div>
      {summary && (
        <AlertDialog open={confirmOpen} onOpenChange={(open) => !clearing && setConfirmOpen(open)}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-4">
              Clear AI preferences
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">Clear AI preferences?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes everything the style assistant has saved about you. Your account and bookings are not
                affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>Keep them</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  clear();
                }}
                disabled={clearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear AI preferences"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ConciergeMemoryCard;
