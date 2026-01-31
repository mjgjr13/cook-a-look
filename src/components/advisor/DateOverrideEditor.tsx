import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Ban, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { DateOverride, DateBlock } from "@/hooks/useDateOverrides";

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

interface DateOverrideEditorProps {
  date: Date;
  existingOverride?: DateOverride | null;
  existingBlocks: DateBlock[];
  weeklyDefault?: { startTime: string; endTime: string } | null;
  onSave: (override: Omit<DateOverride, "id" | "advisor_id">) => Promise<{ success: boolean; error?: string }>;
  onDelete: () => Promise<{ success: boolean; error?: string }>;
  onAddBlock: (block: { start_time: string; end_time: string }) => Promise<{ success: boolean; error?: string }>;
  onDeleteBlock: (blockId: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  isSaving: boolean;
}

const DateOverrideEditor = ({
  date,
  existingOverride,
  existingBlocks,
  weeklyDefault,
  onSave,
  onDelete,
  onAddBlock,
  onDeleteBlock,
  onClose,
  isSaving,
}: DateOverrideEditorProps) => {
  const dateStr = format(date, "yyyy-MM-dd");
  
  const [isAvailable, setIsAvailable] = useState(
    existingOverride?.is_available ?? true
  );
  const [startTime, setStartTime] = useState(
    existingOverride?.start_time ?? weeklyDefault?.startTime ?? "09:00:00"
  );
  const [endTime, setEndTime] = useState(
    existingOverride?.end_time ?? weeklyDefault?.endTime ?? "17:00:00"
  );
  
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlockStart, setNewBlockStart] = useState("12:00:00");
  const [newBlockEnd, setNewBlockEnd] = useState("13:00:00");

  const isValidTimeRange = startTime < endTime;
  const isValidBlock = newBlockStart < newBlockEnd;
  const hasChanges = existingOverride 
    ? (existingOverride.is_available !== isAvailable ||
       existingOverride.start_time !== startTime ||
       existingOverride.end_time !== endTime)
    : true;

  const handleSave = async () => {
    const result = await onSave({
      override_date: dateStr,
      is_available: isAvailable,
      start_time: isAvailable ? startTime : null,
      end_time: isAvailable ? endTime : null,
    });
    
    if (result.success) {
      onClose();
    }
  };

  const handleAddBlock = async () => {
    const result = await onAddBlock({
      start_time: newBlockStart,
      end_time: newBlockEnd,
    });
    
    if (result.success) {
      setIsAddingBlock(false);
      setNewBlockStart("12:00:00");
      setNewBlockEnd("13:00:00");
    }
  };

  const handleResetToDefault = async () => {
    if (existingOverride) {
      await onDelete();
    }
    onClose();
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif">
            {format(date, "EEEE, MMMM d, yyyy")}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        {weeklyDefault && !existingOverride && (
          <p className="text-xs text-muted-foreground">
            Weekly default: {TIME_OPTIONS.find(t => t.value === weeklyDefault.startTime)?.label} – {TIME_OPTIONS.find(t => t.value === weeklyDefault.endTime)?.label}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Toggle */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            {isAvailable ? (
              <Clock className="w-4 h-4 text-primary" />
            ) : (
              <Ban className="w-4 h-4 text-destructive" />
            )}
            <Label className="font-medium">
              {isAvailable ? "Available" : "Fully blocked (day off)"}
            </Label>
          </div>
          <Switch
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
        </div>

        {/* Time Range (only if available) */}
        {isAvailable && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label className="text-sm">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className={!isValidTimeRange ? "border-destructive" : ""}>
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
            </div>
            {!isValidTimeRange && (
              <p className="text-xs text-destructive">End time must be after start time</p>
            )}

            {/* Blocked times within the day */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Blocked Times</Label>
              
              {existingBlocks.length > 0 && (
                <div className="space-y-2">
                  {existingBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-2 bg-destructive/10 rounded border border-destructive/20"
                    >
                      <span className="text-sm">
                        {TIME_OPTIONS.find(t => t.value === block.start_time)?.label} – {TIME_OPTIONS.find(t => t.value === block.end_time)?.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => onDeleteBlock(block.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {isAddingBlock ? (
                <div className="p-3 border border-dashed rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Select value={newBlockStart} onValueChange={setNewBlockStart}>
                      <SelectTrigger className="w-[110px]">
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
                    <Select value={newBlockEnd} onValueChange={setNewBlockEnd}>
                      <SelectTrigger className={`w-[110px] ${!isValidBlock ? "border-destructive" : ""}`}>
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
                  {!isValidBlock && (
                    <p className="text-xs text-destructive">End must be after start</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingBlock(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddBlock}
                      disabled={!isValidBlock || isSaving}
                    >
                      Add Block
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsAddingBlock(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Block time
                </Button>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          {existingOverride && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToDefault}
              disabled={isSaving}
            >
              Reset to default
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || (isAvailable && !isValidTimeRange)}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DateOverrideEditor;
