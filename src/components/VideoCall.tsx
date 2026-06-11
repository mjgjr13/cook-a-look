import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, ExternalLink, Video as VideoIcon, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReviewModal from "@/components/reviews/ReviewModal";

interface VideoCallProps {
  bookingId: string;
  onClose: () => void;
  advisorId?: string;
  clientId?: string;
  advisorName?: string;
  isClient?: boolean;
}

type Provider = "daily" | "jitsi_fallback";

const VideoCall = ({
  bookingId,
  onClose,
  advisorId,
  clientId,
  advisorName,
  isClient = false,
}: VideoCallProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("daily");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const dailyContainerRef = useRef<HTMLDivElement>(null);
  const dailyFrameRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!consentGiven) return;
    let cancelled = false;
    setIsLoading(true);
    const createRoom = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-video-room", {
          body: { bookingId },
        });
        if (error) throw error;
        if (cancelled) return;
        setRoomUrl(data.roomUrl);
        setProvider((data.provider as Provider) ?? "daily");
      } catch (error) {
        console.error("Failed to create video room:", error);
        toast({
          title: "Connection Error",
          description: "Unable to start video call. Please try again.",
          variant: "destructive",
        });
        onClose();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    createRoom();
    return () => {
      cancelled = true;
    };
  }, [bookingId, onClose, toast, consentGiven]);

  // Mount Daily.co prebuilt UI (supports mobile camera flip + cloud recording)
  useEffect(() => {
    if (!roomUrl || provider !== "daily" || !dailyContainerRef.current) return;

    let destroyed = false;
    (async () => {
      try {
        const mod = await import("@daily-co/daily-js");
        if (destroyed || !dailyContainerRef.current) return;
        const DailyIframe = mod.default;
        const frame = DailyIframe.createFrame(dailyContainerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
          },
        });
        dailyFrameRef.current = frame;
        frame.on("left-meeting", () => handleEndCall());
        await frame.join({ url: roomUrl });
      } catch (e) {
        console.error("Failed to mount Daily frame:", e);
      }
    })();

    return () => {
      destroyed = true;
      try {
        dailyFrameRef.current?.destroy();
      } catch (_e) {
        // ignore
      }
      dailyFrameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, provider]);

  const handleEndCall = () => {
    try {
      dailyFrameRef.current?.destroy();
    } catch (_e) {
      // ignore
    }
    dailyFrameRef.current = null;
    toast({ title: "Call ended", description: "Your consultation has ended." });
    if (isClient && advisorId && clientId) {
      setShowReviewModal(true);
    } else {
      onClose();
    }
  };

  const handleReviewClose = () => {
    setShowReviewModal(false);
    onClose();
  };

  if (!consentGiven) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Recording Consent Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-secondary/40 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <VideoIcon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <p className="text-sm">
                  <strong>This session will be recorded.</strong> Cook A Look records video, audio,
                  and shared screens during consultations.
                </p>
              </div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Recordings are stored securely and used only for safety, support, and dispute resolution.</li>
                <li>Recordings are retained for up to 90 days unless required for an open dispute.</li>
                <li>You may request deletion at any time, subject to active disputes.</li>
                <li>Do not share sensitive personal or financial information on the call.</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                I acknowledge and consent to the recording of this video consultation, and confirm
                that any other participants visible or audible on my side also consent.
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!consentChecked} onClick={() => setConsentGiven(true)}>
              Agree & Join Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh]">
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-muted-foreground">Connecting to your session...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={!showReviewModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="font-serif flex items-center justify-between gap-3">
              <span>Style Consultation</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-sans font-normal text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" aria-hidden />
                Recording in progress
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative w-full bg-black" style={{ height: "70vh" }}>
            {!roomUrl && (
              <div className="flex items-center justify-center h-full bg-secondary">
                <p className="text-muted-foreground">Unable to load video call</p>
              </div>
            )}

            {roomUrl && provider === "daily" && (
              <div ref={dailyContainerRef} className="w-full h-full" />
            )}

            {roomUrl && provider === "jitsi_fallback" && (
              <iframe
                src={roomUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
                className="w-full h-full border-0"
                title="Video consultation"
              />
            )}
          </div>

          <div className="p-4 border-t bg-background flex items-center justify-center gap-4">
            {roomUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(roomUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in new tab
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={handleEndCall}
              aria-label="End call"
            >
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showReviewModal && advisorId && clientId && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={handleReviewClose}
          bookingId={bookingId}
          advisorId={advisorId}
          clientId={clientId}
          advisorName={advisorName || "your advisor"}
        />
      )}
    </>
  );
};

export default VideoCall;
