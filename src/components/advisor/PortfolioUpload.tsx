import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, ImagePlus, Loader2 } from "lucide-react";
import { getImageDimensions, MIN_PORTFOLIO_PHOTO_PX } from "@/lib/imageResize";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ImageCropModal from "@/components/profile/ImageCropModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import SortablePortfolioItem from "./SortablePortfolioItem";

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
  maxImages = 8,
}: PortfolioUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Photos uploaded during the current multi-photo batch.
  const addedRef = useRef<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Several photos picked at once are cropped one after another.
  const [queue, setQueue] = useState<File[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);

  // DnD sensors
  // Mouse: drag after moving 6px. Touch: press and hold 200ms, so a normal
  // swipe still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = currentImages.findIndex((img) => img === active.id);
        const newIndex = currentImages.findIndex((img) => img === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newImages = arrayMove(currentImages, oldIndex, newIndex);
          onImagesChange(newImages);
          toast({
            title: "Order updated",
            description: "Portfolio order has been updated.",
          });
        }
      }
    },
    [currentImages, onImagesChange, toast]
  );

  // Check one file; returns an error message or null.
  const checkFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) return `${file.name} is not an image file.`;
    if (file.size > 25 * 1024 * 1024) return `${file.name} is larger than 25MB.`;
    const dims = await getImageDimensions(file);
    if (!dims) return `${file.name} isn't a valid image.`;
    if (Math.min(dims.width, dims.height) < MIN_PORTFOLIO_PHOTO_PX) {
      return `${file.name} is too small. Use a photo at least ${MIN_PORTFOLIO_PHOTO_PX} pixels on the shortest side.`;
    }
    return null;
  };

  const openCropFor = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Move to the next photo waiting to be cropped, if any.
  const nextInQueue = (rest: File[]) => {
    setQueue(rest);
    if (rest.length > 0) openCropFor(rest[0]);
    else setQueueTotal(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (picked.length === 0) return;

    const remainingSlots = maxImages - currentImages.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Album full",
        description: `You can only have ${maxImages} portfolio images.`,
        variant: "destructive",
      });
      return;
    }

    const ok: File[] = [];
    const problems: string[] = [];
    for (const file of picked) {
      const err = await checkFile(file);
      if (err) problems.push(err);
      else ok.push(file);
    }
    const accepted = ok.slice(0, remainingSlots);
    if (ok.length > remainingSlots) {
      problems.push(`Only ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"} fit, so the rest were skipped.`);
    }
    if (problems.length) {
      toast({ title: "Some photos weren't added", description: problems.slice(0, 3).join(" "), variant: "destructive" });
    }
    if (accepted.length === 0) return;

    setEditingIndex(null);
    setQueueTotal(accepted.length);
    setQueue(accepted);
    openCropFor(accepted[0]);
  };

  const handleEditImage = async (index: number) => {
    const imageUrl = currentImages[index];
    setEditingIndex(index);

    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/portfolios/");
      if (pathParts.length <= 1) {
        throw new Error("Unable to parse portfolio file path");
      }

      const filePath = decodeURIComponent(pathParts[1]);
      const { data, error } = await supabase.storage
        .from("portfolios")
        .download(filePath);

      if (error) throw error;

      const objectUrl = URL.createObjectURL(data);
      setPendingImageSrc(objectUrl);
      setCropModalOpen(true);
    } catch (error) {
      console.error("Error loading image for cropping:", error);
      toast({
        title: "Couldn't open cropper",
        description:
          "We couldn't load this image for editing. Please try again.",
        variant: "destructive",
      });
      setEditingIndex(null);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsProcessing(true);

    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolios")
        .upload(filePath, croppedBlob, {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("portfolios").getPublicUrl(filePath);

      if (editingIndex !== null) {
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

        const newImages = [...currentImages];
        newImages[editingIndex] = publicUrl;
        onImagesChange(newImages);
        toast({
          title: "Photo updated",
          description: "Portfolio image updated successfully.",
        });
      } else {
        addedRef.current = [...addedRef.current, publicUrl];
        onImagesChange([...currentImages, ...addedRef.current.filter((u) => !currentImages.includes(u))]);
        if (queue.length <= 1) {
          toast({
            title: queueTotal > 1 ? "Photos uploaded" : "Upload complete",
            description: queueTotal > 1 ? `${addedRef.current.length} photos added to your portfolio.` : "Portfolio image uploaded successfully.",
          });
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (pendingImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingImageSrc);
      }
      setCropModalOpen(false);
      setPendingImageSrc(null);
      setIsProcessing(false);
      setUploading(false);
      setUploadingIndex(null);
      const wasEditing = editingIndex !== null;
      setEditingIndex(null);
      if (!wasEditing) {
        const rest = queue.slice(1);
        if (rest.length === 0) addedRef.current = [];
        nextInQueue(rest);
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = currentImages[index];

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

  // Closing the cropper skips this photo and moves on to the next one picked.
  const handleCloseModal = () => {
    if (pendingImageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImageSrc);
    }
    setCropModalOpen(false);
    setPendingImageSrc(null);
    const wasEditing = editingIndex !== null;
    setEditingIndex(null);
    if (!wasEditing) {
      const rest = queue.slice(1);
      if (rest.length === 0) addedRef.current = [];
      nextInQueue(rest);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Portfolio Photos</Label>
          <p className="text-sm text-muted-foreground">
            Upload up to {maxImages} photos showcasing your styling work. You can pick several at once.
            Drag a photo to reorder (on a phone, press and hold first).
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentImages.length}/{maxImages}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={currentImages}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentImages.map((image, index) => (
              <SortablePortfolioItem
                key={image}
                id={image}
                image={image}
                index={index}
                onEdit={handleEditImage}
                onRemove={handleRemoveImage}
              />
            ))}

            {/* Upload placeholder */}
            {currentImages.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "aspect-[5/7] rounded-lg border-2 border-dashed border-border",
                  "flex flex-col items-center justify-center gap-2",
                  "hover:border-gold hover:bg-muted/50 transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  uploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploading && uploadingIndex === currentImages.length ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-xs">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

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
            JPG, PNG or WebP up to 25MB each. We keep them sharp and size them for fast loading.
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {pendingImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          onClose={handleCloseModal}
          imageSrc={pendingImageSrc}
          onCropComplete={handleCropComplete}
          isProcessing={isProcessing}
          aspect={5 / 7}
          cropShape="rect"
          title={
            editingIndex !== null
              ? "Crop Portfolio Photo"
              : queueTotal > 1
                ? `Crop photo ${queueTotal - queue.length + 1} of ${queueTotal}`
                : "Crop New Photo"
          }
        />
      )}
    </div>
  );
};

export default PortfolioUpload;
