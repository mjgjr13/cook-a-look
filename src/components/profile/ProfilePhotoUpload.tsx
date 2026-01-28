import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Trash2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  userId: string;
  profileId: string;
  userName?: string;
  isAdvisor?: boolean;
  isListed?: boolean;
  onPhotoUpdated: (newUrl: string | null) => void;
  size?: "sm" | "md" | "lg";
  showGuidance?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const ProfilePhotoUpload = ({
  currentPhotoUrl,
  userId,
  profileId,
  userName,
  isAdvisor = false,
  isListed = false,
  onPhotoUpdated,
  size = "md",
  showGuidance = false,
}: ProfilePhotoUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const validateImage = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: "Only JPG and PNG images are allowed" };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: "Image must be smaller than 5MB" };
    }

    // Check minimum resolution
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const minDimension = 200;
        if (img.width < minDimension || img.height < minDimension) {
          resolve({ valid: false, error: `Image must be at least ${minDimension}x${minDimension} pixels` });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({ valid: false, error: "Invalid image file" });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    const validation = await validateImage(file);
    if (!validation.valid) {
      toast({
        title: "Invalid Image",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", profileId);

      if (updateError) {
        throw updateError;
      }

      // Delete old avatar if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split("/avatars/")[1];
        if (oldPath && oldPath.startsWith(userId)) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      onPhotoUpdated(newAvatarUrl);
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setPreviewUrl(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [userId, profileId, currentPhotoUrl, onPhotoUpdated, toast]);

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setIsUploading(true);

    try {
      // Update profile to remove avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profileId);

      if (updateError) {
        throw updateError;
      }

      // Delete from storage
      const oldPath = currentPhotoUrl.split("/avatars/")[1];
      if (oldPath && oldPath.startsWith(userId)) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      onPhotoUpdated(null);
      toast({
        title: "Photo Removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      console.error("Remove error:", error);
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setShowRemoveDialog(false);
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;
  const canRemove = !isAdvisor || !isListed; // Advisors with public listings cannot remove

  return (
    <div className="space-y-4">
      {showGuidance && isAdvisor && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-gold mt-0.5" />
            <div>
              <p className="font-medium text-sm">Profile Photo Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a high-quality photo that best represents you — this is your first impression for clients.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className={`${sizeClasses[size]} border-2 border-border`}>
            <AvatarImage src={displayUrl || undefined} alt={userName || "Profile"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
          </Button>

          {currentPhotoUrl && canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRemoveDialog(true)}
              disabled={isUploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}

          {currentPhotoUrl && !canRemove && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Cannot remove while listed
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        JPG or PNG, minimum 200×200 pixels, max 5MB
      </p>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdvisor
                ? "Removing your photo will hide you from public listings until you upload a new one."
                : "Are you sure you want to remove your profile photo?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePhoto}
              disabled={isUploading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove Photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePhotoUpload;
