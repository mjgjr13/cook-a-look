import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Clock, Eye, Check, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAdvisorAvailability, getAvailableSlotsForDate, DynamicSlot } from "@/hooks/useAdvisorAvailability";
import { useDateOverrides } from "@/hooks/useDateOverrides";
import { COMMON_TIMEZONES, getBrowserTimezone, getTimezoneLabel } from "@/hooks/useTimezone";
import { supabase } from "@/integrations/supabase/client";
import TimeSelect from "@/components/advisor/TimeSelect";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PRESETS = [
  { id: "wk", label: "Weekdays 9–5", days: [1, 2, 3, 4, 5], start: "09:00:00", end: "17:00:00" },
  { id: "ev", label: "Evenings 6–9", days: [1, 2, 3, 4, 5], start: "18:00:00", end: "21:00:00" },
  { id: "we", label: "Weekends 10–4", days: [0, 6], start: "10:00:00", end: "16:00:00" },
];

const AdvisorAvailability = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isLoading: profileLoading } = useProfile();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<Record<string, DynamicSlot[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const { windows, timezone, isLoading: avLoading, isSaving, saveAll } = useAdvisorAvailability(profileId);
  const { overrides, blocks, isLoading: ovLoading, isSaving: ovSaving, saveOverride, deleteOverride } = useDateOverrides(profileId);

  const [activeTz, setActiveTz] = useState<string>(getBrowserTimezone());

  useEffect(() => {
    if (timezone) setActiveTz(timezone);
  }, [timezone]);

  // Local day editor state
  const [editMode, setEditMode] = useState<"available" | "blocked">("available");
  const [editStart, setEditStart] = useState("09:00:00");
  const [editEnd, setEditEnd] = useState("17:00:00");

  useEffect(() => {
    if (!profileLoading && profile) {
      if (!roles.isAdvisor) {
        toast({ title: "Access denied", description: "Only advisors can manage availability.", variant: "destructive" });
        navigate("/");
        return;
      }
      setProfileId(profile.id);
    }
  }, [profileLoading, profile, roles.isAdvisor, navigate, toast]);

  // Compute the 4-week grid starting from the current week
  const weeks = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
    return Array.from({ length: 4 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
    );
  }, [weekOffset]);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);

  // Determine status for a date
  const getDateStatus = (date: Date): "blocked" | "open" | "unset" | "past" => {
    if (isBefore(date, today)) return "past";
    const ds = format(date, "yyyy-MM-dd");
    const ov = overrides.find((o) => o.override_date === ds);
    if (ov) return ov.is_available ? "open" : "blocked";
    const wk = windows.find((w) => w.day_of_week === date.getDay());
    if (wk) return "open";
    return "unset";
  };

  // Sync editor state when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const ov = overrides.find((o) => o.override_date === ds);
    if (ov) {
      setEditMode(ov.is_available ? "available" : "blocked");
      if (ov.start_time) setEditStart(ov.start_time.length === 5 ? `${ov.start_time}:00` : ov.start_time);
      if (ov.end_time) setEditEnd(ov.end_time.length === 5 ? `${ov.end_time}:00` : ov.end_time);
      return;
    }
    const wk = windows.find((w) => w.day_of_week === selectedDate.getDay());
    if (wk) {
      setEditMode("available");
      setEditStart(wk.start_time);
      setEditEnd(wk.end_time);
    } else {
      setEditMode("available");
      setEditStart("09:00:00");
      setEditEnd("17:00:00");
    }
  }, [selectedDate, overrides, windows]);

  const applyPreset = async (preset: typeof PRESETS[number]) => {
    if (!profileId) return;
    // Merge: keep windows for days not in preset, replace for days in preset
    const merged = windows
      .filter((w) => !preset.days.includes(w.day_of_week))
      .map((w) => ({ day_of_week: w.day_of_week, start_time: w.start_time, end_time: w.end_time, is_virtual: w.is_virtual }));
    for (const d of preset.days) {
      merged.push({ day_of_week: d, start_time: preset.start, end_time: preset.end, is_virtual: true });
    }
    const res = await saveAll(merged, []);
    if (res.success) toast({ title: `${preset.label} saved` });
    else toast({ title: "Error", description: res.error, variant: "destructive" });
  };

  const applyToThisDay = async () => {
    if (!selectedDate) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const res = await saveOverride({
      advisor_id: profileId!,
      override_date: ds,
      is_available: editMode === "available",
      start_time: editMode === "available" ? editStart : null,
      end_time: editMode === "available" ? editEnd : null,
    });
    if (res.success) toast({ title: `${format(selectedDate, "EEE, MMM d")} updated` });
    else toast({ title: "Error", description: res.error, variant: "destructive" });
  };

  const applyToEveryDayOfWeek = async () => {
    if (!selectedDate || !profileId) return;
    const dow = selectedDate.getDay();
    const merged = windows
      .filter((w) => w.day_of_week !== dow)
      .map((w) => ({ day_of_week: w.day_of_week, start_time: w.start_time, end_time: w.end_time, is_virtual: w.is_virtual }));
    if (editMode === "available") {
      merged.push({ day_of_week: dow, start_time: editStart, end_time: editEnd, is_virtual: true });
    }
    const res = await saveAll(merged, []);
    if (res.success) toast({ title: `Every ${FULL_DAY_NAMES[dow]} updated` });
    else toast({ title: "Error", description: res.error, variant: "destructive" });
  };

  const clearOverride = async () => {
    if (!selectedDate) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const res = await deleteOverride(ds);
    if (res.success) toast({ title: "Override removed", description: "Day uses weekly default again." });
  };

  const updateTimezone = async (tz: string) => {
    setActiveTz(tz);
    if (!profile?.user_id) return;
    const { error } = await supabase.from("advisor_profiles").update({ timezone: tz }).eq("user_id", profile.user_id);
    if (error) toast({ title: "Could not update timezone", description: error.message, variant: "destructive" });
    else toast({ title: "Timezone updated" });
  };

  const loadPreview = async () => {
    if (!profileId) return;
    setPreviewLoading(true);
    setShowPreview(true);
    const allDays = weeks.flat().filter((d) => !isBefore(d, today) && !isBefore(maxDate, d));
    const results: Record<string, DynamicSlot[]> = {};
    await Promise.all(
      allDays.map(async (d) => {
        const slots = await getAvailableSlotsForDate(profileId, d);
        results[format(d, "yyyy-MM-dd")] = slots;
      })
    );
    setPreviewSlots(results);
    setPreviewLoading(false);
  };

  if (profileLoading || avLoading || ovLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const selectedStatus = selectedDate ? getDateStatus(selectedDate) : "unset";
  const selectedDs = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const hasOverride = overrides.some((o) => o.override_date === selectedDs);

  return (
    <Layout>
      <section className="py-10 bg-card min-h-screen">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/advisor")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-gold font-sans text-xs tracking-[0.3em] uppercase mb-1">Availability</p>
                <h1 className="font-serif text-2xl md:text-3xl font-medium">When are you free?</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Select value={activeTz} onValueChange={updateTimezone}>
                <SelectTrigger className="w-[230px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                  {!COMMON_TIMEZONES.find((t) => t.value === activeTz) && (
                    <SelectItem value={activeTz}>{getTimezoneLabel(activeTz)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick presets */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Quick start:</span>
                {PRESETS.map((p) => (
                  <Button key={p.id} size="sm" variant="outline" disabled={isSaving} onClick={() => applyPreset(p)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Calendar */}
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-lg">Next 4 weeks</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={weekOffset <= 0} onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}>←</Button>
                    <Button size="sm" variant="ghost" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => w + 1)}>→</Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                </div>

                <div className="space-y-1">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {week.map((date) => {
                        const status = getDateStatus(date);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                        const beyond = isBefore(maxDate, date);
                        const ds = format(date, "yyyy-MM-dd");
                        const hasOv = overrides.some((o) => o.override_date === ds);
                        return (
                          <button
                            key={date.toISOString()}
                            type="button"
                            disabled={status === "past" || beyond}
                            onClick={() => setSelectedDate(startOfDay(date))}
                            className={cn(
                              "aspect-square rounded-md border flex flex-col items-center justify-center text-sm transition-all relative",
                              "hover:border-primary hover:bg-primary/5",
                              isSelected && "border-primary bg-primary/10 ring-2 ring-primary",
                              status === "past" && "opacity-30 cursor-not-allowed",
                              beyond && "opacity-20 cursor-not-allowed",
                              status === "blocked" && "bg-destructive/10 border-destructive/30",
                              status === "open" && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
                              status === "unset" && "bg-muted/40 border-border"
                            )}
                          >
                            <span className="font-medium">{format(date, "d")}</span>
                            {status === "open" && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                            {status === "blocked" && <Ban className="w-3 h-3 text-destructive" />}
                            {hasOv && !beyond && status !== "past" && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800" /> Open</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive/15 border border-destructive/40" /> Blocked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border border-border" /> Unset</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gold" /> Date override</span>
                </div>
              </CardContent>
            </Card>

            {/* Day editor */}
            <Card>
              <CardContent className="py-6 space-y-5">
                {selectedDate ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Editing</p>
                      <h2 className="font-serif text-xl">{format(selectedDate, "EEEE, MMM d")}</h2>
                      {hasOverride && (
                        <Badge variant="outline" className="mt-2 text-xs">Custom for this date</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={editMode === "available" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditMode("available")}
                      >
                        <Check className="w-4 h-4 mr-1" /> Available
                      </Button>
                      <Button
                        type="button"
                        variant={editMode === "blocked" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditMode("blocked")}
                      >
                        <Ban className="w-4 h-4 mr-1" /> Blocked
                      </Button>
                    </div>

                    {editMode === "available" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm w-12 text-muted-foreground">From</span>
                          <TimeSelect value={editStart} onChange={setEditStart} ariaLabel="Start time" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm w-12 text-muted-foreground">To</span>
                          <TimeSelect value={editEnd} onChange={setEditEnd} ariaLabel="End time" />
                        </div>
                        {editStart >= editEnd && (
                          <p className="text-xs text-destructive">End time must be after start time.</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t">
                      <Button
                        className="w-full"
                        disabled={ovSaving || (editMode === "available" && editStart >= editEnd)}
                        onClick={applyToThisDay}
                      >
                        {ovSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Apply to this day
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isSaving || (editMode === "available" && editStart >= editEnd)}
                        onClick={applyToEveryDayOfWeek}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Apply to every {FULL_DAY_NAMES[selectedDate.getDay()]}
                      </Button>
                      {hasOverride && (
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearOverride}>
                          Reset to weekly default
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Pick a date on the calendar to edit it.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Client preview */}
          <Card className="mt-6">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Preview what clients will see</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={showPreview ? () => setShowPreview(false) : loadPreview}>
                  {showPreview ? "Hide" : "Show preview"}
                </Button>
              </div>

              {showPreview && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  {previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating slots…
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {weeks.flat().filter((d) => !isBefore(d, today) && !isBefore(maxDate, d)).map((d) => {
                        const ds = format(d, "yyyy-MM-dd");
                        const slots = previewSlots[ds] || [];
                        if (slots.length === 0) return null;
                        return (
                          <div key={ds} className="border-b pb-2 last:border-0">
                            <p className="text-sm font-medium mb-1">{format(d, "EEE, MMM d")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {slots.map((s) => (
                                <Badge key={s.slot_start} variant="secondary" className="text-xs font-normal">
                                  {new Date(s.slot_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: activeTz })}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {Object.values(previewSlots).every((s) => s.length === 0) && (
                        <p className="text-sm text-muted-foreground">No bookable slots yet. Add availability above.</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorAvailability;
