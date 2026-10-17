import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Flag, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// After a session, the client confirms it went well (payment released to the
// advisor straight away) or reports a problem. With no response, payment is
// released automatically 48 hours after the session ends.
export const PAYOUT_HOLD_HOURS = 48;

type ConfirmRpc = (
  fn: "client_confirm_session",
  args: { p_booking_id: string },
) => PromiseLike<{ error: { message: string } | null }>;

const dismissKey = (bookingId: string) => `cal-wrapup-dismissed-${bookingId}`;

export const isWrapUpDismissed = (bookingId: string): boolean => {
  try {
    return localStorage.getItem(dismissKey(bookingId)) === "1";
  } catch {
    return false;
  }
};

const rememberDismissed = (bookingId: string) => {
  try {
    localStorage.setItem(dismissKey(bookingId), "1");
  } catch {
    // storage unavailable: the prompt just shows again next visit
  }
};

export const autoReleaseAt = (sessionEnd: string) =>
  new Date(new Date(sessionEnd).getTime() + PAYOUT_HOLD_HOURS * 3600_000);

const formatRelease = (sessionEnd: string) =>
  autoReleaseAt(sessionEnd).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

interface WrapUpProps {
  bookingId: string;
  advisorName: string;
  sessionEnd: string;
  onReportProblem: () => void;
  onDone: () => void;
}

const useMarkComplete = (bookingId: string, advisorName: string, onDone: () => void) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const markComplete = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as unknown as ConfirmRpc)("client_confirm_session", { p_booking_id: bookingId });
    setBusy(false);
    if (error) {
      toast({
        title: "Couldn't mark the session complete",
        description: /dispute_open/.test(error.message) ? "You've already reported a problem for this session." : "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    rememberDismissed(bookingId);
    toast({ title: "Thanks!", description: `Your payment will be released to ${advisorName}.` });
    onDone();
  };
  return { busy, markComplete };
};

const WrapUpBody = ({ advisorName, sessionEnd }: { advisorName: string; sessionEnd: string }) => (
  <div className="space-y-3 text-sm text-muted-foreground">
    <p>
      If everything went well, mark it complete and {advisorName} gets paid now. If something went wrong,
      report a problem and we'll hold the payment while we review it.
    </p>
    <p>
      If you do nothing, the payment is released to {advisorName} automatically on{" "}
      <strong className="text-foreground">{formatRelease(sessionEnd)}</strong>.
    </p>
    <p className="text-xs">
      Reporting a problem is for things like a no-show, unprofessional or offensive behaviour, or an advisor who
      clearly wasn't prepared. Not agreeing with the style advice you received isn't grounds for a refund.
    </p>
  </div>
);

/** Inline card on the client dashboard. Dismissible; reappears on the Past Sessions row. */
export const SessionWrapUpBanner = ({ bookingId, advisorName, sessionEnd, onReportProblem, onDone }: WrapUpProps) => {
  const { busy, markComplete } = useMarkComplete(bookingId, advisorName, onDone);
  return (
    <div className="relative mb-8 border border-gold/40 bg-gold/5 p-5 sm:p-6">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-foreground"
        onClick={() => {
          rememberDismissed(bookingId);
          onDone();
        }}
      >
        <X className="w-4 h-4" />
      </button>
      <h2 className="font-serif text-xl mb-2 pr-6">How was your session with {advisorName}?</h2>
      <WrapUpBody advisorName={advisorName} sessionEnd={sessionEnd} />
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <Button variant="hero" onClick={markComplete} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Mark as complete
        </Button>
        <Button variant="outline" onClick={onReportProblem} disabled={busy}>
          <Flag className="w-4 h-4 mr-2" /> Report a problem
        </Button>
      </div>
    </div>
  );
};

/** Shown right after leaving the video call. */
export const SessionWrapUpDialog = ({
  open,
  bookingId,
  advisorName,
  sessionEnd,
  onReportProblem,
  onDone,
}: WrapUpProps & { open: boolean }) => {
  const { busy, markComplete } = useMarkComplete(bookingId, advisorName, onDone);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          rememberDismissed(bookingId);
          onDone();
        }
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">How was your session?</DialogTitle>
          <DialogDescription>Your session with {advisorName} has ended.</DialogDescription>
        </DialogHeader>
        <WrapUpBody advisorName={advisorName} sessionEnd={sessionEnd} />
        <div className="mt-2 flex flex-col gap-2">
          <Button variant="hero" onClick={markComplete} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Mark as complete
          </Button>
          <Button variant="outline" onClick={onReportProblem} disabled={busy}>
            <Flag className="w-4 h-4 mr-2" /> Report a problem
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              rememberDismissed(bookingId);
              onDone();
            }}
            disabled={busy}
          >
            Decide later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
