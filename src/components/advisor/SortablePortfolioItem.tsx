import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crop, X, GripVertical } from "lucide-react";

interface SortablePortfolioItemProps {
  id: string;
  image: string;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

const SortablePortfolioItem = ({
  id,
  image,
  index,
  onEdit,
  onRemove,
}: SortablePortfolioItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-[5/7] rounded-lg overflow-hidden border border-border group ${
        isDragging ? "opacity-50 ring-2 ring-gold" : ""
      }`}
    >
      <img
        src={image}
        alt={`Portfolio ${index + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Drag handle - always visible on touch, hover on desktop */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Overlay with edit/delete buttons */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(index)}
          className="p-2 bg-white/90 text-foreground rounded-full hover:bg-white transition-colors"
          title="Crop photo"
        >
          <Crop className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
          title="Delete photo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SortablePortfolioItem;
