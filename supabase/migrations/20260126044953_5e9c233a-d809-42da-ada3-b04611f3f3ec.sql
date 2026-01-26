-- ============================================================
-- COMPREHENSIVE PLATFORM MIGRATION
-- Covers: Categories, Escrow, Disputes, Recording, Onboarding
-- ============================================================

-- 1. LOOKBOOK CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lookbook_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with existing categories
INSERT INTO public.lookbook_categories (name, display_order) VALUES
  ('Business', 1),
  ('Casual', 2),
  ('Evening', 3),
  ('Streetwear', 4),
  ('Formal', 5),
  ('Athletic', 6)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.lookbook_categories ENABLE ROW LEVEL SECURITY;

-- Public can read active categories
CREATE POLICY "Public can view active categories"
  ON public.lookbook_categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories (using has_role function)
CREATE POLICY "Admins can manage categories"
  ON public.lookbook_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. ESCROW FIELDS ON PAYMENTS TABLE
-- ============================================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'held';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS escrow_release_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS meeting_started_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- 3. DISPUTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  raised_by UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can see disputes they raised
CREATE POLICY "Users can view their own disputes"
  ON public.disputes FOR SELECT
  USING (raised_by = auth.uid());

-- Users can create disputes for their own bookings
CREATE POLICY "Users can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

-- Admins can view and manage all disputes
CREATE POLICY "Admins can manage all disputes"
  ON public.disputes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. VIDEO SESSIONS - RECORDING FIELDS
-- ============================================================
ALTER TABLE public.video_sessions ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.video_sessions ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'pending';

-- 5. PROFILES - ONBOARDING ACKNOWLEDGMENT
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_acknowledged_at TIMESTAMPTZ;

-- 6. PROFILES - ADVISOR STATUS FIELD (for admin management)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS advisor_status TEXT DEFAULT 'pending';

-- 7. Update comment for escrow_status allowed values
COMMENT ON COLUMN public.payments.escrow_status IS 'Values: held, released, disputed, refunded';
COMMENT ON COLUMN public.disputes.status IS 'Values: open, under_review, resolved_client, resolved_advisor, closed';
COMMENT ON COLUMN public.profiles.advisor_status IS 'Values: pending, approved, suspended, rejected';