import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImagePlus, Loader2, Crop } from "lucide-react";
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
  // Track which image index we're editing (null = adding new)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
    // Set editingIndex to null for new uploads
    setEditingIndex(null);
  };

  // Handle clicking on existing image to edit/crop it
  const handleEditImage = async (index: number) => {
    const imageUrl = currentImages[index];
    setEditingIndex(index);
    setPendingImageSrc(imageUrl);
    setCropModalOpen(true);
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

      if (editingIndex !== null) {
        // Replacing an existing image - delete old file first
        const oldImageUrl = currentImages[editingIndex];
        try {
          const url = new URL(oldImageUrl);
          const pathParts = url.pathname.split("/portfolios/");
          if (pathParts.length > 1) {
            const oldFilePath = decodeURIComponent(pathParts[1]);
            await supabase.storage.from("portfolios").remove([oldFilePath]);
          }
        } catch (error) {
          console.error("Error removing old file from storage:", error);
        }

        // Replace the image at the editing index
        const newImages = [...currentImages];
        newImages[editingIndex] = publicUrl;
        onImagesChange(newImages);
        toast({
          title: "Photo updated",
          description: "Portfolio image updated successfully.",
        });
      } else {
        // Adding a new image
        onImagesChange([...currentImages, publicUrl]);
        toast({
          title: "Upload complete",
          description: "Portfolio image uploaded successfully.",
        });
      }
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
      setEditingIndex(null);
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
            className="relative aspect-[5/7] rounded-lg overflow-hidden border border-border group"
          >
            <img
              src={image}
              alt={`Portfolio ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Overlay with edit/delete buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleEditImage(index)}
                className="p-2 bg-white/90 text-foreground rounded-full hover:bg-white transition-colors"
                title="Crop photo"
              >
                <Crop className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                title="Delete photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
            setEditingIndex(null);
          }}
          imageSrc={pendingImageSrc}
          onCropComplete={handleCropComplete}
          isProcessing={isProcessing}
          aspect={5 / 7}
          cropShape="rect"
          title={editingIndex !== null ? "Crop Portfolio Photo" : "Crop New Photo"}
        />
      )}
    </div>
  );
};

export default PortfolioUpload;