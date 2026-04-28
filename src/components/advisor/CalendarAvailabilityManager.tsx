import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Save, 
  Loader2, 
  Settings2,
  Ban,
  Check,
  AlertCircle,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, isSameDay, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AvailabilityWindow } from "@/hooks/useAdvisorAvailability";
import { DateOverride, DateBlock } from "@/hooks/useDateOverrides";
import { QuickSetupPresets, PresetOption } from "./QuickSetupPresets";
import DateOverrideEditor from "./DateOverrideEditor";
import BreakTimeManager, { BreakConfig } from "./BreakTimeManager";
import { getBrowserTimezone, getTimezoneLabel } from "@/hooks/useTimezone";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type AvailabilityTab = "quick" | "weekly" | "exceptions";

// Generate time options
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

interface CalendarAvailabilityManagerProps {
  windows: AvailabilityWindow[];
  breaks: BreakConfig[];
  dateOverrides: DateOverride[];
  dateBlocks: DateBlock[];
  isSaving: boolean;
  onSaveWeeklyDefaults: (
    windows: Array<{ day_of_week: number; start_time: string; end_time: string; is_virtual: boolean }>,
    breaks: Array<{ day_of_week: number; start_time: string; end_time: string; label: string }>
  ) => Promise<{ success: boolean; error?: string }>;
  onSaveDateOverride: (override: Omit<DateOverride, "id" | "advisor_id">) => Promise<{ success: boolean; error?: string }>;
  onDeleteDateOverride: (date: string) => Promise<{ success: boolean; error?: string }>;
  onAddDateBlock: (block: Omit<DateBlock, "id" | "advisor_id">) => Promise<{ success: boolean; error?: string }>;
  onDeleteDateBlock: (blockId: string) => Promise<{ success: boolean; error?: string }>;
}

const CalendarAvailabilityManager = ({
  windows,
  breaks: initialBreaks,
  dateOverrides,
  dateBlocks,
  isSaving,
  onSaveWeeklyDefaults,
  onSaveDateOverride,
  onDeleteDateOverride,
  onAddDateBlock,
  onDeleteDateBlock,
}: CalendarAvailabilityManagerProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"quick" | "weekly" | "calendar">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showBreaks, setShowBreaks] = useState(false);
  const [localBreaks, setLocalBreaks] = useState<BreakConfig[]>([]);
  const detectedTimezone = getBrowserTimezone();

  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>(() => {
    const initial: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      const existingWindow = windows.find((w) => w.day_of_week === i);
      if (existingWindow) {
        initial[i] = {
          enabled: true,
          startTime: existingWindow.start_time,
          endTime: existingWindow.end_time,
          isVirtual: existingWindow.is_virtual,
        };
      } else {
        initial[i] = {
          enabled: false,
          startTime: "09:00:00",
          endTime: "17:00:00",
          isVirtual: true,
        };
      }
    }
    return initial;
  });

  // Sync breaks
  useState(() => {
    setLocalBreaks(initialBreaks.map(b => ({
      ...b,
      id: b.id || `temp-${Date.now()}-${Math.random()}`,
    })));
  });

  const updateDayConfig = (day: number, updates: Partial<DayConfig>) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }));
  };

  const handlePresetSelect = async (preset: PresetOption) => {
    const newConfigs: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      if (preset.days.includes(i)) {
        newConfigs[i] = {
          enabled: true,
          startTime: preset.startTime,
          endTime: preset.endTime,
          isVirtual: true,
        };
      } else {
        newConfigs[i] = {
          enabled: false,
          startTime: "09:00:00",
          endTime: "17:00:00",
          isVirtual: true,
        };
      }
    }
    setDayConfigs(newConfigs);
    
    // Auto-save preset
    const windowsToSave = Object.entries(newConfigs)
      .filter(([, config]) => config.enabled)
      .map(([day, config]) => ({
        day_of_week: parseInt(day),
        start_time: config.startTime,
        end_time: config.endTime,
        is_virtual: config.isVirtual,
      }));

    const result = await onSaveWeeklyDefaults(windowsToSave, []);
    if (result.success) {
      toast({
        title: "Availability set!",
        description: `Using "${preset.label}" as your default schedule.`,
      });
      setActiveTab("calendar");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleSaveWeekly = async () => {
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

    const result = await onSaveWeeklyDefaults(windowsToSave, breaksToSave);
    
    if (result.success) {
      toast({
        title: "Weekly defaults saved",
        description: `${windowsToSave.length} day(s) configured.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
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

  // Get status for a date on the calendar
  const getDateStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();
    
    // Check for date-specific override first
    const override = dateOverrides.find((o) => o.override_date === dateStr);
    if (override) {
      return override.is_available ? "custom" : "blocked";
    }
    
    // Check for date-specific blocks
    const blocks = dateBlocks.filter((b) => b.block_date === dateStr);
    if (blocks.length > 0) {
      return "partial";
    }
    
    // Fall back to weekly default
    const weeklyWindow = windows.find((w) => w.day_of_week === dayOfWeek);
    if (weeklyWindow) {
      const dayBreaks = initialBreaks.filter((b) => b.day_of_week === dayOfWeek);
      return dayBreaks.length > 0 ? "partial" : "available";
    }
    
    return "unavailable";
  };

  // Get weekly default for a day
  const getWeeklyDefaultForDay = (dayOfWeek: number) => {
    const window = windows.find((w) => w.day_of_week === dayOfWeek);
    if (window) {
      return { startTime: window.start_time, endTime: window.end_time };
    }
    return null;
  };

  const enabledDaysCount = Object.values(dayConfigs).filter((c) => c.enabled).length;
  const overrideCount = dateOverrides.length;
  const maxDate = addMonths(new Date(), 1);

  return (
    <div className="space-y-6">
      {/* Timezone Notice */}
      <Card className="bg-secondary/30 border-secondary">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>
              All times are in <strong>{getTimezoneLabel(detectedTimezone)}</strong> (detected from your browser)
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AvailabilityTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Clock className="w-4 h-4" />
            Weekly Defaults
            {enabledDaysCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {enabledDaysCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendar
            {overrideCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {overrideCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Quick Setup Tab */}
        <TabsContent value="quick" className="mt-6">
          <QuickSetupPresets
            onSelectPreset={handlePresetSelect}
            onCustom={() => setActiveTab("weekly")}
          />
        </TabsContent>

        {/* Weekly Defaults Tab */}
        <TabsContent value="weekly" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
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
              Weekdays 9–5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBreaks(!showBreaks)}
            >
              <Coffee className="w-4 h-4 mr-2" />
              {showBreaks ? "Hide Breaks" : "Manage Breaks"}
            </Button>
          </div>

          <div className="space-y-2">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const config = dayConfigs[dayIndex];
              const isValid = !config.enabled || config.startTime < config.endTime;
              const dayBreaksCount = localBreaks.filter((b) => b.day_of_week === dayIndex).length;

              return (
                <Card 
                  key={dayIndex} 
                  className={cn(
                    "transition-all",
                    config.enabled ? "border-primary/30 bg-primary/5" : "opacity-60",
                    !isValid && "border-destructive"
                  )}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <Checkbox
                            id={`day-${dayIndex}`}
                            checked={config.enabled}
                            onCheckedChange={(checked) => updateDayConfig(dayIndex, { enabled: !!checked })}
                          />
                          <Label htmlFor={`day-${dayIndex}`} className="font-medium cursor-pointer">
                            {dayName}
                          </Label>
                        </div>

                        {config.enabled && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={config.startTime}
                              onValueChange={(value) => updateDayConfig(dayIndex, { startTime: value })}
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
                            <span className="text-sm text-muted-foreground">to</span>
                            <Select
                              value={config.endTime}
                              onValueChange={(value) => updateDayConfig(dayIndex, { endTime: value })}
                            >
                              <SelectTrigger className={cn("w-[100px] h-8", !isValid && "border-destructive")}>
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
                            {dayBreaksCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {dayBreaksCount} break{dayBreaksCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Breaks for this day */}
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
                              onUpdateBreak={() => {}}
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

          <Button onClick={handleSaveWeekly} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Weekly Defaults
              </>
            )}
          </Button>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Select a Date</CardTitle>
                <CardDescription>
                  Click any date to customize availability for that day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={[{ before: new Date() }, { after: maxDate }]}
                  className="mx-auto"
                  modifiers={{
                    available: (date) => getDateStatus(date) === "available",
                    custom: (date) => getDateStatus(date) === "custom",
                    partial: (date) => getDateStatus(date) === "partial",
                    blocked: (date) => getDateStatus(date) === "blocked",
                    unavailable: (date) => getDateStatus(date) === "unavailable",
                  }}
                  modifiersClassNames={{
                    available: "bg-primary/20 text-primary-foreground hover:bg-primary/30",
                    custom: "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 ring-1 ring-blue-500/50",
                    partial: "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30",
                    blocked: "bg-destructive/20 text-destructive hover:bg-destructive/30 line-through",
                    unavailable: "text-muted-foreground/50",
                  }}
                />
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary/20" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500/20 ring-1 ring-blue-500/50" />
                    <span>Custom hours</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500/20" />
                    <span>Has blocks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-destructive/20" />
                    <span>Blocked</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Editor */}
            <div>
              <AnimatePresence mode="wait">
                {selectedDate ? (
                  <motion.div
                    key={selectedDate.toISOString()}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <DateOverrideEditor
                      date={selectedDate}
                      existingOverride={dateOverrides.find(
                        (o) => o.override_date === format(selectedDate, "yyyy-MM-dd")
                      )}
                      existingBlocks={dateBlocks.filter(
                        (b) => b.block_date === format(selectedDate, "yyyy-MM-dd")
                      )}
                      weeklyDefault={getWeeklyDefaultForDay(selectedDate.getDay())}
                      onSave={onSaveDateOverride}
                      onDelete={() => onDeleteDateOverride(format(selectedDate, "yyyy-MM-dd"))}
                      onAddBlock={async (block) => onAddDateBlock({
                        block_date: format(selectedDate, "yyyy-MM-dd"),
                        ...block,
                      })}
                      onDeleteBlock={onDeleteDateBlock}
                      onClose={() => setSelectedDate(undefined)}
                      isSaving={isSaving}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="h-full flex items-center justify-center min-h-[300px]">
                      <CardContent className="text-center py-8">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          Select a date on the calendar to customize availability
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          You can book appointments up to 1 month in advance
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Upcoming Overrides Summary */}
          {dateOverrides.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Custom Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {dateOverrides
                    .filter((o) => new Date(o.override_date) >= startOfDay(new Date()))
                    .slice(0, 10)
                    .map((override) => (
                      <Badge
                        key={override.id}
                        variant={override.is_available ? "outline" : "destructive"}
                        className="cursor-pointer"
                        onClick={() => setSelectedDate(new Date(override.override_date))}
                      >
                        {format(new Date(override.override_date), "MMM d")}
                        {override.is_available ? (
                          <Check className="w-3 h-3 ml-1" />
                        ) : (
                          <Ban className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarAvailabilityManager;
