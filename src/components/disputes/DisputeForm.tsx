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

const disputeReasons = [
  { value: "no_show", label: "Advisor did not show up" },
  { value: "unprofessional", label: "Unprofessional conduct" },
  { value: "poor_quality", label: "Poor quality service" },
  { value: "different_service", label: "Service different from description" },
  { value: "technical_issues", label: "Technical issues prevented session" },
  { value: "other", label: "Other issue" },
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

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Please select a reason",
        description: "Choose the main reason for your dispute.",
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
      <DialogContent className="sm:max-w-[500px]">
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
