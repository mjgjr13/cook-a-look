import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ExperienceSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const EXPERIENCE_OPTIONS = [
  { value: "1-5", label: "1-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "10+", label: "10+ years" },
];

const ExperienceSelect = ({ value, onChange, error }: ExperienceSelectProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="experience">Years of Experience *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          id="experience" 
          className={error ? "border-destructive" : ""}
        >
          <SelectValue placeholder="Select experience" />
        </SelectTrigger>
        <SelectContent>
          {EXPERIENCE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default ExperienceSelect;
