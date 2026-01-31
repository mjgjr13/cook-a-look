import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Briefcase, Calendar, Sparkles } from "lucide-react";

interface PresetOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  days: number[]; // 0=Sunday, 6=Saturday
  startTime: string;
  endTime: string;
}

const PRESETS: PresetOption[] = [
  {
    id: "standard-weekdays",
    label: "Standard Business Hours",
    description: "9 AM – 5 PM, Monday through Friday",
    icon: <Briefcase className="w-5 h-5" />,
    days: [1, 2, 3, 4, 5],
    startTime: "09:00:00",
    endTime: "17:00:00",
  },
  {
    id: "extended-weekdays",
    label: "Extended Weekdays",
    description: "9 AM – 9 PM, Monday through Friday",
    icon: <Clock className="w-5 h-5" />,
    days: [1, 2, 3, 4, 5],
    startTime: "09:00:00",
    endTime: "21:00:00",
  },
  {
    id: "every-day",
    label: "Every Day",
    description: "9 AM – 5 PM, all 7 days",
    icon: <Calendar className="w-5 h-5" />,
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: "09:00:00",
    endTime: "17:00:00",
  },
];

interface QuickSetupPresetsProps {
  onSelectPreset: (preset: PresetOption) => void;
  onCustom: () => void;
}

const QuickSetupPresets = ({ onSelectPreset, onCustom }: QuickSetupPresetsProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-serif font-medium mb-2">Quick Setup</h3>
        <p className="text-sm text-muted-foreground">
          Choose a preset to get started in seconds, or create a custom schedule
        </p>
      </div>

      <div className="grid gap-3">
        {PRESETS.map((preset) => (
          <Card
            key={preset.id}
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5"
            onClick={() => onSelectPreset(preset)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {preset.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{preset.label}</h4>
                  <p className="text-sm text-muted-foreground">{preset.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 border-dashed"
          onClick={onCustom}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-secondary rounded-lg text-muted-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Custom Schedule</h4>
                <p className="text-sm text-muted-foreground">Set your own hours for each day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { QuickSetupPresets, PRESETS };
export type { PresetOption };
