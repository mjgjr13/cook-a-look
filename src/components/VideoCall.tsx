import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, ExternalLink } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("daily");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const dailyContainerRef = useRef<HTMLDivElement>(null);
  const dailyFrameRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
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
  }, [bookingId, onClose, toast]);

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
            <DialogTitle className="font-serif">Style Consultation</DialogTitle>
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
