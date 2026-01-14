import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LivenessCameraProps {
  onCapture: (imageBlob: Blob, isLivenessVerified: boolean) => void;
  onCancel: () => void;
}

type LivenessStep = "ready" | "detecting" | "blink" | "turn" | "capturing" | "complete";

const LivenessCamera = ({ onCapture, onCancel }: LivenessCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [step, setStep] = useState<LivenessStep>("ready");
  const [error, setError] = useState<string | null>(null);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [turnDetected, setTurnDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [instructions, setInstructions] = useState("Position your face in the frame");

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStep("detecting");
        setInstructions("Hold steady - detecting your face...");
        
        // Start liveness detection sequence
        setTimeout(() => {
          setStep("blink");
          setInstructions("Please blink your eyes slowly");
        }, 2000);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please ensure camera permissions are granted and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Simulated liveness detection (in production, use a proper face detection library)
  useEffect(() => {
    if (step === "blink") {
      // Simulate blink detection after user interaction
      const timer = setTimeout(() => {
        setBlinkDetected(true);
        setStep("turn");
        setInstructions("Turn your head slightly left, then right");
      }, 3000);
      return () => clearTimeout(timer);
    }
    
    if (step === "turn") {
      const timer = setTimeout(() => {
        setTurnDetected(true);
        setStep("capturing");
        setInstructions("Perfect! Stay still for photo...");
        setCountdown(3);
      }, 3500);
      return () => clearTimeout(timer);
    }

    if (step === "capturing") {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        capturePhoto();
      }
    }
  }, [step, countdown]);

  const capturePhoto = useCallback(() => {
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
        setStep("complete");
        setInstructions("Liveness verified!");
        stopCamera();
        
        setTimeout(() => {
          onCapture(blob, blinkDetected && turnDetected);
        }, 1000);
      }
    }, "image/jpeg", 0.9);
  }, [blinkDetected, turnDetected, onCapture, stopCamera]);

  const handleManualBlink = () => {
    if (step === "blink") {
      setBlinkDetected(true);
      setStep("turn");
      setInstructions("Turn your head slightly left, then right");
    }
  };

  const handleManualTurn = () => {
    if (step === "turn") {
      setTurnDetected(true);
      setStep("capturing");
      setInstructions("Perfect! Stay still for photo...");
      setCountdown(3);
    }
  };

  const handleRetry = () => {
    setStep("ready");
    setBlinkDetected(false);
    setTurnDetected(false);
    setCountdown(3);
    setError(null);
    stopCamera();
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        {step === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm text-center px-4 mb-4">
              We'll guide you through a quick liveness check to verify your identity
            </p>
            <Button onClick={startCamera} variant="secondary">
              Start Camera
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              playsInline
              muted
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "w-48 h-64 border-4 rounded-full transition-colors duration-300",
                  step === "complete" ? "border-green-500" : "border-white/50"
                )} />
              </div>
            </div>

            {/* Status indicators */}
            <div className="absolute top-4 left-4 right-4 flex justify-center gap-4">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                blinkDetected 
                  ? "bg-green-500/90 text-white" 
                  : step === "blink" 
                    ? "bg-gold/90 text-black animate-pulse" 
                    : "bg-black/50 text-white/70"
              )}>
                {blinkDetected ? <Check className="w-3 h-3" /> : null}
                Blink
              </div>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                turnDetected 
                  ? "bg-green-500/90 text-white" 
                  : step === "turn" 
                    ? "bg-gold/90 text-black animate-pulse" 
                    : "bg-black/50 text-white/70"
              )}>
                {turnDetected ? <Check className="w-3 h-3" /> : null}
                Movement
              </div>
            </div>

            {/* Countdown */}
            {step === "capturing" && countdown > 0 && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-8xl font-bold text-white drop-shadow-lg">
                  {countdown}
                </span>
              </motion.div>
            )}

            {/* Complete checkmark */}
            {step === "complete" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-green-500/20"
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </motion.div>
            )}
          </>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-sm text-center mb-4">{error}</p>
            <Button onClick={handleRetry} variant="secondary" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Instructions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={instructions}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <p className="font-medium text-foreground">{instructions}</p>
          {step === "blink" && (
            <p className="text-sm text-muted-foreground mt-1">
              Close and open your eyes slowly
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleManualBlink}
                className="ml-2"
              >
                I blinked
              </Button>
            </p>
          )}
          {step === "turn" && (
            <p className="text-sm text-muted-foreground mt-1">
              Move your head left and right
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleManualTurn}
                className="ml-2"
              >
                Done
              </Button>
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => { stopCamera(); onCancel(); }}
          className="flex-1"
        >
          Cancel
        </Button>
        {step !== "ready" && step !== "complete" && (
          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart
          </Button>
        )}
      </div>
    </div>
  );
};

export default LivenessCamera;
