import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Eye,
  Check,
  Ban,
  Copy,
  ChevronDown,
  Save,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  useAdvisorAvailability,
  getAvailableSlotsForDate,
  DynamicSlot,
} from "@/hooks/useAdvisorAvailability";
import { useDateOverrides } from "@/hooks/useDateOverrides";
import {
  COMMON_TIMEZONES,
  getBrowserTimezone,
  getTimezoneLabel,
} from "@/hooks/useTimezone";
import { supabase } from "@/integrations/supabase/client";
import TimeSelect from "@/components/advisor/TimeSelect";
import { cn } from "@/lib/utils";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PRESETS = [
  { id: "wk", label: "Weekdays 9–5", days: [1, 2, 3, 4, 5], start: "09:00:00", end: "17:00:00" },
  { id: "ev", label: "Evenings 6–9", days: [1, 2, 3, 4, 5], start: "18:00:00", end: "21:00:00" },
  { id: "we", label: "Weekends 10–4", days: [0, 6], start: "10:00:00", end: "16:00:00" },
];

interface WeekRow {
  enabled: boolean;
  start: string;
  end: string;
}

const emptyRow = (): WeekRow => ({ enabled: false, start: "09:00:00", end: "17:00:00" });

const AdvisorAvailability = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isLoading: profileLoading } = useProfile();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTz, setActiveTz] = useState<string>(getBrowserTimezone());

  const { windows, timezone, isLoading: avLoading, isSaving, saveAll } =
    useAdvisorAvailability(profileId);
  const {
    overrides,
    isLoading: ovLoading,
    isSaving: ovSaving,
    saveOverride,
    deleteOverride,
  } = useDateOverrides(profileId);

  // Weekly grid state — 7 rows indexed 0..6 (Sun..Sat)
  const [rows, setRows] = useState<WeekRow[]>(() => Array.from({ length: 7 }, emptyRow));
  const [dirty, setDirty] = useState(false);

  // Hydrate rows from server `windows`
  useEffect(() => {
    if (avLoading) return;
    setRows(
      Array.from({ length: 7 }, (_, i) => {
        const w = windows.find((x) => x.day_of_week === i);
        return w
          ? { enabled: true, start: w.start_time, end: w.end_time }
          : emptyRow();
      })
    );
    setDirty(false);
  }, [windows, avLoading]);

  useEffect(() => {
    if (timezone) setActiveTz(timezone);
  }, [timezone]);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (!roles.isAdvisor) {
        toast({
          title: "Access denied",
          description: "Only advisors can manage availability.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setProfileId(profile.id);
    }
  }, [profileLoading, profile, roles.isAdvisor, navigate, toast]);

  // --- Row helpers ---
  const updateRow = (dow: number, patch: Partial<WeekRow>) => {
    setRows((prev) => prev.map((r, i) => (i === dow ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const copyToAll = (dow: number) => {
    const src = rows[dow];
    setRows((prev) =>
      prev.map((r) => ({ enabled: src.enabled, start: src.start, end: src.end }))
    );
    setDirty(true);
    toast({ title: `Copied ${DAY_NAMES_FULL[dow]} to every day` });
  };

  const copyToWeekdays = (dow: number) => {
    const src = rows[dow];
    setRows((prev) =>
      prev.map((r, i) =>
        i >= 1 && i <= 5
          ? { enabled: src.enabled, start: src.start, end: src.end }
          : r
      )
    );
    setDirty(true);
    toast({ title: `Copied ${DAY_NAMES_FULL[dow]} to Mon–Fri` });
  };

  const applyPresetToRows = (preset: (typeof PRESETS)[number]) => {
    setRows((prev) =>
      prev.map((r, i) =>
        preset.days.includes(i)
          ? { enabled: true, start: preset.start, end: preset.end }
          : r
      )
    );
    setDirty(true);
  };

  const validation = useMemo(() => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.enabled && r.start >= r.end) {
        return `${DAY_NAMES_FULL[i]}: end time must be after start time`;
      }
    }
    return null;
  }, [rows]);

  const saveWeek = async () => {
    if (validation) {
      toast({ title: "Fix times", description: validation, variant: "destructive" });
      return;
    }
    const payload = rows
      .map((r, i) =>
        r.enabled
          ? {
              day_of_week: i,
              start_time: r.start,
              end_time: r.end,
              is_virtual: true,
            }
          : null
      )
      .filter((x): x is NonNullable<typeof x> => !!x);
    const res = await saveAll(payload, []);
    if (res.success) {
      toast({ title: "Weekly hours saved" });
      setDirty(false);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const updateTimezone = async (tz: string) => {
    setActiveTz(tz);
    if (!profile?.user_id) return;
    const { error } = await supabase
      .from("advisor_profiles")
      .update({ timezone: tz })
      .eq("user_id", profile.user_id);
    if (error)
      toast({
        title: "Could not update timezone",
        description: error.message,
        variant: "destructive",
      });
    else toast({ title: "Timezone updated" });
  };

  // --- Live client preview (next 14 days) ---
  const previewDays = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);

  const [previewSlots, setPreviewSlots] = useState<Record<string, DynamicSlot[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const loadPreview = useCallback(async () => {
    if (!profileId || dirty) return; // only show truth after save
    setPreviewLoading(true);
    const results: Record<string, DynamicSlot[]> = {};
    await Promise.all(
      previewDays.map(async (d) => {
        const slots = await getAvailableSlotsForDate(profileId, d);
        results[format(d, "yyyy-MM-dd")] = slots;
      })
    );
    setPreviewSlots(results);
    setPreviewLoading(false);
  }, [profileId, previewDays, dirty]);

  useEffect(() => {
    if (showPreview) loadPreview();
  }, [showPreview, loadPreview, windows]);

  // --- Advanced: date-by-date overrides ---
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const weeks = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
    return Array.from({ length: 4 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
    );
  }, [weekOffset]);

  const [ovMode, setOvMode] = useState<"available" | "blocked">("available");
  const [ovStart, setOvStart] = useState("09:00:00");
  const [ovEnd, setOvEnd] = useState("17:00:00");

  useEffect(() => {
    if (!selectedDate) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const ov = overrides.find((o) => o.override_date === ds);
    if (ov) {
      setOvMode(ov.is_available ? "available" : "blocked");
      if (ov.start_time)
        setOvStart(ov.start_time.length === 5 ? `${ov.start_time}:00` : ov.start_time);
      if (ov.end_time)
        setOvEnd(ov.end_time.length === 5 ? `${ov.end_time}:00` : ov.end_time);
      return;
    }
    const wk = windows.find((w) => w.day_of_week === selectedDate.getDay());
    if (wk) {
      setOvMode("available");
      setOvStart(wk.start_time);
      setOvEnd(wk.end_time);
    } else {
      setOvMode("blocked");
    }
  }, [selectedDate, overrides, windows]);

  const getDateStatus = (date: Date): "blocked" | "open" | "unset" | "past" => {
    if (isBefore(date, today)) return "past";
    const ds = format(date, "yyyy-MM-dd");
    const ov = overrides.find((o) => o.override_date === ds);
    if (ov) return ov.is_available ? "open" : "blocked";
    const wk = windows.find((w) => w.day_of_week === date.getDay());
    if (wk) return "open";
    return "unset";
  };

  const saveOverrideForDate = async () => {
    if (!selectedDate || !profileId) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const res = await saveOverride({
      advisor_id: profileId,
      override_date: ds,
      is_available: ovMode === "available",
      start_time: ovMode === "available" ? ovStart : null,
      end_time: ovMode === "available" ? ovEnd : null,
    });
    if (res.success) {
      toast({ title: `${format(selectedDate, "EEE, MMM d")} updated` });
      loadPreview();
    } else
      toast({ title: "Error", description: res.error, variant: "destructive" });
  };

  const clearOverride = async () => {
    if (!selectedDate) return;
    const ds = format(selectedDate, "yyyy-MM-dd");
    const res = await deleteOverride(ds);
    if (res.success) {
      toast({ title: "Reverted to weekly default" });
      loadPreview();
    }
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

  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <Layout>
      <section className="py-10 bg-card min-h-screen">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/advisor")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-gold font-sans text-xs tracking-[0.3em] uppercase mb-1">
                  Availability
                </p>
                <h1 className="font-serif text-2xl md:text-3xl font-medium">
                  Set your weekly hours
                </h1>
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
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                  {!COMMON_TIMEZONES.find((t) => t.value === activeTz) && (
                    <SelectItem value={activeTz}>{getTimezoneLabel(activeTz)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick presets */}
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Quick start:
                </span>
                {PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="outline"
                    onClick={() => applyPresetToRows(p)}
                  >
                    {p.label}
                  </Button>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">
                  Presets stage changes — click <strong>Save</strong> below to apply.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Weekly grid */}
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="space-y-3">
                {rows.map((row, dow) => (
                  <div
                    key={dow}
                    className={cn(
                      "flex flex-wrap items-center gap-3 py-2 border-b last:border-0",
                      !row.enabled && "opacity-60"
                    )}
                  >
                    <label className="flex items-center gap-3 min-w-[140px] cursor-pointer">
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={(v) => updateRow(dow, { enabled: v })}
                        aria-label={`${DAY_NAMES_FULL[dow]} enabled`}
                      />
                      <span className="font-medium font-sans">
                        {DAY_NAMES_FULL[dow]}
                      </span>
                    </label>

                    {row.enabled ? (
                      <>
                        <div className="flex items-center gap-2">
                          <TimeSelect
                            value={row.start}
                            onChange={(v) => updateRow(dow, { start: v })}
                            ariaLabel={`${DAY_NAMES_FULL[dow]} start`}
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <TimeSelect
                            value={row.end}
                            onChange={(v) => updateRow(dow, { end: v })}
                            ariaLabel={`${DAY_NAMES_FULL[dow]} end`}
                          />
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToWeekdays(dow)}
                            title="Copy to Mon–Fri"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Mon–Fri
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToAll(dow)}
                            title="Copy to every day"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> All
                          </Button>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>

              {validation && (
                <p className="text-sm text-destructive mt-3">{validation}</p>
              )}

              <div className="flex items-center justify-between mt-5 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {enabledCount === 0
                    ? "No days enabled — clients won't be able to book."
                    : `${enabledCount} day${enabledCount === 1 ? "" : "s"} per week`}
                </p>
                <Button
                  onClick={saveWeek}
                  disabled={isSaving || !!validation || !dirty}
                  size="lg"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {dirty ? "Save weekly hours" : "Saved"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client preview */}
          <Card className="mb-6">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">What clients will see (next 14 days)</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? "Hide" : "Show"}
                </Button>
              </div>

              {showPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4"
                >
                  {dirty ? (
                    <p className="text-sm text-muted-foreground">
                      Save your changes to refresh the preview.
                    </p>
                  ) : previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Generating slots…
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-auto">
                      {previewDays.map((d) => {
                        const ds = format(d, "yyyy-MM-dd");
                        const slots = previewSlots[ds] || [];
                        if (slots.length === 0) return null;
                        return (
                          <div key={ds} className="border-b pb-2 last:border-0">
                            <p className="text-sm font-medium mb-1">
                              {format(d, "EEE, MMM d")}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {slots.map((s) => (
                                <Badge
                                  key={s.slot_start}
                                  variant="secondary"
                                  className="text-xs font-normal"
                                >
                                  {new Date(s.slot_start).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    timeZone: activeTz,
                                  })}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {Object.values(previewSlots).every((s) => s.length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          No bookable slots yet. Add availability above.
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Advanced: date-by-date overrides */}
          <Collapsible>
            <Card>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">Advanced: date-by-date overrides</p>
                    <p className="text-xs text-muted-foreground">
                      Override or block specific dates (vacations, one-off availability)
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="border-t pt-5">
                  <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">Next 4 weeks</h3>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={weekOffset <= 0}
                            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                          >
                            ←
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={weekOffset >= 0}
                            onClick={() => setWeekOffset((w) => w + 1)}
                          >
                            →
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAY_NAMES_SHORT.map((d) => (
                          <div
                            key={d}
                            className="text-center text-xs font-medium text-muted-foreground py-1"
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {weeks.map((week, wi) => (
                          <div key={wi} className="grid grid-cols-7 gap-1">
                            {week.map((date) => {
                              const status = getDateStatus(date);
                              const isSelected =
                                selectedDate && isSameDay(date, selectedDate);
                              const beyond = isBefore(maxDate, date);
                              const ds = format(date, "yyyy-MM-dd");
                              const hasOv = overrides.some(
                                (o) => o.override_date === ds
                              );
                              return (
                                <button
                                  key={date.toISOString()}
                                  type="button"
                                  disabled={status === "past" || beyond}
                                  onClick={() => setSelectedDate(startOfDay(date))}
                                  className={cn(
                                    "aspect-square rounded-md border flex flex-col items-center justify-center text-sm transition-all relative",
                                    "hover:border-primary hover:bg-primary/5",
                                    isSelected &&
                                      "border-primary bg-primary/10 ring-2 ring-primary",
                                    status === "past" && "opacity-30 cursor-not-allowed",
                                    beyond && "opacity-20 cursor-not-allowed",
                                    status === "blocked" &&
                                      "bg-destructive/10 border-destructive/30",
                                    status === "open" &&
                                      "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
                                    status === "unset" && "bg-muted/40 border-border"
                                  )}
                                >
                                  <span className="font-medium">{format(date, "d")}</span>
                                  {status === "open" && (
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                  {status === "blocked" && (
                                    <Ban className="w-3 h-3 text-destructive" />
                                  )}
                                  {hasOv && !beyond && status !== "past" && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Override editor */}
                    <div className="space-y-4 border-l lg:pl-6 pt-4 lg:pt-0">
                      {selectedDate ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              Override for
                            </p>
                            <h3 className="font-serif text-lg">
                              {format(selectedDate, "EEEE, MMM d")}
                            </h3>
                            {overrides.some(
                              (o) =>
                                o.override_date ===
                                format(selectedDate, "yyyy-MM-dd")
                            ) && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={ovMode === "available" ? "default" : "outline"}
                              onClick={() => setOvMode("available")}
                            >
                              <Check className="w-4 h-4 mr-1" /> Available
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={ovMode === "blocked" ? "default" : "outline"}
                              onClick={() => setOvMode("blocked")}
                            >
                              <Ban className="w-4 h-4 mr-1" /> Blocked
                            </Button>
                          </div>

                          {ovMode === "available" && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm w-10 text-muted-foreground">
                                  From
                                </span>
                                <TimeSelect
                                  value={ovStart}
                                  onChange={setOvStart}
                                  ariaLabel="Override start"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm w-10 text-muted-foreground">
                                  To
                                </span>
                                <TimeSelect
                                  value={ovEnd}
                                  onChange={setOvEnd}
                                  ariaLabel="Override end"
                                />
                              </div>
                              {ovStart >= ovEnd && (
                                <p className="text-xs text-destructive">
                                  End must be after start.
                                </p>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Button
                              className="w-full"
                              size="sm"
                              disabled={
                                ovSaving ||
                                (ovMode === "available" && ovStart >= ovEnd)
                              }
                              onClick={saveOverrideForDate}
                            >
                              {ovSaving && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              Save override
                            </Button>
                            {overrides.some(
                              (o) =>
                                o.override_date ===
                                format(selectedDate, "yyyy-MM-dd")
                            ) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-muted-foreground"
                                onClick={clearOverride}
                              >
                                Reset to weekly default
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Pick a date on the left to override it.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorAvailability;
