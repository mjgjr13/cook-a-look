import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
  name: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advisorId?: string;
  advisorName?: string;
}

const SampleAdvisorWaitlistDialog = ({ isOpen, onClose, advisorId, advisorName }: Props) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, name: name || undefined, note: note || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setSubmitting(true);
    // booking_waitlist is created by migration 20261003000000 and isn't in the
    // generated types yet, hence the cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from("booking_waitlist").insert({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      note: parsed.data.note ?? null,
      advisor_id: advisorId ?? null,
      source: "sample_advisor",
    });
    setSubmitting(false);
    if (insertError) {
      console.error("Waitlist insert failed:", insertError);
      setError(
        "Sorry, we couldn't save your spot just now. Please try again, or email info@cookalook.com and we'll add you by hand."
      );
      return;
    }
    setDone(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // reset after the close animation
      setTimeout(() => {
        setDone(false);
        setError(null);
      }, 200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[460px] px-4 sm:px-6">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-gold mx-auto mb-4" aria-hidden="true" />
            <DialogTitle className="font-serif text-2xl mb-2">You're on the list!</DialogTitle>
            <DialogDescription className="mb-6">
              We'll email you as soon as advisors are taking bookings. No spam, just one heads-up.
            </DialogDescription>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Keep browsing
              </Button>
              <Button variant="hero" asChild>
                <Link to="/lookbook">Explore the Lookbook</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold font-sans">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Sample profile
              </p>
              <DialogTitle className="font-serif text-2xl leading-tight">
                We're onboarding our first advisors
              </DialogTitle>
              <DialogDescription>
                {advisorName ? `${advisorName} is a sample profile that shows what booking on Cook A Look looks like. ` : ""}
                Join the waitlist and we'll let you know the moment real advisors are taking bookings. You won't be charged anything.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  required
                  aria-invalid={!!error}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-name">
                  First name <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="waitlist-name"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-note">
                  What would you like help with? <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="waitlist-note"
                  rows={2}
                  placeholder="e.g. a wedding outfit, a work wardrobe refresh"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...
                  </>
                ) : (
                  "Join the waitlist"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Are you a stylist?{" "}
                <Link to="/become-advisor" className="text-gold hover:underline" onClick={() => handleOpenChange(false)}>
                  Apply to become an advisor
                </Link>
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SampleAdvisorWaitlistDialog;
