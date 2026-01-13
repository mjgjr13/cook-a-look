-- Create a function to seed demo advisor data
-- This function uses SECURITY DEFINER to insert demo data
-- The demo advisors will have NULL user_id initially, so we need to allow that

-- First, temporarily allow NULL user_id for demo data
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- Insert demo advisor profiles
INSERT INTO profiles (id, user_id, full_name, email, specialty, bio, personal_philosophy, rating, review_count, price_per_session, avatar_url, virtual_available, in_person_available, location, experience_years, languages, style_tags, target_demographics, is_advisor, advisor_approved, verified, instagram_url, portfolio_url)
VALUES 
  ('11111111-1111-1111-1111-111111111111', NULL, 'Marcus Chen', NULL, 'Menswear & Suiting', 'Expert in classic tailoring with a modern twist. 10+ years of experience styling executives and professionals.', 'Great style should be an extension of who you are—confident, capable, and authentic. I combine classic tailoring principles with contemporary trends.', 4.9, 127, 150, NULL, true, true, 'New York', 10, ARRAY['English', 'Mandarin'], ARRAY['Business', 'Formal', 'Classic'], ARRAY['Men', 'Executives', 'Young Professionals'], true, true, true, '@marcuschenestyle', 'marcuschenstyle.com'),
  
  ('22222222-2222-2222-2222-222222222222', NULL, 'Isabella Romano', NULL, 'Occasion Styling', 'Specializing in red carpet looks and special occasion styling. Former stylist for Vogue Italia.', 'My journey in fashion began on the streets of Milan. I bring European glamour to every consultation, helping you shine for galas, weddings, and special events.', 4.8, 89, 125, NULL, true, true, 'Los Angeles', 8, ARRAY['English', 'Italian', 'Spanish'], ARRAY['Formal', 'Contemporary', 'Classic'], ARRAY['Women', 'Executives'], true, true, true, '@isabellaromano_style', NULL),
  
  ('33333333-3333-3333-3333-333333333333', NULL, 'Amara Johnson', NULL, 'Streetwear & Contemporary', 'Blending high fashion with streetwear aesthetics. Featured in Complex and Hypebeast.', 'I am passionate about the intersection of high fashion and street culture. My philosophy is bold self-expression and breaking conventional fashion rules.', 5.0, 64, 175, NULL, true, false, 'Miami', 6, ARRAY['English'], ARRAY['Streetwear', 'Contemporary', 'Casual'], ARRAY['Men', 'Women', 'Non-Binary', 'Young Professionals'], true, true, true, '@amarajohnson', 'amarajohnson.style'),
  
  ('44444444-4444-4444-4444-444444444444', NULL, 'Sophie Laurent', NULL, 'Minimalist Wardrobe', 'Capsule wardrobe expert focused on sustainable and timeless pieces.', 'Less is more. I help clients build intentional wardrobes with pieces that transcend seasons and trends, focusing on quality and sustainability.', 4.7, 52, 100, NULL, true, false, 'San Francisco', 5, ARRAY['English', 'French'], ARRAY['Minimalist', 'Classic', 'Casual'], ARRAY['Women', 'Young Professionals', 'Students'], true, true, false, NULL, NULL),
  
  ('55555555-5555-5555-5555-555555555555', NULL, 'James Park', NULL, 'Business Casual', 'Helping professionals navigate the modern workplace dress code with confidence.', 'The modern workplace demands versatility. I specialize in helping professionals look polished whether in the boardroom or working remotely.', 4.9, 93, 140, NULL, true, true, 'Chicago', 7, ARRAY['English', 'Korean'], ARRAY['Business', 'Casual', 'Classic'], ARRAY['Men', 'Women', 'Young Professionals', 'Executives'], true, true, false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert availability slots for demo advisors for the next 14 days
-- Generate slots for each advisor at common times
INSERT INTO availability_slots (advisor_id, start_time, end_time, is_virtual, is_booked)
SELECT 
  advisor_id,
  slot_time,
  slot_time + interval '1 hour',
  true,
  false
FROM (
  SELECT 
    p.id as advisor_id,
    generate_series(
      date_trunc('day', now()) + interval '1 day' + (hour_offset || ' hours')::interval,
      date_trunc('day', now()) + interval '14 days' + (hour_offset || ' hours')::interval,
      interval '1 day'
    ) as slot_time
  FROM profiles p
  CROSS JOIN (VALUES (9), (10), (11), (14), (15), (16)) as hours(hour_offset)
  WHERE p.is_advisor = true AND p.advisor_approved = true
) as slots
WHERE EXTRACT(DOW FROM slot_time) NOT IN (0, 6) -- Exclude weekends
ON CONFLICT DO NOTHING;