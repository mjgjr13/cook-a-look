/**
 * Whether a booking is a video session. `bookings.meeting_type` is the source
 * of truth (it's what create-video-room checks); older bookings without it
 * fall back to the slot's is_virtual flag.
 */
export const isVirtualBooking = (booking: {
  meeting_type?: string | null;
  slot?: { is_virtual?: boolean | null } | null;
}): boolean =>
  booking.meeting_type ? booking.meeting_type !== "in_person" : booking.slot?.is_virtual !== false;

/** Video rooms open this many minutes before the session (see supabase/functions/_shared/daily.ts nbf). */
export const JOIN_WINDOW_MINUTES = 15;

/** True once the video room is open (15 min before start). */
export const isJoinWindowOpen = (startTime: string, now: Date = new Date()): boolean =>
  new Date(startTime).getTime() - JOIN_WINDOW_MINUTES * 60 * 1000 <= now.getTime();

/** e.g. "Opens Oct 6, 9:45 AM" - when the Join button becomes available. */
export const joinOpensLabel = (startTime: string): string => {
  const opens = new Date(new Date(startTime).getTime() - JOIN_WINDOW_MINUTES * 60 * 1000);
  const sameDay = opens.toDateString() === new Date().toDateString();
  const time = opens.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Opens at ${time}` : `Opens ${opens.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
};
