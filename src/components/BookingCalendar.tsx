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
import { Loader2, Globe, Info, Video, MapPin } from "lucide-react";
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
}

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
}: BookingCalendarProps) => {
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
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load advisor's preset meeting locations (auth-gated via RPC)
  useEffect(() => {
    if (!advisorId || !UUID_REGEX.test(advisorId) || !inPersonAvailable || !user) return;
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
        const dateStr = selectedDate.toISOString().split("T")[0];
        const { data: dynamicSlots, error } = await supabase.rpc("get_available_booking_slots", {
          p_advisor_id: advisorId,
          p_date: dateStr,
          p_duration_minutes: 60,
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
  }, [selectedDate, advisorId, clientTimezone]);

  const surchargeTotal = meetingType === "in_person" ? (inPersonSurcharge || 0) : 0;
  const total = price * hours + surchargeTotal;

  const handleBooking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    if (!currentUser) {
      const bookingState = selectedDate && selectedSlot
        ? `&bookingDate=${selectedDate.toISOString()}&bookingSlot=${encodeURIComponent(JSON.stringify(selectedSlot))}`
        : "";
      toast({ title: "Sign in required", description: "Please sign in to book a consultation." });
      onClose();
      navigate(`/signin?redirect=/advisors/${encodeURIComponent(advisorId)}${bookingState}`);
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast({ title: "Select a time", description: "Please select a date and time slot.", variant: "destructive" });
      return;
    }
    if (!UUID_REGEX.test(advisorId)) return;

    if (meetingType === "in_person") {
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
        body: {
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
          <DialogTitle className="font-serif text-2xl leading-tight">Book Consultation</DialogTitle>
          <DialogDescription>Select a date and time for your consultation with {advisorName}</DialogDescription>
        </DialogHeader>

        <div className="py-3 sm:py-4">
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
                Available times for {format(selectedDate, "MMMM d, yyyy")}
              </h4>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
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
                  <p>No available slots for this date.</p>
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

              {showTypeChooser && (
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

              {meetingType === "in_person" && (
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

              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="font-sans text-sm">Total</span>
                <span className="font-sans font-medium">${total}</span>
              </div>
              <Button variant="hero" className="w-full" onClick={handleBooking} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : user ? "Proceed to Payment" : "Sign in to Book"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
                Secure checkout via Stripe — Cook A Look never sees your card details.
                Payment is held in escrow for 48 hours after your session.
              </p>
              {!user && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  You'll need to sign in to complete your booking
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendar;
