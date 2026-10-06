import { useState, useEffect } from "react";
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
import { format, addMonths } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Info, Video, MapPin, Briefcase, User as UserIcon } from "lucide-react";
import { CORPORATE_VIRTUAL_HOURS, type CorporateInfo } from "@/lib/corporateAdvisors";
import { getBrowserTimezone, getTimezoneAbbreviation, formatTimeInTimezone } from "@/hooks/useTimezone";
import GooglePlacesAutocomplete, { type SelectedPlace } from "@/components/ui/google-places-autocomplete";

interface BookingCalendarProps {
  advisorId: string;
  advisorName: string;
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BookingCalendar = ({
  advisorId,
  advisorName,
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
  const [hours, setHours] = useState<1 | 2 | 3>(1);

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
    setMeetingType(virtualAvailable ? "virtual" : inPersonAvailable ? "in_person" : "virtual");
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

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !advisorId || !UUID_REGEX.test(advisorId)) {
        setTimeSlots([]);
        return;
      }
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        if (isCorporate && corpFormat === "on_site") {
          const { data: day } = await supabase.rpc("get_corporate_full_day", {
            p_advisor_id: advisorId,
            p_date: dateStr,
          });
          const row = Array.isArray(day) ? day[0] : null;
          setTimeSlots(
            row
              ? [{
                  id: `fullday-${row.day_start}`,
                  time: "Full day available",
                  isVirtual: false,
                  startTime: row.day_start,
                  endTime: row.day_end,
                }]
              : []
          );
          return;
        }
        const { data: dynamicSlots, error } = await supabase.rpc("get_available_booking_slots", {
          p_advisor_id: advisorId,
          p_date: dateStr,
          p_duration_minutes: isCorporate ? CORPORATE_VIRTUAL_HOURS * 60 : 60,
          p_buffer_minutes: 15,
        });
        if (!error && dynamicSlots && dynamicSlots.length > 0) {
          const formatted: TimeSlot[] = dynamicSlots.map((slot: { slot_start: string; slot_end: string; is_virtual: boolean }, idx: number) => ({
            id: `dynamic-${idx}-${slot.slot_start}`,
            time: formatTimeInTimezone(new Date(slot.slot_start), clientTimezone),
            isVirtual: slot.is_virtual ?? true,
            startTime: slot.slot_start,
            endTime: slot.slot_end,
          }));
          setTimeSlots(formatted);
        } else {
          setTimeSlots([]);
        }
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, advisorId, clientTimezone, isCorporate, corpFormat]);

  const surchargeTotal = !isCorporate && meetingType === "in_person" ? (inPersonSurcharge || 0) : 0;
  const corporateRate = corpRates ? (corpFormat === "virtual" ? corpRates.virtual : corpRates.onSite) : null;
  const total = isCorporate ? (corporateRate ?? 0) : price * hours + surchargeTotal;
  const effectiveMeetingType: "virtual" | "in_person" = isCorporate
    ? (corpFormat === "on_site" ? "in_person" : "virtual")
    : meetingType;

  const corporateFormError = (): string | null => {
    const size = parseInt(corpDetails.groupSize, 10);
    if (!Number.isInteger(size) || size < 1 || size > 10000) return "Enter the group size (number of people).";
    if (!corpDetails.company.trim()) return "Enter your company or organization.";
    if (corpFormat === "on_site" && corpDetails.location.trim().length < 5) return "Enter the address where the session will take place.";
    if (corpDetails.about.trim().length < 10) return "Tell the advisor a little about who you are and what you're looking for.";
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
  const disabledDays = [{ before: new Date() }, { after: maxDate }];
  const clientTzAbbr = getTimezoneAbbreviation(clientTimezone);
  const showTypeChooser = virtualAvailable && inPersonAvailable;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[500px] max-h-[88svh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl leading-tight">
            {isCorporate ? "Book Corporate Services" : "Book Consultation"}
          </DialogTitle>
          <DialogDescription>
            {isCorporate
              ? `Book a corporate session with ${advisorName} for your team`
              : `Select a date and time for your consultation with ${advisorName}`}
          </DialogDescription>
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
          <div className="flex items-start sm:items-center justify-center gap-2 mb-2 p-2 bg-secondary/50 rounded-lg">
            <Globe className="w-4 h-4 mt-0.5 sm:mt-0 text-muted-foreground shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground text-center">
              All times shown in your local time ({clientTzAbbr})
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>You can book up to 1 month in advance</span>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDays}
            className={cn("p-0 sm:p-3 pointer-events-auto mx-auto")}
            initialFocus
          />

          {selectedDate && (
            <div className="mt-6">
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
                      onClick={() => setSelectedSlot(slot)}
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
                  <p className="text-sm mt-1">Please select another date.</p>
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedSlot && (
            <div className="mt-6 p-4 bg-secondary border border-border space-y-4">
              <div className="flex justify-between items-start gap-4">
                <span className="font-sans text-sm">Selected time</span>
                <span className="font-sans font-medium text-right">{selectedSlot.time} ({clientTzAbbr})</span>
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
                      <Input
                        placeholder="City or office"
                        maxLength={300}
                        value={corpDetails.location}
                        onChange={(e) => setCorpDetails({ ...corpDetails, location: e.target.value })}
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
                      onClick={() => setHours(h as 1 | 2 | 3)}
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
                  ${price}/hour × {hours} = ${price * hours}. Maximum 3 hours per booking.
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
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm">Total</span>
                  <span className="font-sans font-medium">
                    {isCorporate
                      ? !user
                        ? "Shown before you pay"
                        : corporateRate != null
                          ? `$${total.toLocaleString()}`
                          : "…"
                      : `$${total}`}
                  </span>
                </div>
                {isCorporate && !user && (
                  <p className="text-[11px] text-muted-foreground mt-1">Sign in or create a free account to see the price.</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Plus any applicable sales tax, shown at checkout before you pay.</p>
              </div>
              {/* Must match public.calculate_refund (database) - update both together. */}
              <div className="text-[11px] leading-relaxed text-muted-foreground border-t border-border pt-3">
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
                    : `Continue to Payment · $${total.toLocaleString()}`}
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Next: create a free account or sign in. Your selected time is saved.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
                Secure checkout via Stripe. Cook A Look never sees your card details.
                Payment is held in escrow until 48 hours after your session.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendar;
