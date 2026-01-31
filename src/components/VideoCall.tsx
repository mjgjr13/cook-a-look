import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Video, VideoOff, Mic, MicOff, Phone } from "lucide-react";
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

const VideoCall = ({ 
  bookingId, 
  onClose, 
  advisorId, 
  clientId, 
  advisorName,
  isClient = false 
}: VideoCallProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    const createRoom = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-video-room", {
          body: { bookingId },
        });

        if (error) throw error;

        setRoomUrl(data.roomUrl);
      } catch (error) {
        console.error("Failed to create video room:", error);
        toast({
          title: "Connection Error",
          description: "Unable to start video call. Please try again.",
          variant: "destructive",
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    createRoom();
  }, [bookingId, onClose, toast]);

  const handleEndCall = () => {
    toast({
      title: "Call ended",
      description: "Your consultation has ended.",
    });
    
    // If client, prompt for review
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

          <div className="relative w-full" style={{ height: "70vh" }}>
            {roomUrl ? (
              <iframe
                src={roomUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture"
                className="w-full h-full border-0"
                title="Video consultation"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-secondary">
                <p className="text-muted-foreground">Unable to load video call</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-background flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={handleEndCall}
            >
              <Phone className="w-6 h-6 rotate-[135deg]" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal - shown after call ends for clients */}
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
