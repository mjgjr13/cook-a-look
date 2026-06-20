import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, Shield, AlertCircle } from "lucide-react";

interface RecordingConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const RecordingConsentModal = ({
  isOpen,
  onAccept,
  onDecline,
}: RecordingConsentModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Video className="w-5 h-5 text-gold" />
            Session Recording Notice
          </DialogTitle>
          <DialogDescription>
            Please review before joining your consultation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">This session will be recorded</p>
              <p className="text-sm text-muted-foreground mt-1">
                For quality assurance and dispute resolution, all virtual consultations 
                are automatically recorded and securely stored.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Who can access recordings?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Recordings are only accessible by Cook A Look administrators for 
                dispute resolution and quality review. They are never shared publicly.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By joining, you agree to the recording as outlined in our Terms of Use.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1"
            >
              I Understand, Join Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordingConsentModal;
