import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


function extractErrorMessage(e: unknown): string {
  if (!e) return "Something went wrong. Please try again.";
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const candidate = obj.message ?? obj.error_description ?? obj.error ?? obj.hint ?? obj.details;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }
  return "Something went wrong. Please try again.";
}

interface CancelBookingDialogProps {
  bookingId: string | null;
  appointmentAt: string | null;
  role: "client" | "advisor";
  currency?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCancelled?: () => void;
}

export function CancelBookingDialog({
  bookingId,
  appointmentAt,
  role,
  currency = "USD",
  open,
  onOpenChange,
  onCancelled,
}: CancelBookingDialogProps) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<{ percentage: number; amount_cents: number; total_cents: number; reason: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;
    setReason("");
    setLoadingPreview(true);
    supabase
      .rpc("calculate_refund", { p_booking_id: bookingId, p_canceller: role })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Couldn't load refund preview", description: error.message, variant: "destructive" });
        } else if (data && data[0]) {
          setPreview(data[0] as typeof preview extends infer T ? T : never);
        }
        setLoadingPreview(false);
      });
  }, [open, bookingId, role, toast]);

  const handleConfirm = async () => {
    if (!bookingId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("cancel_booking", {
        p_booking_id: bookingId,
        p_reason: reason || null,
      });
      if (error) throw error;
      // Best-effort: trigger refund processing edge function. Don't fail the cancel UX if it errors.
      const { error: fnErr } = await supabase.functions.invoke("process-booking-cancellation", {
        body: { bookingId },
      });
      if (fnErr) {
        toast({
          title: "Booking cancelled",
          description: "Refund is pending review.",
        });
      } else {
        toast({ title: "Booking cancelled", description: "Refund is processing." });
      }
      onOpenChange(false);
      onCancelled?.();
    } catch (e: unknown) {
      const msg = extractErrorMessage(e);
      toast({ title: "Couldn't cancel booking", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const dollars = preview ? (preview.amount_cents / 100).toFixed(2) : "0.00";
  const apptStr = appointmentAt
    ? new Date(appointmentAt).toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "this appointment";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif">Cancel booking?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <div>Appointment: <span className="font-medium text-foreground">{apptStr}</span></div>
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating refund…
                </div>
              ) : role === "advisor" ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    Cancelling will automatically refund the client <strong>100%</strong>
                    {preview ? <> (<strong>{dollars} {currency}</strong>)</> : null}.
                  </div>
                </div>
              ) : preview ? (
                <div className="rounded-md border border-border bg-secondary/30 p-3">
                  {preview.percentage > 0 ? (
                    <>
                      Canceling now will refund <strong>{dollars} {currency}</strong> (<strong>{preview.percentage}%</strong> of your booking fee).
                    </>
                  ) : (
                    <>No refund is available per the cancellation policy.</>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">{preview.reason}</div>
                </div>
              ) : null}
              <Textarea
                placeholder={role === "advisor" ? "Optional note to the client" : "Optional reason (visible to your advisor)"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting || loadingPreview}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm cancellation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CancelBookingDialog;
