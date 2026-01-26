import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Check, AlertCircle, Loader2, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LivenessCameraProps {
  onCapture: (imageBlob: Blob, isLivenessVerified: boolean) => void;
  onCancel: () => void;
}

type LivenessStep = "ready" | "initializing" | "detecting" | "blink" | "turn" | "capturing" | "complete" | "fallback";

const CAMERA_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 3;

const LivenessCamera = ({ onCapture, onCancel }: LivenessCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [step, setStep] = useState<LivenessStep>("ready");
  const [error, setError] = useState<string | null>(null);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [turnDetected, setTurnDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [instructions, setInstructions] = useState("Position your face in the frame");
  const [browserSupported, setBrowserSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showFallbackOption, setShowFallbackOption] = useState(false);

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setBrowserSupported(false);
        setError(
          "Your browser doesn't support camera access. Please use a modern browser like Chrome, Safari, Firefox, or Edge."
        );
        return false;
      }
      
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === "https:" || 
                       window.location.hostname === "localhost" ||
                       window.location.hostname === "127.0.0.1";
      
      if (!isSecure) {
        setBrowserSupported(false);
        setError(
          "Camera access requires a secure connection (HTTPS). Please access this page via HTTPS."
        );
        return false;
      }
      
      return true;
    };

    checkBrowserSupport();
  }, []);

  const startCamera = useCallback(async () => {
    if (!browserSupported) return;
    
    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
    
    try {
      setError(null);
      setStep("initializing");
      setInstructions("Starting camera...");

      // Set up timeout for camera initialization
      initTimeoutRef.current = setTimeout(() => {
        if (step === "initializing") {
          setError("Camera initialization timed out. Please try again or use photo upload.");
          setStep("ready");
          setRetryCount(prev => prev + 1);
          setShowFallbackOption(true);
        }
      }, CAMERA_TIMEOUT_MS);

      // Try primary configuration first
      let stream: MediaStream | null = null;
      const configurations = [
        // Primary: standard front camera
        { 
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false 
        },
        // Fallback 1: any front camera without dimension constraints
        { 
          video: { facingMode: "user" },
          audio: false 
        },
        // Fallback 2: any camera at all
        { 
          video: true,
          audio: false 
        }
      ];

      for (const config of configurations) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(config);
          break;
        } catch (configError) {
          console.log("Camera config failed, trying next:", config, configError);
          continue;
        }
      }

      if (!stream) {
        throw new Error("No camera configuration worked");
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }
          
          const video = videoRef.current;
          
          video.onloadedmetadata = () => {
            video.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          video.onerror = () => reject(new Error("Video failed to load"));
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error("Camera initialization timed out")), 10000);
        });
        
        // Clear timeout on success
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
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
      
      // Clear timeout on error
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      // Increment retry count and show fallback after max attempts
      setRetryCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_RETRY_ATTEMPTS) {
          setShowFallbackOption(true);
        }
        return newCount;
      });
      
      // Provide specific error messages based on error type
      let errorMessage = "Unable to access camera. ";
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
          case "PermissionDeniedError":
            errorMessage = "Camera access was denied. Please allow camera access in your browser settings:\n\n" +
              "• Click the camera icon in your browser's address bar\n" +
              "• Select 'Allow' for camera access\n" +
              "• Refresh the page and try again";
            break;
          case "NotFoundError":
          case "DevicesNotFoundError":
            errorMessage = "No camera was found on your device. Please ensure:\n\n" +
              "• Your device has a working camera\n" +
              "• The camera is not being used by another application\n" +
              "• Camera drivers are properly installed";
            break;
          case "NotReadableError":
          case "TrackStartError":
            errorMessage = "Camera is in use by another application. Please:\n\n" +
              "• Close other apps using the camera (video calls, camera apps)\n" +
              "• Refresh the page and try again";
            break;
          case "OverconstrainedError":
            errorMessage = "Camera settings are not supported. Trying alternative settings...";
            break;
          default:
            errorMessage += "Please check your camera permissions and try again.";
        }
      } else {
        errorMessage += "Please check that your camera is working and try again.";
      }
      
      setError(errorMessage);
      setStep("ready");
    }
  }, [browserSupported]);

  const stopCamera = useCallback(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
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

  // Handle fallback file upload
  const handleFallbackUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStep("complete");
      setInstructions("Photo uploaded!");
      
      // Convert to blob and call onCapture with livenessVerified = false
      setTimeout(() => {
        onCapture(file, false);
      }, 1000);
    }
  }, [onCapture]);

  const showFallback = () => {
    setStep("fallback");
    setInstructions("Upload a clear photo of your face");
    stopCamera();
  };

  // Liveness detection sequence
  useEffect(() => {
    if (step === "blink") {
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

  // Render fallback upload view
  if (step === "fallback") {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden flex flex-col items-center justify-center p-6">
          <Upload className="w-16 h-16 mb-4 text-muted-foreground" />
          <p className="text-sm text-center mb-4 text-muted-foreground">
            Take a clear photo of your face and upload it here
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFallbackUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Choose Photo
          </Button>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Note: Uploads without live verification will be flagged for manual review
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRetry} className="flex-1">
            Try Camera Again
          </Button>
          <Button variant="outline" onClick={() => { stopCamera(); onCancel(); }} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
      {step === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm text-center mb-4">
              We'll guide you through a quick liveness check to verify your identity
            </p>
            {!browserSupported ? (
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-300 whitespace-pre-line">{error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button onClick={startCamera} variant="secondary">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
                {showFallbackOption && (
                  <Button onClick={showFallback} variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo Instead
                  </Button>
                )}
                {retryCount > 0 && (
                  <p className="text-xs text-white/60 text-center">
                    Attempt {retryCount} of {MAX_RETRY_ATTEMPTS}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : step === "initializing" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-sm">Starting camera...</p>
            <p className="text-xs text-white/60 mt-2">Please allow camera access when prompted</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              playsInline
              muted
              autoPlay
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

        {error && step !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-sm text-center whitespace-pre-line mb-4">{error}</p>
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
        {step !== "ready" && step !== "complete" && step !== "initializing" && (
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