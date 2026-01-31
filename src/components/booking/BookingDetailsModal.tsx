import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, MapPin, User } from "lucide-react";
import { format } from "date-fns";

interface BookingParticipant {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  specialty?: string | null;
}

interface BookingSlot {
  start_time: string;
  end_time: string;
  is_virtual: boolean;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    status: string;
    created_at: string;
    slot: BookingSlot;
    client?: BookingParticipant;
    advisor?: BookingParticipant;
  } | null;
  userRole: "client" | "advisor" | "admin";
  onJoinCall?: (bookingId: string) => void;
}

const BookingDetailsModal = ({
  isOpen,
  onClose,
  booking,
  userRole,
  onJoinCall,
}: BookingDetailsModalProps) => {
  if (!booking) return null;

  const startTime = new Date(booking.slot.start_time);
  const isPast = startTime <= new Date();
  const isUpcoming = booking.status === "confirmed" && !isPast;
  const canJoinCall = isUpcoming && booking.slot.is_virtual && onJoinCall;

  const otherParticipant = userRole === "client" ? booking.advisor : booking.client;
  const participantLabel = userRole === "client" ? "Advisor" : "Client";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Session Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                booking.status === "cancelled"
                  ? "destructive"
                  : isPast
                  ? "secondary"
                  : "default"
              }
              className={booking.status === "confirmed" && !isPast ? "bg-primary" : ""}
            >
              {booking.status === "cancelled"
                ? "Cancelled"
                : isPast
                ? "Completed"
                : "Confirmed"}
            </Badge>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span>
                {format(startTime, "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span>
                {format(startTime, "h:mm a")} -{" "}
                {format(new Date(booking.slot.end_time), "h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {booking.slot.is_virtual ? (
                <>
                  <Video className="w-5 h-5 text-muted-foreground" />
                  <span>Virtual Session</span>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span>In-Person Session</span>
                </>
              )}
            </div>
          </div>

          {/* Participant Info */}
          {otherParticipant && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">{participantLabel}</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherParticipant.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {otherParticipant.full_name || "Unknown"}
                  </p>
                  {otherParticipant.specialty && (
                    <p className="text-sm text-muted-foreground">
                      {otherParticipant.specialty}
                    </p>
                  )}
                  {otherParticipant.email && userRole === "advisor" && (
                    <p className="text-sm text-muted-foreground">
                      {otherParticipant.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin view: show both parties */}
          {userRole === "admin" && booking.client && booking.advisor && (
            <div className="border-t pt-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.client.avatar_url || undefined} />
                    <AvatarFallback>
                      {(booking.client.full_name || "C").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {booking.client.full_name || "Unknown Client"}
                    </p>
                    {booking.client.email && (
                      <p className="text-xs text-muted-foreground">
                        {booking.client.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Advisor</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.advisor.avatar_url || undefined} />
                    <AvatarFallback>
                      {(booking.advisor.full_name || "A").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {booking.advisor.full_name || "Unknown Advisor"}
                    </p>
                    {booking.advisor.specialty && (
                      <p className="text-xs text-muted-foreground">
                        {booking.advisor.specialty}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-4 flex gap-3">
            {canJoinCall && (
              <Button
                variant="hero"
                className="flex-1"
                onClick={() => {
                  onJoinCall(booking.id);
                  onClose();
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                {userRole === "advisor" ? "Start Call" : "Join Call"}
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className={canJoinCall ? "" : "flex-1"}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsModal;
