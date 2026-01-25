import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - currentImages.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${remainingSlots} more image(s).`,
        variant: "destructive",
      });
    }

    setUploading(true);
    const newImages: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      setUploadingIndex(currentImages.length + i);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("portfolios")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("portfolios")
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...currentImages, ...newImages]);
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${newImages.length} image(s).`,
      });
    }

    setUploading(false);
    setUploadingIndex(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PortfolioUpload;