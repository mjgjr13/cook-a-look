import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Standardized category options
export const CLIENT_FOCUS_OPTIONS = [
  "Men",
  "Women",
  "Plus Size",
  "Tall",
  "Luxury",
  "Budget",
  "Petite",
  "Curvy",
] as const;

export const USE_CASE_OPTIONS = [
  "School",
  "Office / Work",
  "Wedding",
  "Date Night",
  "Black Tie / Formal",
  "Everyday Casual",
  "Closet Refresh",
  "Sustainable",
] as const;

export const STYLE_CATEGORY_OPTIONS = [
  "Casual",
  "Athletic",
  "Wedding",
  "Business",
  "Formal",
  "Streetwear",
  "Vintage",
] as const;

export type ClientFocusOption = typeof CLIENT_FOCUS_OPTIONS[number];
export type UseCaseOption = typeof USE_CASE_OPTIONS[number];
export type StyleCategoryOption = typeof STYLE_CATEGORY_OPTIONS[number];

interface CategorySelectProps {
  label: string;
  description?: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  error?: string;
  required?: boolean;
}

const CategorySelect = ({
  label,
  description,
  options,
  selected,
  onChange,
  error,
  required = false,
}: CategorySelectProps) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={cn(
                "px-3 py-2 text-sm font-sans border transition-all duration-200 flex items-center gap-2",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              {option}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default CategorySelect;
