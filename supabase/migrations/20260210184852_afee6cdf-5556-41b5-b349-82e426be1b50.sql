-- Add explicit delete prevention to withdrawal_requests
CREATE POLICY "Withdrawals cannot be deleted"
ON public.withdrawal_requests FOR DELETE
USING (false);
