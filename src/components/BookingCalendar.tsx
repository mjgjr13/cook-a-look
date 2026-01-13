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
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock time slots - in production, fetch from availability_slots table
  const timeSlots: TimeSlot[] = [
    { id: "1", time: "9:00 AM", isVirtual: true },
    { id: "2", time: "10:30 AM", isVirtual: true },
    { id: "3", time: "1:00 PM", isVirtual: true },
    { id: "4", time: "2:30 PM", isVirtual: false },
    { id: "5", time: "4:00 PM", isVirtual: true },
  ];

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

  const disabledDays = [
    { before: new Date() },
    { dayOfWeek: [0, 6] }, // Disable weekends
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

          {mode === "availability" && (
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
