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
      // Store booking intent and redirect to sign in
      sessionStorage.setItem('bookingIntent', JSON.stringify({
        advisorId,
        date: selectedDate?.toISOString(),
        slotId: selectedSlot?.id,
      }));
      toast({
        title: "Sign in required",
        description: "Please sign in to book a consultation.",
      });
      onClose();
      navigate("/signin?redirect=/advisors/" + advisorId);
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

    setIsLoading(true);

    // In production, this would create a booking and integrate with Stripe
    toast({
      title: "Booking confirmed!",
      description: `Your consultation with ${advisorName} is scheduled for ${format(selectedDate, "MMMM d, yyyy")} at ${selectedSlot.time}.`,
    });

    setIsLoading(false);
    onClose();
    setSelectedDate(undefined);
    setSelectedSlot(null);
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
                {isLoading ? "Processing..." : user ? "Proceed to Payment" : "Sign in to Book"}
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
