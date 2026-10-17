import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";
import { useToast } from "@/hooks/use-toast";

interface DisputeFormProps {
  bookingId: string;
  paymentId: string;
  advisorName: string;
  sessionDate: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Valid grounds only. Disagreeing with the advice or not liking the style
// suggestions isn't a reason for a refund (Terms §10).
const disputeReasons = [
  { value: "no_show", label: "Advisor did not show up" },
  { value: "late_or_short", label: "Advisor was very late or ended the session early" },
  { value: "unprofessional", label: "Unprofessional, rude or offensive behaviour" },
  { value: "unprepared", label: "Advisor was clearly unprepared" },
  { value: "different_service", label: "Service was different from what was described" },
  { value: "technical_issues", label: "Technical problems on the advisor's side stopped the session" },
  { value: "other", label: "Other serious issue" },
];

const DisputeForm = ({
  bookingId,
  paymentId,
  advisorName,
  sessionDate,
  isOpen,
  onClose,
  onSuccess,
}: DisputeFormProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Please select a reason",
        description: "Choose the main reason for your dispute.",
        variant: "destructive",
      });
      return;
    }

    if (!acknowledged) {
      toast({
        title: "Please confirm",
        description: "Tick the box to confirm this is about the advisor's conduct, not the advice itself.",
        variant: "destructive",
      });
      return;
    }

    if (description.length < 20) {
      toast({
        title: "Please provide more details",
        description: "Describe the issue in at least 20 characters.",
        variant: "destructive",
      });
      return;
    }
    if (containsProfanity(description)) {
      toast({ title: "Offensive language", description: PROFANITY_MESSAGE, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to submit a dispute");
      }

      // Create the dispute
      // Note: Payment escrow_status updates are handled server-side via database triggers
      // The payments table has an immutable RLS policy preventing client-side updates
      const { error: disputeError } = await supabase
        .from("disputes")
        .insert({
          booking_id: bookingId,
          payment_id: paymentId,
          raised_by: user.id,
          reason: disputeReasons.find(r => r.value === reason)?.label || reason,
          description,
          status: "open",
        });

      if (disputeError) throw disputeError;

      toast({
        title: "Dispute submitted",
        description: "Our team will review your dispute and respond within 48 hours.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Report an Issue</DialogTitle>
          <DialogDescription>
            Submit a dispute for your session with {advisorName} on {sessionDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 bg-accent/50 border border-border rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Payment will be held
              </p>
              <p className="text-muted-foreground mt-1">
                Submitting a dispute will hold the payment in escrow until our team reviews your case.
              </p>
            </div>
          </div>

          <div className="p-4 border border-border text-sm space-y-2">
            <p className="font-medium text-foreground">What counts as a problem</p>
            <p className="text-muted-foreground">
              Report a problem if the advisor didn't show up, was very late, was unprofessional, rude or
              offensive, was clearly unprepared, or the session wasn't what was described.
            </p>
            <p className="text-muted-foreground">
              Not agreeing with the advice, or simply not liking the style suggestions, isn't grounds for a refund.
              Styling is personal, and you're paying for the advisor's time and expertise.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for dispute *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {disputeReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Describe the issue *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about what happened..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters (minimum 20)
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I'm reporting how the session was run or how the advisor behaved, not that I disagree with their advice.
            </span>
          </label>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeForm;
