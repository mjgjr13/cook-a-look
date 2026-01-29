import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ImageCropModal from "@/components/profile/ImageCropModal";

interface PortfolioUploadProps {
  userId: string;
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const PortfolioUpload = ({ 
  userId, 
  currentImages, 
  onImagesChange, 
  maxImages = 8 
}: PortfolioUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - currentImages.length;
    
    if (remainingSlots <= 0) {
      toast({
        title: "Album full",
        description: `You can only have ${maxImages} portfolio images.`,
        variant: "destructive",
      });
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not an image file.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB before crop)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds the 10MB limit.`,
        variant: "destructive",
      });
      return;
    }

    // Convert file to data URL for crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsProcessing(true);

    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(filePath, croppedBlob, {
          contentType: "image/png",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("portfolios")
        .getPublicUrl(filePath);

      onImagesChange([...currentImages, publicUrl]);
      toast({
        title: "Upload complete",
        description: "Portfolio image uploaded successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCropModalOpen(false);
      setPendingImageSrc(null);
      setIsProcessing(false);
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = currentImages[index];
    
    // Extract file path from URL
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/portfolios/");
      if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1]);
        await supabase.storage.from("portfolios").remove([filePath]);
      }
    } catch (error) {
      console.error("Error removing file from storage:", error);
    }

    const newImages = currentImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Portfolio Photos</Label>
          <p className="text-sm text-muted-foreground">
            Upload up to {maxImages} photos showcasing your styling work
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentImages.length}/{maxImages}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currentImages.map((image, index) => (
          <div 
            key={index} 
            className="relative aspect-square rounded-lg overflow-hidden border border-border group"
          >
            <img
              src={image}
              alt={`Portfolio ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Upload placeholder slots */}
        {Array.from({ length: Math.min(maxImages - currentImages.length, 1) }).map((_, index) => (
          <button
            key={`placeholder-${index}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-2",
              "hover:border-gold hover:bg-muted/50 transition-colors",
              "text-muted-foreground hover:text-foreground",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading && uploadingIndex === currentImages.length + index ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-8 h-8" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
          </button>
        ))}
      </div>

      {currentImages.length < maxImages && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Photos
          </Button>
          <span className="text-xs text-muted-foreground">
            JPG, PNG up to 5MB each
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Crop Modal - Portfolio uses rectangular 5:7 aspect ratio */}
      {pendingImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setPendingImageSrc(null);
          }}
          imageSrc={pendingImageSrc}
          onCropComplete={handleCropComplete}
          isProcessing={isProcessing}
          aspect={5 / 7}
          cropShape="rect"
          title="Crop Portfolio Photo"
        />
      )}
    </div>
  );
};

export default PortfolioUpload;