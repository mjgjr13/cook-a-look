import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import VideoCall from "@/components/VideoCall";

interface JoinConsultationButtonProps {
  bookingId: string;
  slotStart: string | Date;
  slotEnd: string | Date;
  advisorId?: string;
  clientId?: string;
  advisorName?: string;
  isClient?: boolean;
  className?: string;
}

// Visible from T-15min through T+90min of the scheduled slot.
const PRE_WINDOW_MS = 15 * 60 * 1000;
const POST_WINDOW_MS = 90 * 60 * 1000;

const JoinConsultationButton = ({
  bookingId,
  slotStart,
  slotEnd,
  advisorId,
  clientId,
  advisorName,
  isClient,
  className,
}: JoinConsultationButtonProps) => {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const start = useMemo(() => new Date(slotStart).getTime(), [slotStart]);
  const end = useMemo(() => new Date(slotEnd).getTime(), [slotEnd]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const opensAt = start - PRE_WINDOW_MS;
  const closesAt = end + POST_WINDOW_MS;
  if (now < opensAt || now > closesAt) return null;

  return (
    <>
      <Button
        variant="hero"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Video className="w-4 h-4 mr-2" />
        Join Consultation
      </Button>
      {open && (
        <VideoCall
          bookingId={bookingId}
          onClose={() => setOpen(false)}
          advisorId={advisorId}
          clientId={clientId}
          advisorName={advisorName}
          isClient={isClient}
        />
      )}
    </>
  );
};

export default JoinConsultationButton;
