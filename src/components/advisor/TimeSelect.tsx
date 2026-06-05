import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimeSelectProps {
  value: string; // "HH:MM:SS"
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

// 15-min increments across 24h
const OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      const label = new Date(`2000-01-01T${value}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      out.push({ value, label });
    }
  }
  return out;
})();

const TimeSelect = ({ value, onChange, className, ariaLabel }: TimeSelectProps) => {
  // Normalize "HH:MM" to "HH:MM:SS"
  const normalized = value?.length === 5 ? `${value}:00` : value;
  return (
    <Select value={normalized} onValueChange={onChange}>
      <SelectTrigger className={cn("w-[120px]", className)} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[280px]">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TimeSelect;
