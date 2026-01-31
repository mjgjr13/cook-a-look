-- Create advisor_reviews table
CREATE TABLE public.advisor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id) -- One review per booking
);

-- Create index for faster lookups
CREATE INDEX idx_advisor_reviews_advisor_id ON public.advisor_reviews(advisor_id);
CREATE INDEX idx_advisor_reviews_client_id ON public.advisor_reviews(client_id);

-- Enable RLS
ALTER TABLE public.advisor_reviews ENABLE ROW LEVEL SECURITY;

-- Function to check if user can leave review (must be the client who booked, and booking must be completed)
CREATE OR REPLACE FUNCTION public.can_leave_review(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN profiles p ON p.id = b.client_id
    JOIN availability_slots s ON s.id = b.slot_id
    WHERE b.id = _booking_id
    AND p.user_id = _user_id
    AND b.status = 'confirmed'
    AND s.end_time < now() -- Session must have ended
  )
$$;

-- Clients can insert reviews for their completed bookings (one per booking)
CREATE POLICY "Clients can create reviews for their bookings" ON public.advisor_reviews
FOR INSERT TO authenticated
WITH CHECK (
  public.can_leave_review(booking_id, auth.uid())
  AND NOT EXISTS (SELECT 1 FROM advisor_reviews WHERE booking_id = advisor_reviews.booking_id)
);

-- Anyone can view published reviews
CREATE POLICY "Anyone can view reviews" ON public.advisor_reviews
FOR SELECT USING (true);

-- Clients can update their own reviews
CREATE POLICY "Clients can update their own reviews" ON public.advisor_reviews
FOR UPDATE TO authenticated
USING (client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Reviews cannot be deleted
CREATE POLICY "Reviews cannot be deleted" ON public.advisor_reviews
FOR DELETE USING (false);

-- Function to update advisor rating when a review is added
CREATE OR REPLACE FUNCTION public.update_advisor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    rating = (
      SELECT COALESCE(AVG(rating)::numeric(2,1), 0)
      FROM advisor_reviews
      WHERE advisor_id = NEW.advisor_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM advisor_reviews
      WHERE advisor_id = NEW.advisor_id
    ),
    updated_at = now()
  WHERE id = NEW.advisor_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update advisor rating
CREATE TRIGGER trigger_update_advisor_rating
AFTER INSERT OR UPDATE ON public.advisor_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_advisor_rating();