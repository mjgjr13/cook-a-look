import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Info } from "lucide-react";
import { getBrowserTimezone, getTimezoneAbbreviation, formatTimeInTimezone } from "@/hooks/useTimezone";

interface BookingCalendarProps {
  advisorId: string;
  advisorName: string;
  price: number;
  isOpen: boolean;
  onClose: () => void;
}

interface TimeSlot {
  id: string;
  time: string;
  isVirtual: boolean;
  startTime: string;
  endTime: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BookingCalendar = ({
  advisorId,
  advisorName,
  price,
  isOpen,
  onClose,
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [clientTimezone] = useState<string>(getBrowserTimezone());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch dynamically calculated slots when date changes
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
        
        // First try the new dynamic slot calculation
        const { data: dynamicSlots, error: dynamicError } = await supabase.rpc(
          "get_available_booking_slots",
          {
            p_advisor_id: advisorId,
            p_date: dateStr,
            p_duration_minutes: 60,
            p_buffer_minutes: 15,
          }
        );

        if (!dynamicError && dynamicSlots && dynamicSlots.length > 0) {
          // Use dynamic slots from the new system - convert to client timezone for display
          const formattedSlots: TimeSlot[] = dynamicSlots.map((slot: { slot_start: string; slot_end: string; is_virtual: boolean }, index: number) => ({
            id: `dynamic-${index}-${slot.slot_start}`,
            time: formatTimeInTimezone(new Date(slot.slot_start), clientTimezone),
            isVirtual: slot.is_virtual ?? true,
            startTime: slot.slot_start,
            endTime: slot.slot_end,
          }));
          setTimeSlots(formattedSlots);
        } else {
          // Fallback to legacy slot system
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);

          const { data, error } = await supabase
            .from("availability_slots")
            .select("id, start_time, end_time, is_virtual")
            .eq("advisor_id", advisorId)
            .eq("is_booked", false)
            .gte("start_time", startOfDay.toISOString())
            .lte("start_time", endOfDay.toISOString())
            .order("start_time");

          if (error) {
            console.error("Error fetching slots:", error);
            setTimeSlots([]);
            return;
          }

          if (data && data.length > 0) {
            const formattedSlots: TimeSlot[] = data.map((slot) => ({
              id: slot.id,
              time: formatTimeInTimezone(new Date(slot.start_time), clientTimezone),
              isVirtual: slot.is_virtual ?? true,
              startTime: slot.start_time,
              endTime: slot.end_time,
            }));
            setTimeSlots(formattedSlots);
          } else {
            setTimeSlots([]);
          }
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, advisorId, clientTimezone]);

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book a consultation.",
      });
      onClose();
      navigate(`/signin?redirect=/advisors/${encodeURIComponent(advisorId)}`);
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Select a time",
        description: "Please select a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    // SECURITY: Validate inputs before sending
    if (!UUID_REGEX.test(advisorId)) {
      toast({
        title: "Invalid request",
        description: "Invalid advisor information.",
        variant: "destructive",
      });
      return;
    }

    // Validate slot ID is a valid UUID (for legacy slots)
    const isDynamicSlot = selectedSlot.id.startsWith("dynamic-");
    if (!isDynamicSlot && !UUID_REGEX.test(selectedSlot.id)) {
      toast({
        title: "Invalid request",
        description: "Invalid time slot selection.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const sessionDate = selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      // Note: Amount is fetched server-side for security - not sent from client
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          advisorId,
          slotId: isDynamicSlot ? null : selectedSlot.id, // Only send slotId for legacy slots
          slotStartTime: selectedSlot.startTime, // Always send start time
          slotEndTime: selectedSlot.endTime, // Always send end time
          sessionDate,
          sessionTime: selectedSlot.time,
          isDynamicSlot,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create checkout session");
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Booking failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Limit booking to 1 month in advance, disable past dates
  const maxDate = addMonths(new Date(), 1);
  const disabledDays = [
    { before: new Date() },
    { after: maxDate },
  ];

  const clientTzAbbr = getTimezoneAbbreviation(clientTimezone);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Book Consultation
          </DialogTitle>
          <DialogDescription>
            Select a date and time for your consultation with {advisorName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Timezone indicator */}
          <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-secondary/50 rounded-lg">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
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
            className={cn("p-3 pointer-events-auto mx-auto")}
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
                        "px-4 py-2 text-sm font-sans border transition-colors",
                        selectedSlot?.id === slot.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      )}
                    >
                      {slot.time}
                      {slot.isVirtual && (
                        <span className="text-xs ml-1 opacity-70">(Virtual)</span>
                      )}
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
            <div className="mt-6 p-4 bg-secondary border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-sans text-sm">Selected time</span>
                <span className="font-sans font-medium">{selectedSlot.time} ({clientTzAbbr})</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-sans text-sm">Consultation Fee</span>
                <span className="font-sans font-medium">${price}</span>
              </div>
              <Button 
                variant="hero" 
                className="w-full" 
                onClick={handleBooking}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : user ? (
                  "Proceed to Payment"
                ) : (
                  "Sign in to Book"
                )}
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground text-center mt-2">
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