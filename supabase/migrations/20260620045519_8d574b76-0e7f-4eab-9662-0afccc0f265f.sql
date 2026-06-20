CREATE OR REPLACE FUNCTION public.can_leave_review(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p ON p.id = b.client_id
    JOIN availability_slots s ON s.id = b.slot_id
    WHERE b.id = _booking_id
      AND p.user_id = _user_id
      AND b.status IN ('confirmed', 'completed')
      AND s.end_time < now()
  )
$function$;