import { useEffect, useState } from "react";
import { Video } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { isJoinWindowOpen, joinOpensLabel, JOIN_WINDOW_MINUTES } from "@/lib/bookingUtils";

interface Props extends Omit<ButtonProps, "onClick"> {
  startTime: string;
  label?: string;
  onJoin: () => void;
}

/**
 * Join/Start Call button that stays disabled until the video room opens
 * (15 minutes before the session), showing when it will open instead of
 * letting people click into a "room not available yet" error.
 */
const JoinCallButton = ({ startTime, label = "Join Call", onJoin, ...props }: Props) => {
  const [open, setOpen] = useState(() => isJoinWindowOpen(startTime));

  useEffect(() => {
    if (open) return;
    const id = setInterval(() => setOpen(isJoinWindowOpen(startTime)), 30_000);
    return () => clearInterval(id);
  }, [open, startTime]);

  return (
    <Button
      {...props}
      onClick={onJoin}
      disabled={!open || props.disabled}
      title={open ? undefined : `The video room opens ${JOIN_WINDOW_MINUTES} minutes before your session`}
    >
      <Video className="w-4 h-4 mr-1" aria-hidden="true" />
      {open ? label : joinOpensLabel(startTime)}
    </Button>
  );
};

export default JoinCallButton;
