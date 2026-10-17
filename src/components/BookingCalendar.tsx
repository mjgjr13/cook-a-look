import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, addMonths, addDays } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Lock, Video, MapPin, Briefcase, User as UserIcon } from "lucide-react";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { CORPORATE_VIRTUAL_HOURS, type CorporateInfo } from "@/lib/corporateAdvisors";
import { getBrowserTimezone, getTimezoneAbbreviation, formatTimeInTimezone } from "@/hooks/useTimezone";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";
import GooglePlacesAutocomplete, { type SelectedPlace } from "@/components/ui/google-places-autocomplete";

interface BookingCalendarProps {
  advisorId: string;
  advisorName: string;
  advisorAvatarUrl?: string | null;
  price: number;
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string | null;
  initialSlot?: string | null;
  virtualAvailable?: boolean;
  inPersonAvailable?: boolean;
  inPersonSurcharge?: number;
  /** Set when the advisor offers corporate / B2B engagements. */
  corporate?: CorporateInfo | null;
  /** Open straight into the corporate booking type (direct link / button). */
  initialKind?: "personal" | "corporate";
}

type CorporateFormat = "virtual" | "on_site";

interface CorporateDetails {
  groupSize: string;
  company: string;
  location: string;
  about: string;
}

const EMPTY_CORPORATE_DETAILS: CorporateDetails = { groupSize: "", company: "", location: "", about: "" };
const corporateDraftKey = (advisorId: string) => `cal-corporate-draft-${advisorId}`;
// Session length and meeting type chosen before a sign-in redirect.
const bookingPrefsKey = (advisorId: string) => `cal-booking-prefs-${advisorId}`;
const readBookingPrefs = (advisorId: string): { hours?: number; meetingType?: string } => {
  try {
    return JSON.parse(sessionStorage.getItem(bookingPrefsKey(advisorId)) || "{}");
  } catch {
    return {};
  }
};

interface TimeSlot {
  id: string;
  time: string;
  isVirtual: boolean;
  startTime: string;
  endTime: string;
}

interface MeetingLocation {
  id: string;
  name: string;
  address: string;
  city: string | null;
}

type OpenDatesRpc = (
  fn: "get_advisor_open_dates",
  args: { p_advisor_id: string; p_client_tz: string; p_duration_minutes: number },
) => PromiseLike<{ data: { open_date: string }[] | null; error: unknown }>;

const scrollBehavior = (): ScrollBehavior => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  } catch {
    return "smooth";
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BookingCalendar = ({
  advisorId,
  advisorName,
  advisorAvatarUrl = null,
  price,
  isOpen,
  onClose,
  initialDate,
  initialSlot,
  virtualAvailable = true,
  inPersonAvailable = false,
  inPersonSurcharge = 0,
  corporate = null,
  initialKind = "personal",
}: BookingCalendarProps) => {
  const offersCorporate = !!corporate && (corporate.offers_virtual || corporate.offers_on_site);
  const [kind, setKind] = useState<"personal" | "corporate">(
    initialKind === "corporate" && offersCorporate ? "corporate" : "personal"
  );
  const [corpFormat, setCorpFormat] = useState<CorporateFormat>(
    corporate?.offers_virtual ? "virtual" : "on_site"
  );
  // Restore corporate details typed before a sign-in redirect.
  const [corpDetails, setCorpDetails] = useState<CorporateDetails>(() => {
    try {
      const raw = sessionStorage.getItem(corporateDraftKey(advisorId));
      if (raw) return { ...EMPTY_CORPORATE_DETAILS, ...JSON.parse(raw).details };
    } catch {
      // storage unavailable
    }
    return EMPTY_CORPORATE_DETAILS;
  });
  const [corpRates, setCorpRates] = useState<{ virtual: number | null; onSite: number | null } | null>(null);
  const isCorporate = kind === "corporate" && offersCorporate;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate) : undefined
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(() => {
    if (initialSlot) {
      try { return JSON.parse(decodeURIComponent(initialSlot)); } catch { return null; }
    }
    return null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [clientTimezone] = useState<string>(getBrowserTimezone());
  const [hours, setHours] = useState<1 | 2 | 3>(() => {
    const h = readBookingPrefs(advisorId).hours;
    return initialSlot && (h === 2 || h === 3) ? h : 1;
  });
  // Dates (client's local calendar) with at least one open time; null = unknown, allow all.
  const [openDates, setOpenDates] = useState<Set<string> | null>(null);
  // Days that looked open but returned no times once picked (e.g. today's times already passed).
  const [emptyDates, setEmptyDates] = useState<Set<string>>(new Set());
  const slotDuration = isCorporate ? CORPORATE_VIRTUAL_HOURS * 60 : hours * 60;
  const timesRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const scrollToTimes = useRef(false);
  const [timesLoadedTick, setTimesLoadedTick] = useState(0);
  const scrollToDetails = useRef(false);
  // Start time to keep selected across refetches (restored after sign-in, or a session-length change).
  const keepSlotStart = useRef<string | null>(selectedSlot?.startTime ?? null);

  // Meeting type defaults: virtual if available, else in_person
  const [meetingType, setMeetingType] = useState<"virtual" | "in_person">(
    virtualAvailable ? "virtual" : "in_person"
  );
  const [locations, setLocations] = useState<MeetingLocation[]>([]);
  const [locationChoice, setLocationChoice] = useState<string>(""); // location id or "suggest"
  const [suggested, setSuggested] = useState<{
    name: string;
    address: string;
    note: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  }>({ name: "", address: "", note: "" });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const saved = initialSlot ? readBookingPrefs(advisorId).meetingType : undefined;
    if (saved === "in_person" && inPersonAvailable) setMeetingType("in_person");
    else if (saved === "virtual" && virtualAvailable) setMeetingType("virtual");
    else setMeetingType(virtualAvailable ? "virtual" : inPersonAvailable ? "in_person" : "virtual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualAvailable, inPersonAvailable]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialKind === "corporate" && offersCorporate) setKind("corporate");
    try {
      const raw = sessionStorage.getItem(corporateDraftKey(advisorId));
      const fmt = raw ? JSON.parse(raw).format : null;
      if (fmt === "virtual" && corporate?.offers_virtual) setCorpFormat("virtual");
      else if (fmt === "on_site" && corporate?.offers_on_site) setCorpFormat("on_site");
      else setCorpFormat(corporate?.offers_virtual ? "virtual" : "on_site");
    } catch {
      setCorpFormat(corporate?.offers_virtual ? "virtual" : "on_site");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKind, offersCorporate]);

  // Corporate rates are only readable by signed-in users, right before checkout.
  useEffect(() => {
    if (!isCorporate || !user || !UUID_REGEX.test(advisorId)) return;
    supabase.rpc("get_corporate_booking_info", { p_advisor_id: advisorId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      setCorpRates(row ? { virtual: row.virtual_rate ?? null, onSite: row.in_person_rate ?? null } : null);
    });
  }, [isCorporate, user, advisorId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load advisor's preset meeting locations (auth-gated via RPC)
  useEffect(() => {
    if (!advisorId || !UUID_REGEX.test(advisorId) || !inPersonAvailable) return;
    supabase
      .from("advisor_meeting_locations")
      .select("id, name, address, city")
      .eq("advisor_id", advisorId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const list = (data || []) as MeetingLocation[];
        setLocations(list);
        if (list.length > 0 && !locationChoice) setLocationChoice(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorId, inPersonAvailable, user]);

  // Which days have anything open, so empty days are greyed out instead of clicked in vain.
  useEffect(() => {
    setEmptyDates(new Set());
    if (!isOpen || !advisorId || !UUID_REGEX.test(advisorId) || (isCorporate && corpFormat === "on_site")) {
      setOpenDates(null);
      return;
    }
    let cancelled = false;
    (publicSupabase.rpc as unknown as OpenDatesRpc)("get_advisor_open_dates", {
      p_advisor_id: advisorId,
      p_client_tz: clientTimezone,
      p_duration_minutes: slotDuration,
    }).then(({ data, error }) => {
      if (cancelled) return;
      setOpenDates(error || !data ? null : new Set(data.map((r) => r.open_date)));
    }, () => !cancelled && setOpenDates(null));
    return () => {
      cancelled = true;
    };
  }, [isOpen, advisorId, clientTimezone, slotDuration, isCorporate, corpFormat]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !advisorId || !UUID_REGEX.test(advisorId)) {
        setTimeSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      const keep = keepSlotStart.current;
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        if (isCorporate && corpFormat === "on_site") {
          const { data: day } = await publicSupabase.rpc("get_corporate_full_day", {
            p_advisor_id: advisorId,
            p_date: dateStr,
          });
          const row = Array.isArray(day) ? day[0] : null;
          const slots: TimeSlot[] = row
            ? [{
                id: `fullday-${row.day_start}`,
                time: "Full day available",
                isVirtual: false,
                startTime: row.day_start,
                endTime: row.day_end,
              }]
            : [];
          setTimeSlots(slots);
          setSelectedSlot(slots.find((x) => x.startTime === keep) ?? null);
          return;
        }
        // Availability is stored per day in the advisor's time zone. The client's
        // day can overlap the advisor's previous, same and next day, so ask for
        // all three and keep the times that fall on the chosen day locally.
        const results = await Promise.all(
          [-1, 0, 1].map((offset) =>
            publicSupabase.rpc("get_available_booking_slots", {
              p_advisor_id: advisorId,
              p_date: format(addDays(selectedDate, offset), "yyyy-MM-dd"),
              p_duration_minutes: slotDuration,
              p_buffer_minutes: 15,
            })
          )
        );
        const seen = new Set<string>();
        const formatted: TimeSlot[] = results
          .flatMap((r) => (r.error || !r.data ? [] : r.data))
          .filter((slot: { slot_start: string }) => {
            const t = new Date(slot.slot_start);
            if (format(t, "yyyy-MM-dd") !== dateStr || seen.has(t.toISOString())) return false;
            seen.add(t.toISOString());
            return true;
          })
          .sort((a: { slot_start: string }, b: { slot_start: string }) =>
            new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
          )
          .map((slot: { slot_start: string; slot_end: string; is_virtual: boolean }) => ({
            id: `dynamic-${slot.slot_start}`,
            time: formatTimeInTimezone(new Date(slot.slot_start), clientTimezone),
            isVirtual: slot.is_virtual ?? true,
            startTime: slot.slot_start,
            endTime: slot.slot_end,
          }));
        setTimeSlots(formatted);
        if (formatted.length === 0) setEmptyDates((prev) => new Set(prev).add(dateStr));
        const kept = keep ? formatted.find((x) => new Date(x.startTime).getTime() === new Date(keep).getTime()) : undefined;
        setSelectedSlot(kept ?? null);
        if (keep && !kept && !isCorporate) {
          toast({
            title: "Pick another start time",
            description: `That time doesn't have room for a ${hours}-hour session.`,
          });
        }
      } finally {
        keepSlotStart.current = null;
        setIsLoadingSlots(false);
        if (scrollToTimes.current) setTimesLoadedTick((n) => n + 1);
      }
    };
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, advisorId, clientTimezone, isCorporate, corpFormat, slotDuration]);

  // Bring the next step into view so nobody has to scroll to find it.
  // Runs after the times for a newly picked date have rendered.
  useEffect(() => {
    if (!timesLoadedTick || !scrollToTimes.current) return;
    scrollToTimes.current = false;
    requestAnimationFrame(() => timesRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" }));
  }, [timesLoadedTick]);

  useEffect(() => {
    if (!scrollToDetails.current || !selectedSlot) return;
    scrollToDetails.current = false;
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
  }, [selectedSlot]);

  const handleSelectDate = (date: Date | undefined) => {
    scrollToTimes.current = !!date;
    keepSlotStart.current = null;
    setSelectedSlot(null);
    setSelectedDate(date);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    scrollToDetails.current = !selectedSlot;
    setSelectedSlot(slot);
  };

  const handleSelectHours = (h: 1 | 2 | 3) => {
    if (h === hours) return;
    keepSlotStart.current = selectedSlot?.startTime ?? null;
    setHours(h);
  };

  // Optional client booking fee (reward_settings.client_booking_fee_percent; 0 = off).
  // Readable once signed in; create-checkout applies the same value.
  const [bookingFeePercent, setBookingFeePercent] = useState(0);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("reward_settings")
      .select("setting_value")
      .eq("setting_key", "client_booking_fee_percent")
      .maybeSingle()
      .then(({ data }) => setBookingFeePercent(Math.max(0, Math.min(30, Number(data?.setting_value ?? 0) || 0))));
  }, [user]);

  const surchargeTotal = !isCorporate && meetingType === "in_person" ? (inPersonSurcharge || 0) : 0;
  const corporateRate = corpRates ? (corpFormat === "virtual" ? corpRates.virtual : corpRates.onSite) : null;
  const sessionPrice = isCorporate ? (corporateRate ?? 0) : price * hours + surchargeTotal;
  const bookingFee = Math.round(sessionPrice * bookingFeePercent) / 100;
  const total = sessionPrice + bookingFee;
  const totalLabel = Number.isInteger(total) ? total.toLocaleString() : total.toFixed(2);
  const effectiveMeetingType: "virtual" | "in_person" = isCorporate
    ? (corpFormat === "on_site" ? "in_person" : "virtual")
    : meetingType;

  const corporateFormError = (): string | null => {
    const size = parseInt(corpDetails.groupSize, 10);
    if (!Number.isInteger(size) || size < 1 || size > 10000) return "Enter the group size (number of people).";
    if (!corpDetails.company.trim()) return "Enter your company or organization.";
    if (corpFormat === "on_site" && corpDetails.location.trim().length < 5) return "Enter the address where the session will take place.";
    if (corpDetails.about.trim().length < 10) return "Tell the advisor a little about who you are and what you're looking for.";
    if (containsProfanity(corpDetails.company, corpDetails.location, corpDetails.about)) return PROFANITY_MESSAGE;
    return null;
  };

  const saveCorporateDraft = () => {
    try {
      sessionStorage.setItem(corporateDraftKey(advisorId), JSON.stringify({ format: corpFormat, details: corpDetails }));
    } catch {
      // storage unavailable
    }
  };

  const handleBooking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (!currentUser) {
      const params = new URLSearchParams();
      if (selectedDate && selectedSlot) {
        params.set("bookingDate", selectedDate.toISOString());
        params.set("bookingSlot", JSON.stringify(selectedSlot));
      }
      if (isCorporate) {
        params.set("book", "corporate");
        saveCorporateDraft();
      } else {
        try {
          sessionStorage.setItem(bookingPrefsKey(advisorId), JSON.stringify({ hours, meetingType }));
        } catch {
          // storage unavailable
        }
      }
      const qs = params.toString();
      const redirectTarget = `/advisors/${encodeURIComponent(advisorId)}${qs ? `?${qs}` : ""}`;
      onClose();
      // Most visitors booking for the first time don't have an account yet, so
      // send them to sign-up (which links to sign-in) with the booking preserved.
      navigate(`/signup?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast({ title: "Select a time", description: "Please select a date and time slot.", variant: "destructive" });
      return;
    }
    if (!UUID_REGEX.test(advisorId)) return;

    if (isCorporate) {
      const formError = corporateFormError();
      if (formError) {
        toast({ title: "A few details needed", description: formError, variant: "destructive" });
        return;
      }
    } else if (meetingType === "in_person") {
      if (locationChoice === "suggest") {
        if (!suggested.name.trim() || !suggested.address.trim()) {
          toast({ title: "Location required", description: "Please enter the venue name and address.", variant: "destructive" });
          return;
        }
      } else if (!locationChoice) {
        toast({ title: "Choose a location", variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);
    try {
      const sessionDate = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const startDate = new Date(selectedSlot.startTime);
      const computedEnd = new Date(startDate.getTime() + hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: isCorporate ? {
          advisorId,
          slotStartTime: selectedSlot.startTime,
          slotEndTime: selectedSlot.endTime,
          sessionDate,
          sessionTime: selectedSlot.time,
          isDynamicSlot: true,
          timezone: getBrowserTimezone(),
          corporate: {
            format: corpFormat,
            date: format(selectedDate, "yyyy-MM-dd"),
            groupSize: parseInt(corpDetails.groupSize, 10),
            company: corpDetails.company.trim().slice(0, 200),
            location: corpDetails.location.trim().slice(0, 300),
            about: corpDetails.about.trim().slice(0, 2000),
          },
        } : {
          advisorId,
          slotStartTime: selectedSlot.startTime,
          slotEndTime: computedEnd,
          sessionDate,
          sessionTime: selectedSlot.time,
          isDynamicSlot: true,
          timezone: getBrowserTimezone(),
          hours,
          meetingType,
          locationId: meetingType === "in_person" && locationChoice !== "suggest" ? locationChoice : null,
          suggestedLocation: meetingType === "in_person" && locationChoice === "suggest" ? {
            name: suggested.name.trim().slice(0, 200),
            address: suggested.address.trim().slice(0, 300),
            note: suggested.note.trim().slice(0, 300) || undefined,
            place_id: suggested.placeId,
            lat: suggested.lat,
            lng: suggested.lng,
          } : null,
        },
      });

      if (error) {
        // Extract structured error from the edge function response body
        let serverMessage = error.message || "Failed to create checkout session";
        let status: number | undefined;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          status = ctx.status;
          try {
            const body = await ctx.clone().json();
            if (body?.error) serverMessage = body.error;
          } catch {
            // ignore parse errors
          }
        }

        if (status === 409) {
          // Slot was just taken — refresh available slots and let user pick again
          toast({
            title: "Time slot unavailable",
            description: "That slot was just booked. Please pick another time.",
            variant: "destructive",
          });
          setSelectedSlot(null);
          keepSlotStart.current = null;
          if (selectedDate) {
            // Trigger a refetch by nudging the date dependency
            const d = new Date(selectedDate);
            setSelectedDate(new Date(d));
          }
          setIsLoading(false);
          return;
        }

        throw new Error(serverMessage);
      }
      if (data?.url) {
        try {
          sessionStorage.removeItem(corporateDraftKey(advisorId));
          sessionStorage.removeItem(bookingPrefsKey(advisorId));
        } catch {
          // storage unavailable
        }
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      toast({ title: "Booking failed", description: err instanceof Error ? err.message : "An error occurred", variant: "destructive" });
      setIsLoading(false);
    }
  };


  const maxDate = addMonths(new Date(), 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const disabledDays = [
    { before: today },
    { after: maxDate },
    (d: Date) => !!openDates && !openDates.has(format(d, "yyyy-MM-dd")),
    (d: Date) => emptyDates.has(format(d, "yyyy-MM-dd")) && format(d, "yyyy-MM-dd") !== (selectedDate && format(selectedDate, "yyyy-MM-dd")),
  ];
  const firstOpenDate = openDates && openDates.size > 0 ? [...openDates].sort()[0] : null;
  const nextOpenDate = (() => {
    if (!openDates || !selectedDate) return null;
    const current = format(selectedDate, "yyyy-MM-dd");
    const next = [...openDates].sort().find((d) => d > current && !emptyDates.has(d));
    return next ? new Date(`${next}T12:00:00`) : null;
  })();
  const clientTzAbbr = getTimezoneAbbreviation(clientTimezone);
  const showTypeChooser = virtualAvailable && inPersonAvailable;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[500px] max-h-[88svh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 pr-8 text-left">
          {advisorAvatarUrl && (
            <img
              src={optimizedImageUrl(advisorAvatarUrl, 96, 96)}
              onError={fallbackToOriginal(advisorAvatarUrl)}
              alt=""
              className="h-12 w-12 shrink-0 object-cover bg-muted"
            />
          )}
          <div className="min-w-0 space-y-1">
            <DialogTitle className="font-serif text-2xl leading-tight">
              {isCorporate ? "Book corporate services" : "Book a session"}
            </DialogTitle>
            <DialogDescription>
              {isCorporate ? `With ${advisorName}, for your team` : `With ${advisorName}`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-3 sm:py-4">
          {offersCorporate && (
            <div className="mb-4">
              <p className="font-sans text-sm mb-2">What are you booking?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["personal", "Personal styling", UserIcon],
                  ["corporate", "Corporate services", Briefcase],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                    className={cn(
                      "min-h-11 px-2 py-2 text-sm font-sans border transition-colors flex items-center justify-center gap-1.5",
                      kind === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary"
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCorporate && (
            <div className="mb-4">
              <p className="font-sans text-sm mb-2">Format</p>
              <div className={cn("grid gap-2", corporate?.offers_virtual && corporate?.offers_on_site ? "grid-cols-2" : "grid-cols-1")}>
                {corporate?.offers_virtual && (
                  <button
                    type="button"
                    onClick={() => setCorpFormat("virtual")}
                    aria-pressed={corpFormat === "virtual"}
                    className={cn(
                      "min-h-11 px-2 py-2 text-sm font-sans border transition-colors flex items-center justify-center gap-1.5",
                      corpFormat === "virtual"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary"
                    )}
                  >
                    <Video className="w-4 h-4" aria-hidden="true" /> Virtual
                  </button>
                )}
                {corporate?.offers_on_site && (
                  <button
                    type="button"
                    onClick={() => setCorpFormat("on_site")}
                    aria-pressed={corpFormat === "on_site"}
                    className={cn(
                      "min-h-11 px-2 py-2 text-sm font-sans border transition-colors flex items-center justify-center gap-1.5",
                      corpFormat === "on_site"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary"
                    )}
                  >
                    <MapPin className="w-4 h-4" aria-hidden="true" /> On-site
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {corpFormat === "virtual"
                  ? "A video session for your team."
                  : "The advisor comes to your workplace for the whole day."}
              </p>
            </div>
          )}
          <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-secondary/50 text-sm text-muted-foreground">
            <Globe className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>Times are in your local time ({clientTzAbbr}). You can book up to a month ahead.</span>
          </div>

          <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={disabledDays}
            defaultMonth={selectedDate ?? (firstOpenDate ? new Date(`${firstOpenDate}T12:00:00`) : undefined)}
            key={firstOpenDate ?? "calendar"}
            className={cn("p-0 sm:p-3 pointer-events-auto")}
            initialFocus
          />
          </div>

          {openDates && openDates.size === 0 && !selectedDate && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {advisorName} has no open times in the next month. Please check back soon.
            </p>
          )}
          {openDates && openDates.size > 0 && !selectedDate && (
            <p className="mt-4 text-center text-xs text-muted-foreground">Greyed-out days have no open times.</p>
          )}

          {selectedDate && (
            <div className="mt-6 scroll-mt-4" ref={timesRef}>
              <h4 className="font-sans font-medium mb-3">
                {isCorporate && corpFormat === "on_site" ? "Availability for" : "Available times for"} {format(selectedDate, "MMMM d, yyyy")}
              </h4>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className={cn("grid gap-2", isCorporate && corpFormat === "on_site" ? "grid-cols-1" : "grid-cols-2")}>
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectSlot(slot)}
                      aria-pressed={selectedSlot?.id === slot.id}
                      className={cn(
                        "min-h-11 px-2 sm:px-4 py-2 text-sm font-sans border transition-colors",
                        selectedSlot?.id === slot.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {isCorporate && corpFormat === "on_site"
                      ? "This day isn't fully open for an on-site booking."
                      : isCorporate
                        ? `No openings on this date.`
                        : "No available slots for this date."}
                  </p>
                  {nextOpenDate && !isCorporate ? (
                    <Button variant="outline" className="mt-4" onClick={() => handleSelectDate(nextOpenDate)}>
                      Next available: {format(nextOpenDate, "EEE, MMM d")}
                    </Button>
                  ) : (
                    <p className="text-sm mt-1">Please select another date.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedSlot && (
            <div ref={detailsRef} className="mt-6 p-4 bg-secondary border border-border space-y-4 scroll-mt-4">
              <div className="flex justify-between items-start gap-4">
                <span className="font-sans text-sm">Your session</span>
                <span className="font-sans font-medium text-right">
                  {format(selectedDate, "EEE, MMM d")} · {selectedSlot.time} {clientTzAbbr}
                </span>
              </div>

              {isCorporate && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="corp-group-size" className="font-sans text-sm mb-1.5 block">Group size</label>
                    <Input
                      id="corp-group-size"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="10000"
                      placeholder="Number of people"
                      value={corpDetails.groupSize}
                      onChange={(e) => setCorpDetails({ ...corpDetails, groupSize: e.target.value.replace(/[^\d]/g, "") })}
                    />
                  </div>
                  <div>
                    <label htmlFor="corp-company" className="font-sans text-sm mb-1.5 block">Company or organization</label>
                    <Input
                      id="corp-company"
                      placeholder="e.g. Hudson Capital"
                      maxLength={200}
                      value={corpDetails.company}
                      onChange={(e) => setCorpDetails({ ...corpDetails, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-sans text-sm mb-1.5 block">
                      {corpFormat === "on_site" ? "Session address" : "Where is your team based? (optional)"}
                    </label>
                    {corpFormat === "on_site" ? (
                      <GooglePlacesAutocomplete
                        value={corpDetails.location}
                        onChange={(text) => setCorpDetails({ ...corpDetails, location: text })}
                        onSelect={(place: SelectedPlace) => setCorpDetails({ ...corpDetails, location: place.formattedAddress })}
                        placeholder="Office address"
                      />
                    ) : (
                      <GooglePlacesAutocomplete
                        value={corpDetails.location}
                        onChange={(text) => setCorpDetails({ ...corpDetails, location: text.slice(0, 300) })}
                        onSelect={(place: SelectedPlace) => setCorpDetails({ ...corpDetails, location: place.formattedAddress })}
                        placeholder="City or office"
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="corp-about" className="font-sans text-sm mb-1.5 block">Who you are and what you're looking for</label>
                    <Textarea
                      id="corp-about"
                      rows={4}
                      maxLength={2000}
                      placeholder="e.g. I lead HR at a 40-person finance firm. We'd like a workshop on business-casual dress for client meetings."
                      value={corpDetails.about}
                      onChange={(e) => setCorpDetails({ ...corpDetails, about: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {!isCorporate && (
              <div>
                <p className="font-sans text-sm mb-2">Session length</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHours(h as 1 | 2 | 3)}
                      aria-pressed={hours === h}
                      className={cn(
                        "min-h-11 px-2 py-2 text-sm font-sans border transition-colors",
                        hours === h
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      )}
                    >
                      {h} {h === 1 ? "hour" : "hours"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ${price.toLocaleString()}/hour × {hours} = ${(price * hours).toLocaleString()}. Maximum 3 hours per booking.
                </p>
              </div>
              )}

              {!isCorporate && showTypeChooser && (
                <div>
                  <p className="font-sans text-sm mb-2">Meeting type</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMeetingType("virtual")}
                      aria-pressed={meetingType === "virtual"}
                      className={cn(
                        "min-h-11 px-2 py-2 text-sm font-sans border transition-colors flex items-center justify-center gap-1",
                        meetingType === "virtual"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      )}
                    >
                      <Video className="w-4 h-4" /> Virtual
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType("in_person")}
                      aria-pressed={meetingType === "in_person"}
                      className={cn(
                        "min-h-11 px-2 py-2 text-sm font-sans border transition-colors flex items-center justify-center gap-1",
                        meetingType === "in_person"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      )}
                    >
                      <MapPin className="w-4 h-4" /> In-person
                    </button>
                  </div>
                </div>
              )}

              {!isCorporate && meetingType === "in_person" && (
                <div className="space-y-2">
                  <p className="font-sans text-sm">Where would you like to meet?</p>
                  {locations.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No preset locations — suggest one below for the advisor to approve.
                    </p>
                  )}
                  {locations.map((loc) => (
                    <label
                      key={loc.id}
                      className={cn(
                        "flex items-start gap-2 p-2 border cursor-pointer",
                        locationChoice === loc.id ? "border-primary bg-background" : "border-border bg-background/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="location"
                        value={loc.id}
                        checked={locationChoice === loc.id}
                        onChange={() => setLocationChoice(loc.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-muted-foreground">{loc.address}{loc.city ? `, ${loc.city}` : ""}</p>
                      </div>
                    </label>
                  ))}
                  <label
                    className={cn(
                      "flex items-start gap-2 p-2 border cursor-pointer",
                      locationChoice === "suggest" ? "border-primary bg-background" : "border-border bg-background/50"
                    )}
                  >
                    <input
                      type="radio"
                      name="location"
                      value="suggest"
                      checked={locationChoice === "suggest"}
                      onChange={() => setLocationChoice("suggest")}
                      className="mt-1"
                    />
                    <span className="text-sm font-medium">Suggest another location (advisor approval required)</span>
                  </label>
                  {locationChoice === "suggest" && (
                    <div className="space-y-2 pl-6">
                      <GooglePlacesAutocomplete
                        value={suggested.address}
                        onChange={(text) =>
                          setSuggested({
                            ...suggested,
                            address: text,
                            // free-typing invalidates the place reference
                            placeId: undefined,
                            lat: undefined,
                            lng: undefined,
                          })
                        }
                        onSelect={(place: SelectedPlace) =>
                          setSuggested({
                            ...suggested,
                            name: place.name || suggested.name || place.formattedAddress,
                            address: place.formattedAddress,
                            placeId: place.placeId,
                            lat: place.lat,
                            lng: place.lng,
                          })
                        }
                        placeholder="Search for a venue or address"
                      />
                      <Input
                        placeholder="Venue name (optional)"
                        value={suggested.name}
                        maxLength={200}
                        onChange={(e) => setSuggested({ ...suggested, name: e.target.value })}
                      />
                      <Textarea
                        placeholder="Note for the advisor (optional)"
                        value={suggested.note}
                        maxLength={300}
                        onChange={(e) => setSuggested({ ...suggested, note: e.target.value })}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        You'll be charged now; if the advisor declines, they'll counter with one of their spots.
                      </p>
                    </div>
                  )}
                  {surchargeTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      +${surchargeTotal} in-person surcharge applies.
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-3">
                {bookingFee > 0 && (!isCorporate || corporateRate != null) && (
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                    <span className="font-sans">Booking fee</span>
                    <span className="font-sans">${bookingFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm">Total</span>
                  <span className="font-sans font-medium">
                    {isCorporate
                      ? !user
                        ? "Shown before you pay"
                        : corporateRate != null
                          ? `$${totalLabel}`
                          : "…"
                      : `$${totalLabel}`}
                  </span>
                </div>
                {isCorporate && !user && (
                  <p className="text-xs text-muted-foreground mt-1">Sign in or create a free account to see the price.</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Plus any sales tax, shown at checkout before you pay.</p>
              </div>
              {/* Must match public.calculate_refund (database) - update both together. */}
              <div className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-3">
                <p className="font-semibold text-foreground mb-1">Cancellation policy</p>
                <p>
                  Cancel any time before your session for a full refund. Cancelling within{" "}
                  {effectiveMeetingType === "in_person" ? "2 hours of an in-person session" : "1 hour of a video session"} has a 10%
                  fee. Full refund if your advisor cancels.
                </p>
              </div>
              <Button variant="hero" className="w-full" onClick={handleBooking} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : !user
                  ? "Continue to Book"
                  : isCorporate && corporateRate == null
                    ? "Continue to Payment"
                    : `Continue to Payment · $${totalLabel}`}
              </Button>
              <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {!user && (
                  <p className="text-foreground">Next: create a free account or sign in. Your selected time is saved.</p>
                )}
                <p className="flex items-start gap-1.5">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Secure checkout with Stripe; Cook A Look never sees your card details.
                    Payment is held in escrow until 48 hours after your session.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendar;
