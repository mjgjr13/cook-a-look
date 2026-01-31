import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Save, Loader2, Eye, Trash2, Globe, Coffee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { AvailabilityWindow } from "@/hooks/useAdvisorAvailability";
import BreakTimeManager, { BreakConfig } from "./BreakTimeManager";
import { COMMON_TIMEZONES, getBrowserTimezone, getTimezoneLabel } from "@/hooks/useTimezone";

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

interface DayConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
}

interface AvailabilityWindowPickerProps {
  windows: AvailabilityWindow[];
  breaks?: BreakConfig[];
  timezone?: string;
  isSaving: boolean;
  onSave: (
    windows: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>,
    breaks: Array<{ day_of_week: number; start_time: string; end_time: string; label: string }>,
    timezone: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AvailabilityWindowPicker = ({ 
  windows, 
  breaks: initialBreaks = [], 
  timezone: initialTimezone,
  isSaving, 
  onSave 
}: AvailabilityWindowPickerProps) => {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showBreaks, setShowBreaks] = useState(false);
  const [timezone, setTimezone] = useState(initialTimezone || getBrowserTimezone());
  const [localBreaks, setLocalBreaks] = useState<BreakConfig[]>([]);
  
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>(() => {
    const initial: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      initial[i] = {
        enabled: false,
        startTime: "09:00:00",
        endTime: "17:00:00",
        isVirtual: true,
      };
    }
    return initial;
  });

  // Initialize from existing windows
  useEffect(() => {
    const configs: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      const existingWindow = windows.find((w) => w.day_of_week === i);
      if (existingWindow) {
        configs[i] = {
          enabled: true,
          startTime: existingWindow.start_time,
          endTime: existingWindow.end_time,
          isVirtual: existingWindow.is_virtual,
        };
      } else {
        configs[i] = {
          enabled: false,
          startTime: "09:00:00",
          endTime: "17:00:00",
          isVirtual: true,
        };
      }
    }
    setDayConfigs(configs);
  }, [windows]);

  // Initialize breaks
  useEffect(() => {
    setLocalBreaks(initialBreaks.map(b => ({
      ...b,
      id: b.id || `temp-${Date.now()}-${Math.random()}`,
    })));
  }, [initialBreaks]);

  // Initialize timezone
  useEffect(() => {
    if (initialTimezone) {
      setTimezone(initialTimezone);
    }
  }, [initialTimezone]);

  const updateDayConfig = (day: number, updates: Partial<DayConfig>) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
  };

  const handleAddBreak = (breakData: Omit<BreakConfig, "id">) => {
    setLocalBreaks((prev) => [
      ...prev,
      { ...breakData, id: `temp-${Date.now()}-${Math.random()}` },
    ]);
  };

  const handleRemoveBreak = (breakId: string) => {
    setLocalBreaks((prev) => prev.filter((b) => b.id !== breakId));
  };

  const handleUpdateBreak = (breakId: string, updates: Partial<BreakConfig>) => {
    setLocalBreaks((prev) =>
      prev.map((b) => (b.id === breakId ? { ...b, ...updates } : b))
    );
  };

  const handleSave = async () => {
    const windowsToSave = Object.entries(dayConfigs)
      .filter(([, config]) => config.enabled)
      .map(([day, config]) => ({
        day_of_week: parseInt(day),
        start_time: config.startTime,
        end_time: config.endTime,
        is_virtual: config.isVirtual,
      }));

    const breaksToSave = localBreaks.map((b) => ({
      day_of_week: b.day_of_week,
      start_time: b.start_time,
      end_time: b.end_time,
      label: b.label,
    }));

    const result = await onSave(windowsToSave, breaksToSave, timezone);

    if (result.success) {
      toast({
        title: "Availability saved",
        description: `${windowsToSave.length} day(s) configured with ${breaksToSave.length} break(s).`,
      });
    } else {
      toast({
        title: "Error saving availability",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const applyToAllDays = (sourceDay: number) => {
    const sourceConfig = dayConfigs[sourceDay];
    const newConfigs = { ...dayConfigs };
    for (let i = 0; i < 7; i++) {
      if (i !== sourceDay) {
        newConfigs[i] = { ...sourceConfig };
      }
    }
    setDayConfigs(newConfigs);
    toast({
      title: "Applied to all days",
      description: "Settings copied to all days of the week.",
    });
  };

  const applyToWeekdays = (sourceDay: number) => {
    const sourceConfig = dayConfigs[sourceDay];
    const newConfigs = { ...dayConfigs };
    for (let i = 1; i <= 5; i++) {
      newConfigs[i] = { ...sourceConfig };
    }
    setDayConfigs(newConfigs);
    toast({
      title: "Applied to weekdays",
      description: "Settings copied to Monday through Friday.",
    });
  };

  const clearAll = () => {
    const newConfigs: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      newConfigs[i] = {
        enabled: false,
        startTime: "09:00:00",
        endTime: "17:00:00",
        isVirtual: true,
      };
    }
    setDayConfigs(newConfigs);
    setLocalBreaks([]);
  };

  // Calculate preview slots for a day (excluding breaks)
  const getPreviewSlots = (dayIndex: number, config: DayConfig) => {
    if (!config.enabled) return [];
    
    const slots = [];
    const startHour = parseInt(config.startTime.split(":")[0]);
    const endHour = parseInt(config.endTime.split(":")[0]);
    const dayBreaks = localBreaks.filter((b) => b.day_of_week === dayIndex);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = `${hour.toString().padStart(2, "0")}:00:00`;
      const slotEnd = `${(hour + 1).toString().padStart(2, "0")}:00:00`;
      
      // Check if slot overlaps with any break
      const isBlocked = dayBreaks.some((brk) => {
        return brk.start_time < slotEnd && brk.end_time > slotStart;
      });
      
      if (!isBlocked) {
        const displayTime = new Date(`2000-01-01T${slotStart}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        slots.push(displayTime);
      }
    }
    
    return slots;
  };

  const enabledDaysCount = Object.values(dayConfigs).filter((c) => c.enabled).length;
  const totalBreaksCount = localBreaks.length;

  return (
    <div className="space-y-6">
      {/* Timezone Selector */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <Label className="font-medium">Your Timezone</Label>
            </div>
            <div className="flex-1">
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              All times you set will be in this timezone
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newConfigs = { ...dayConfigs };
            for (let i = 1; i <= 5; i++) {
              newConfigs[i] = {
                enabled: true,
                startTime: "09:00:00",
                endTime: "17:00:00",
                isVirtual: true,
              };
            }
            setDayConfigs(newConfigs);
          }}
        >
          Set Standard Hours (Mon-Fri, 9-5)
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBreaks(!showBreaks)}
        >
          <Coffee className="w-4 h-4 mr-2" />
          {showBreaks ? "Hide Breaks" : "Manage Breaks"}
          {totalBreaksCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {totalBreaksCount}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {/* Day Configuration Grid */}
      <div className="space-y-3">
        {DAY_NAMES.map((dayName, dayIndex) => {
          const config = dayConfigs[dayIndex];
          const isValid = !config.enabled || config.startTime < config.endTime;
          const dayBreaksCount = localBreaks.filter((b) => b.day_of_week === dayIndex).length;

          return (
            <Card 
              key={dayIndex} 
              className={`transition-all ${config.enabled ? "border-primary/50 bg-primary/5" : "opacity-60"} ${!isValid ? "border-destructive" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Day Toggle */}
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <Checkbox
                        id={`day-${dayIndex}`}
                        checked={config.enabled}
                        onCheckedChange={(checked) => updateDayConfig(dayIndex, { enabled: !!checked })}
                      />
                      <Label 
                        htmlFor={`day-${dayIndex}`} 
                        className={`font-medium cursor-pointer ${config.enabled ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {dayName}
                        {dayBreaksCount > 0 && (
                          <span className="ml-2 text-xs text-destructive">
                            ({dayBreaksCount} break{dayBreaksCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </Label>
                    </div>

                    {/* Time Range */}
                    <AnimatePresence>
                      {config.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">From</Label>
                            <Select
                              value={config.startTime}
                              onValueChange={(value) => updateDayConfig(dayIndex, { startTime: value })}
                            >
                              <SelectTrigger className="w-[120px]">
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

                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">To</Label>
                            <Select
                              value={config.endTime}
                              onValueChange={(value) => updateDayConfig(dayIndex, { endTime: value })}
                            >
                              <SelectTrigger className={`w-[120px] ${!isValid ? "border-destructive" : ""}`}>
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

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.isVirtual}
                              onCheckedChange={(checked) => updateDayConfig(dayIndex, { isVirtual: checked })}
                            />
                            <Label className="text-sm">Virtual</Label>
                          </div>

                          <div className="flex gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => applyToWeekdays(dayIndex)}
                            >
                              Apply to Weekdays
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => applyToAllDays(dayIndex)}
                            >
                              Apply to All
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isValid && config.enabled && (
                      <p className="text-sm text-destructive">End time must be after start time</p>
                    )}
                  </div>

                  {/* Breaks Section for this day */}
                  <AnimatePresence>
                    {showBreaks && config.enabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-8 border-l-2 border-muted"
                      >
                        <BreakTimeManager
                          dayOfWeek={dayIndex}
                          breaks={localBreaks}
                          onAddBreak={handleAddBreak}
                          onRemoveBreak={handleRemoveBreak}
                          onUpdateBreak={handleUpdateBreak}
                          availabilityStart={config.startTime}
                          availabilityEnd={config.endTime}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Section */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-gold" />
                  Client View Preview
                </CardTitle>
                <CardDescription>
                  This is how clients will see your available appointment times (shown in your timezone: {getTimezoneLabel(timezone)})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enabledDaysCount === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    No availability configured. Enable at least one day above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DAY_NAMES.map((dayName, dayIndex) => {
                      const config = dayConfigs[dayIndex];
                      if (!config.enabled) return null;
                      
                      const slots = getPreviewSlots(dayIndex, config);
                      const dayBreaksCount = localBreaks.filter((b) => b.day_of_week === dayIndex).length;
                      
                      return (
                        <div key={dayIndex} className="border border-border rounded-lg p-4">
                          <h4 className="font-medium mb-2">{dayName}</h4>
                          <p className="text-xs text-muted-foreground mb-1">
                            {TIME_OPTIONS.find((t) => t.value === config.startTime)?.label} - {TIME_OPTIONS.find((t) => t.value === config.endTime)?.label}
                          </p>
                          {dayBreaksCount > 0 && (
                            <p className="text-xs text-destructive mb-3">
                              {dayBreaksCount} break{dayBreaksCount !== 1 ? "s" : ""} scheduled
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {slots.slice(0, 6).map((slot, i) => (
                              <span
                                key={i}
                                className="text-xs bg-secondary px-2 py-1 rounded"
                              >
                                {slot}
                              </span>
                            ))}
                            {slots.length > 6 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{slots.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Each slot is 60 minutes. A 15-minute buffer is applied between appointments. Clients will see times converted to their local timezone.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
        <Button
          variant="hero"
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Availability ({enabledDaysCount} day{enabledDaysCount !== 1 ? "s" : ""}, {totalBreaksCount} break{totalBreaksCount !== 1 ? "s" : ""})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AvailabilityWindowPicker;
