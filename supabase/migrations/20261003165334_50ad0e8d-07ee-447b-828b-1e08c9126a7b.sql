-- Launch prep (2026-10-03). Additive only: one new table + data updates to the
-- four existing demo advisor profiles. No columns or tables are dropped.
--
-- 1. booking_waitlist: stores emails from visitors who try to book a sample
--    advisor ("We're onboarding our first advisors - join the waitlist").
-- 2. Marks the four demo/test advisors as is_demo = true and gives them
--    polished sample copy (names/bios/specialties). Rates are NOT changed.
-- 3. Re-runs the review-count backfill from 20260703000000 so no profile shows
--    a rating/review count that isn't backed by real advisor_reviews rows.
--
-- The prevent_profile_privilege_escalation_trg trigger blocks changes to
-- is_demo/rating/review_count unless the caller is an admin or service_role,
-- which a migration session is not. It is disabled only for the duration of
-- this transaction and re-enabled immediately after.

-- 1. Waitlist table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text CHECK (name IS NULL OR char_length(name) <= 100),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  advisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'sample_advisor' CHECK (char_length(source) <= 50),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join the booking waitlist" ON public.booking_waitlist;
CREATE POLICY "Anyone can join the booking waitlist"
  ON public.booking_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view the booking waitlist" ON public.booking_waitlist;
CREATE POLICY "Admins can view the booking waitlist"
  ON public.booking_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.booking_waitlist TO anon, authenticated;
GRANT SELECT ON public.booking_waitlist TO authenticated;

-- 2 + 3. Profile data updates ----------------------------------------------
ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_privilege_escalation_trg;

UPDATE public.profiles SET
  is_demo = true,
  full_name = 'James Whitaker',
  specialty = 'Menswear & Tailoring',
  bio = 'Menswear stylist focused on tailoring, fit, and building a wardrobe that works from the office to the weekend.',
  personal_philosophy = 'Great style starts with fit. In our session I''ll look at what you already own, show you what to keep, what to tailor, and what to add - so getting dressed takes five minutes and you look sharp every time. I specialize in suiting, smart-casual for modern offices, and event dressing for weddings and black-tie.',
  experience_years = 8,
  style_tags = ARRAY['Tailoring','Business','Smart Casual','Formal Events'],
  target_demographics = ARRAY['Men','Professionals'],
  instagram_url = NULL,
  portfolio_url = NULL,
  updated_at = now()
WHERE id = 'd5717c49-9c09-49d5-b2ee-34b138f6be04';

UPDATE public.profiles SET
  is_demo = true,
  full_name = 'Maya Ellison',
  specialty = 'Womenswear & Menswear',
  bio = 'New York stylist helping clients define a signature look with pieces they''ll actually wear.',
  personal_philosophy = 'I believe your wardrobe should feel like you on your best day. Together we''ll pin down your style words, sort what''s working in your closet, and put together a short, realistic shopping list. I love mixing classic staples with one or two statement pieces, and I work with every budget.',
  experience_years = 5,
  style_tags = ARRAY['Everyday Style','Wardrobe Edit','Smart Casual','Date Night'],
  target_demographics = ARRAY['Women','Men'],
  instagram_url = NULL,
  portfolio_url = NULL,
  updated_at = now()
WHERE id = 'efab14d9-20c3-4b5e-bb7b-38c8c9a3d548';

UPDATE public.profiles SET
  is_demo = true,
  full_name = 'Diane Holloway',
  specialty = 'Executive & Workwear',
  bio = 'Executive image consultant helping leaders dress with confidence for boardrooms, conferences, and on-camera moments.',
  personal_philosophy = 'What you wear speaks before you do. I help professionals build polished, comfortable workwear that fits their role and their personality - from a capsule for a new position to a look for a keynote or video interview. Expect practical advice, honest feedback, and a plan you can follow.',
  experience_years = 15,
  style_tags = ARRAY['Workwear','Executive Presence','Capsule Wardrobe','On-Camera'],
  target_demographics = ARRAY['Women','Professionals'],
  instagram_url = NULL,
  portfolio_url = NULL,
  updated_at = now()
WHERE id = 'e7087720-24b1-4a9d-a750-67da5dbeaceb';

UPDATE public.profiles SET
  is_demo = true,
  full_name = 'Marcus Reed',
  specialty = 'Business Attire',
  bio = 'Tokyo-based stylist specializing in modern business attire and travel-ready wardrobes for busy professionals.',
  personal_philosophy = 'Your clothes should work as hard as you do. I focus on versatile, well-fitted pieces that mix and match, pack easily, and look right in any city. In our session we''ll build outfits around your schedule and make a plan for the few pieces that will make the biggest difference.',
  experience_years = 10,
  style_tags = ARRAY['Business','Travel Wardrobe','Tailoring','Minimalist'],
  target_demographics = ARRAY['Men','Professionals'],
  instagram_url = NULL,
  portfolio_url = NULL,
  updated_at = now()
WHERE id = '50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f';

-- Review-count backfill (same as 20260703000000; idempotent).
UPDATE public.profiles p
SET
  rating = (
    SELECT COALESCE(AVG(r.rating)::numeric(2,1), 0)
    FROM public.advisor_reviews r
    WHERE r.advisor_id = p.id
  ),
  review_count = (
    SELECT COUNT(*)
    FROM public.advisor_reviews r
    WHERE r.advisor_id = p.id
  ),
  updated_at = now()
WHERE p.is_advisor = true;

ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_privilege_escalation_trg;