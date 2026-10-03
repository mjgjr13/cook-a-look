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
