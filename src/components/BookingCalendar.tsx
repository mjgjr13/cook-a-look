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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BookingCalendarProps {
  advisorId: string;
  advisorName: string;
  price: number;
  isOpen: boolean;
  onClose: () => void;
  mode: "availability" | "booking";
}

interface TimeSlot {
  id: string;
  time: string;
  isVirtual: boolean;
  startTime: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BookingCalendar = ({
  advisorId,
  advisorName,
  price,
  isOpen,
  onClose,
  mode,
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
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

  // Fetch real availability slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !advisorId || !UUID_REGEX.test(advisorId)) {
        setTimeSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      setSelectedSlot(null);

      try {
        // Get start and end of selected day in ISO format
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('availability_slots')
          .select('id, start_time, end_time, is_virtual')
          .eq('advisor_id', advisorId)
          .eq('is_booked', false)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time');

        if (error) {
          console.error('Error fetching slots:', error);
          setTimeSlots([]);
          return;
        }

        if (data && data.length > 0) {
          const formattedSlots: TimeSlot[] = data.map((slot) => ({
            id: slot.id,
            time: new Date(slot.start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            isVirtual: slot.is_virtual ?? true,
            startTime: slot.start_time,
          }));
          setTimeSlots(formattedSlots);
        } else {
          setTimeSlots([]);
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, advisorId]);

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

    // Validate slot ID is a valid UUID
    if (!UUID_REGEX.test(selectedSlot.id)) {
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
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          advisorId,
          slotId: selectedSlot.id,
          sessionDate,
          sessionTime: selectedSlot.time,
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

  // Only disable past dates - allow any future date including weekends
  const disabledDays = [
    { before: new Date() },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {mode === "availability" ? "Check Availability" : "Book Consultation"}
          </DialogTitle>
          <DialogDescription>
            {mode === "availability" 
              ? `View available time slots with ${advisorName}`
              : `Select a date and time for your consultation with ${advisorName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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

          {mode === "booking" && selectedDate && selectedSlot && (
            <div className="mt-6 p-4 bg-secondary border border-border">
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

          {mode === "availability" && selectedDate && selectedSlot && (
            <div className="mt-6">
              <Button 
                variant="hero" 
                className="w-full"
                onClick={() => {
                  onClose();
                  // Trigger booking mode
                }}
              >
                Book This Time
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendar;