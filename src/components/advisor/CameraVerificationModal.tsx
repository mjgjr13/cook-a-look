import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import LivenessCamera from "@/components/LivenessCamera";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CameraVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onVerificationComplete: () => void;
}

const CameraVerificationModal = ({
  isOpen,
  onClose,
  userId,
  onVerificationComplete,
}: CameraVerificationModalProps) => {
  const { toast } = useToast();

  const handleCapture = async (imageBlob: Blob, isLivenessVerified: boolean) => {
    try {
      // Upload to verifications bucket
      const fileName = `${userId}/selfie_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verifications")
        .upload(fileName, imageBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the URL
      const { data: urlData } = supabase.storage
        .from("verifications")
        .getPublicUrl(fileName);

      // Update advisor_applications with selfie URL and liveness status
      const { error: updateAppError } = await supabase
        .from("advisor_applications")
        .update({
          selfie_url: urlData.publicUrl,
          liveness_verified: isLivenessVerified,
        })
        .eq("user_id", userId);

      if (updateAppError) {
        console.warn("Could not update application:", updateAppError);
      }

      // Update profiles verification_status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          verification_status: isLivenessVerified ? "pending" : "pending",
        })
        .eq("user_id", userId);

      if (profileError) {
        console.warn("Could not update profile:", profileError);
      }

      // Update advisor_profiles
      const { error: advisorProfileError } = await supabase
        .from("advisor_profiles")
        .update({
          verification_completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (advisorProfileError) {
        console.warn("Could not update advisor profile:", advisorProfileError);
      }

      toast({
        title: isLivenessVerified ? "Verification Complete!" : "Photo Uploaded",
        description: isLivenessVerified
          ? "Your identity has been verified."
          : "Your photo has been submitted for manual review.",
      });

      onVerificationComplete();
      onClose();
    } catch (error) {
      console.error("Error during verification:", error);
      toast({
        title: "Verification Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Identity Verification
          </DialogTitle>
          <DialogDescription>
            Complete a quick liveness check to verify your identity. This helps
            maintain trust on our platform.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <LivenessCamera onCapture={handleCapture} onCancel={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraVerificationModal;
