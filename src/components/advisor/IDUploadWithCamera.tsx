import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Camera, Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateFile } from "@/lib/validations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IDUploadWithCameraProps {
  idPreview: string;
  onCapture: (file: File, preview: string) => void;
  onRemove: () => void;
}

const IDUploadWithCamera = ({ idPreview, onCapture, onRemove }: IDUploadWithCameraProps) => {
  const { toast } = useToast();
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      setStream(mediaStream);
      setShowCameraModal(true);
      
      // Wait for modal to render before setting video source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to take a photo of your ID.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "id-document.jpg", { type: "image/jpeg" });
        const reader = new FileReader();
        reader.onloadend = () => {
          onCapture(file, reader.result as string);
          stopCamera();
        };
        reader.readAsDataURL(blob);
      }
    }, "image/jpeg", 0.9);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({
        title: "Invalid File",
        description: error,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onCapture(file, reader.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Label>Government-Issued ID *</Label>
      <p className="text-sm text-muted-foreground">
        Take a photo or upload your ID (passport, driver's license, or national ID).
        We only verify your name and photo match — sensitive details remain private.
      </p>

      {idPreview ? (
        <div className="border-2 border-green-500 rounded-lg p-6 text-center bg-green-500/5">
          <div className="relative inline-block">
            <img
              src={idPreview}
              alt="ID preview"
              className="max-h-48 mx-auto rounded-lg"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-green-600 mt-3 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            ID uploaded successfully
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={startCamera}
          >
            <Camera className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm">Take Photo</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm">Upload File</span>
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground italic">
        Your ID is stored securely and encrypted. We never share this information with third parties.
      </p>

      {/* Camera Modal */}
      <Dialog open={showCameraModal} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Capture ID Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none" />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Position your ID within the frame and ensure all text is clearly visible
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={stopCamera}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IDUploadWithCamera;
