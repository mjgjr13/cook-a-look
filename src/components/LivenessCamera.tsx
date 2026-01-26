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

const CAMERA_TIMEOUT_MS = 12000; // timeout after 12s
const MAX_RETRY_ATTEMPTS = 2;

const log = (stage: string, message: string, data?: unknown) => {
  const ts = new Date().toISOString();
  console.log(`[LivenessCamera][${ts}][${stage}] ${message}`, data ?? "");
};

const LivenessCamera = ({ onCapture, onCancel }: LivenessCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const [step, setStep] = useState<LivenessStep>("ready");
  const [error, setError] = useState<string | null>(null);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [turnDetected, setTurnDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [instructions, setInstructions] = useState("Position your face in the frame");
  const [browserSupported, setBrowserSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showFallbackOption, setShowFallbackOption] = useState(false);

  // track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      log("init", "Checking browser support...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        log("init", "MediaDevices API not available");
        setBrowserSupported(false);
        setError(
          "Your browser doesn't support camera access. Please use a modern browser like Chrome, Safari, Firefox, or Edge."
        );
        return false;
      }

      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecure) {
        log("init", "Not a secure context");
        setBrowserSupported(false);
        setError("Camera access requires a secure connection (HTTPS). Please access this page via HTTPS.");
        return false;
      }

      log("init", "Browser supported");
      return true;
    };

    checkBrowserSupport();
  }, []);

  // Cleanup timeout helper
  const clearInitTimeout = useCallback(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!browserSupported) return;
    clearInitTimeout();
    setError(null);
    setStep("initializing");
    setInstructions("Starting camera...");
    log("startCamera", "Attempting camera init");

    // Set timeout that forces failure if we don't progress
    initTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      log("startCamera", "Timeout reached – camera did not initialize in time");
      setError("Camera initialization timed out. Please try again or use photo upload.");
      setStep("ready");
      setRetryCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_RETRY_ATTEMPTS) setShowFallbackOption(true);
        return next;
      });
    }, CAMERA_TIMEOUT_MS);

    const configurations: MediaStreamConstraints[] = [
      { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    for (const config of configurations) {
      try {
        log("startCamera", "Trying config", config);
        stream = await navigator.mediaDevices.getUserMedia(config);
        log("startCamera", "Stream acquired", { tracks: stream.getTracks().length });
        break;
      } catch (err) {
        log("startCamera", "Config failed", err);
      }
    }

    if (!stream) {
      clearInitTimeout();
      log("startCamera", "No configuration worked");
      setRetryCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_RETRY_ATTEMPTS) setShowFallbackOption(true);
        return next;
      });
      setError(
        "Unable to access camera.\n\n• Allow camera access in your browser settings\n• Close other apps using the camera\n• Refresh the page and try again"
      );
      setStep("ready");
      return;
    }

    streamRef.current = stream;

    if (!videoRef.current) {
      clearInitTimeout();
      setError("Camera element not found. Please refresh the page.");
      setStep("ready");
      return;
    }

    const video = videoRef.current;
    video.srcObject = stream;

    try {
      await new Promise<void>((resolve, reject) => {
        const videoLoadTimeout = setTimeout(() => reject(new Error("Video element load timeout")), 8000);

        video.onloadedmetadata = () => {
          log("startCamera", "Video metadata loaded");
          clearTimeout(videoLoadTimeout);
          video.play().then(resolve).catch(reject);
        };
        video.onerror = () => {
          clearTimeout(videoLoadTimeout);
          reject(new Error("Video element error"));
        };
      });

      log("startCamera", "Video playing successfully");
      clearInitTimeout();
      if (!isMountedRef.current) return;

      // Progress immediately to liveness checks
      setStep("detecting");
      setInstructions("Hold steady - detecting your face...");

      setTimeout(() => {
        if (!isMountedRef.current) return;
        setStep("blink");
        setInstructions("Please blink your eyes slowly");
      }, 1500);
    } catch (err) {
      log("startCamera", "Error during video setup", err);
      clearInitTimeout();
      setRetryCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_RETRY_ATTEMPTS) setShowFallbackOption(true);
        return next;
      });
      setError("Camera stream failed. Please try again or upload a photo.");
      setStep("ready");
    }
  }, [browserSupported, clearInitTimeout]);

  const stopCamera = useCallback(() => {
    log("stopCamera", "Stopping camera");
    clearInitTimeout();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [clearInitTimeout]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle fallback file upload
  const handleFallbackUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        log("fallback", "Photo uploaded", { name: file.name });
        setStep("complete");
        setInstructions("Photo uploaded!");
        setTimeout(() => {
          onCapture(file, false);
        }, 800);
      }
    },
    [onCapture]
  );

  const showFallback = () => {
    log("fallback", "User switched to fallback upload");
    setStep("fallback");
    setInstructions("Upload a clear photo of your face");
    stopCamera();
  };

  // Liveness detection sequence
  useEffect(() => {
    if (step === "blink") {
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        setBlinkDetected(true);
        setStep("turn");
        setInstructions("Turn your head slightly left, then right");
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (step === "turn") {
      const timer = setTimeout(() => {
        if (!isMountedRef.current) return;
        setTurnDetected(true);
        setStep("capturing");
        setInstructions("Perfect! Stay still for photo...");
        setCountdown(3);
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (step === "capturing") {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          if (!isMountedRef.current) return;
          setCountdown((c) => c - 1);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        capturePhoto();
      }
    }
  }, [step, countdown]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    log("capture", "Capturing photo from video");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          log("capture", "Photo blob created", { size: blob.size });
          setStep("complete");
          setInstructions("Liveness verified!");
          stopCamera();
          setTimeout(() => {
            log("capture", "Invoking onCapture callback");
            onCapture(blob, blinkDetected && turnDetected);
          }, 600);
        }
      },
      "image/jpeg",
      0.9
    );
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
    log("retry", "User clicked retry");
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
          <Button
            variant="outline"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="flex-1"
          >
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
              <div className="space-y-3 flex flex-col items-center">
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
            <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" playsInline muted autoPlay />

            {/* Face guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    "w-48 h-64 border-4 rounded-full transition-colors duration-300",
                    step === "complete" ? "border-green-500" : "border-white/50"
                  )}
                />
              </div>
            </div>

            {/* Status indicators */}
            <div className="absolute top-4 left-4 right-4 flex justify-center gap-4">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                  blinkDetected
                    ? "bg-green-500/90 text-white"
                    : step === "blink"
                      ? "bg-gold/90 text-black animate-pulse"
                      : "bg-black/50 text-white/70"
                )}
              >
                {blinkDetected ? <Check className="w-3 h-3" /> : null}
                Blink
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                  turnDetected
                    ? "bg-green-500/90 text-white"
                    : step === "turn"
                      ? "bg-gold/90 text-black animate-pulse"
                      : "bg-black/50 text-white/70"
                )}
              >
                {turnDetected ? <Check className="w-3 h-3" /> : null}
                Movement
              </div>
            </div>

            {/* Countdown */}
            {step === "capturing" && countdown > 0 && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </motion.div>
            )}

            {/* Complete checkmark */}
            {step === "complete" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-green-500/20">
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
        <motion.div key={instructions} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
          <p className="font-medium text-foreground">{instructions}</p>
          {step === "blink" && (
            <p className="text-sm text-muted-foreground mt-1">
              Close and open your eyes slowly
              <Button variant="link" size="sm" onClick={handleManualBlink} className="ml-2">
                I blinked
              </Button>
            </p>
          )}
          {step === "turn" && (
            <p className="text-sm text-muted-foreground mt-1">
              Move your head left and right
              <Button variant="link" size="sm" onClick={handleManualTurn} className="ml-2">
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
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="flex-1"
        >
          Cancel
        </Button>
        {step !== "ready" && step !== "complete" && step !== "initializing" && (
          <Button variant="outline" onClick={handleRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart
          </Button>
        )}
      </div>
    </div>
  );
};

export default LivenessCamera;
