ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_hours integer NOT NULL DEFAULT 1
  CHECK (duration_hours BETWEEN 1 AND 3);