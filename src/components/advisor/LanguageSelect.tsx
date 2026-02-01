import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Mandarin",
  "Cantonese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
  "Dutch",
  "Polish",
  "Vietnamese",
  "Tagalog",
  "Greek",
  "Hebrew",
  "Turkish",
] as const;

export type LanguageOption = typeof LANGUAGE_OPTIONS[number];

interface LanguageSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  error?: string;
  required?: boolean;
}

const LanguageSelect = ({
  selected,
  onChange,
  error,
  required = true,
}: LanguageSelectProps) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeLanguage = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== option));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">
          Languages You Speak
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          Select all languages you can conduct consultations in
        </p>
      </div>

      {/* Selected languages display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-sm bg-primary text-primary-foreground rounded-sm"
            >
              {lang}
              <button
                type="button"
                onClick={(e) => removeLanguage(lang, e)}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {LANGUAGE_OPTIONS.map((option) => {
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

export default LanguageSelect;
