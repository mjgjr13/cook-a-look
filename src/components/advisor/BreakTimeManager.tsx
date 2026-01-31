import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Coffee, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Generate time options in 30-minute increments
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
      const displayStr = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      options.push({ value: timeStr, label: displayStr });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

export interface BreakConfig {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string;
}

interface BreakTimeManagerProps {
  dayOfWeek: number;
  breaks: BreakConfig[];
  onAddBreak: (breakData: Omit<BreakConfig, "id">) => void;
  onRemoveBreak: (breakId: string) => void;
  onUpdateBreak: (breakId: string, updates: Partial<BreakConfig>) => void;
  availabilityStart?: string;
  availabilityEnd?: string;
}

const BreakTimeManager = ({
  dayOfWeek,
  breaks,
  onAddBreak,
  onRemoveBreak,
  onUpdateBreak,
  availabilityStart = "09:00:00",
  availabilityEnd = "17:00:00",
}: BreakTimeManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newBreak, setNewBreak] = useState({
    start_time: "12:00:00",
    end_time: "13:00:00",
    label: "Lunch Break",
  });

  const dayBreaks = breaks.filter((b) => b.day_of_week === dayOfWeek);

  const handleAddBreak = () => {
    if (newBreak.start_time >= newBreak.end_time) {
      return; // Invalid time range
    }

    onAddBreak({
      day_of_week: dayOfWeek,
      start_time: newBreak.start_time,
      end_time: newBreak.end_time,
      label: newBreak.label || "Break",
    });

    setIsAdding(false);
    setNewBreak({
      start_time: "12:00:00",
      end_time: "13:00:00",
      label: "Lunch Break",
    });
  };

  const isValidBreak = newBreak.start_time < newBreak.end_time;

  return (
    <div className="space-y-2">
      {/* Existing breaks */}
      <AnimatePresence>
        {dayBreaks.map((breakItem) => (
          <motion.div
            key={breakItem.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md border border-destructive/20"
          >
            <Coffee className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium flex-1 truncate">
              {breakItem.label}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {TIME_OPTIONS.find((t) => t.value === breakItem.start_time)?.label} -{" "}
              {TIME_OPTIONS.find((t) => t.value === breakItem.end_time)?.label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onRemoveBreak(breakItem.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add break form */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border border-dashed border-muted-foreground/30 rounded-md space-y-3"
          >
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-14">Label</Label>
              <Input
                value={newBreak.label}
                onChange={(e) => setNewBreak({ ...newBreak, label: e.target.value })}
                placeholder="Break name"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs text-muted-foreground w-14">From</Label>
              <Select
                value={newBreak.start_time}
                onValueChange={(value) => setNewBreak({ ...newBreak, start_time: value })}
              >
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">to</Label>
              <Select
                value={newBreak.end_time}
                onValueChange={(value) => setNewBreak({ ...newBreak, end_time: value })}
              >
                <SelectTrigger className={`w-[100px] h-8 ${!isValidBreak ? "border-destructive" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isValidBreak && (
              <p className="text-xs text-destructive">End time must be after start time</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddBreak}
                disabled={!isValidBreak}
              >
                Add Break
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add break / block time
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BreakTimeManager;
