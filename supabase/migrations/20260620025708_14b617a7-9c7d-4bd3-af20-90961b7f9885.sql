REVOKE EXECUTE ON FUNCTION public.restrict_booking_participant_updates() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking_with_refund(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_with_refund(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.advisor_respond_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advisor_respond_booking(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.respond_location_proposal(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_location_proposal(uuid, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_override_refund(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_override_refund(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_refund(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_refund(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_refund_result(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_refund_result(uuid, text, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_due_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_due_bookings() TO service_role;

REVOKE EXECUTE ON FUNCTION public.confirm_paid_booking(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_booking(uuid, uuid) TO service_role;