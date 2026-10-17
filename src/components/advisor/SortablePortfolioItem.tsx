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

// The whole tile is the drag handle (press and hold on phones, click and drag
// with a mouse). The crop/delete buttons stop the press from starting a drag.
const stop = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => e.stopPropagation();

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
    // Let the page scroll normally; a drag only starts after a short hold.
    touchAction: "manipulation" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Portfolio photo ${index + 1}. Drag to reorder.`}
      className={`relative aspect-[5/7] rounded-lg overflow-hidden border border-border group cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-60 ring-2 ring-gold shadow-lg" : ""
      }`}
    >
      <img
        src={image}
        alt={`Portfolio ${index + 1}`}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Position number + drag hint */}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-1 bg-black/60 text-white rounded text-xs pointer-events-none">
        <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        {index + 1}
      </div>

      {/* Crop / delete: always visible on touch screens, on hover with a mouse */}
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={stop}
          onTouchStart={stop}
          onMouseDown={stop}
          onClick={() => onEdit(index)}
          className="p-1.5 bg-white/90 text-foreground rounded-full hover:bg-white transition-colors"
          title="Crop photo"
          aria-label={`Crop photo ${index + 1}`}
        >
          <Crop className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={stop}
          onTouchStart={stop}
          onMouseDown={stop}
          onClick={() => onRemove(index)}
          className="p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
          title="Delete photo"
          aria-label={`Delete photo ${index + 1}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SortablePortfolioItem;
