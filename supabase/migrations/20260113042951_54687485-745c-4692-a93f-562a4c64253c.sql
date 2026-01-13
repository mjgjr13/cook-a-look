-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update demo advisors with placeholder avatar URLs (using UI Avatars service)
UPDATE profiles SET avatar_url = 'https://ui-avatars.com/api/?name=Marcus+Chen&background=C9A961&color=1A1A1A&size=400&bold=true'
WHERE full_name = 'Marcus Chen';

UPDATE profiles SET avatar_url = 'https://ui-avatars.com/api/?name=Isabella+Romano&background=C9A961&color=1A1A1A&size=400&bold=true'
WHERE full_name = 'Isabella Romano';

UPDATE profiles SET avatar_url = 'https://ui-avatars.com/api/?name=Amara+Johnson&background=C9A961&color=1A1A1A&size=400&bold=true'
WHERE full_name = 'Amara Johnson';

UPDATE profiles SET avatar_url = 'https://ui-avatars.com/api/?name=Sophie+Laurent&background=C9A961&color=1A1A1A&size=400&bold=true'
WHERE full_name = 'Sophie Laurent';

UPDATE profiles SET avatar_url = 'https://ui-avatars.com/api/?name=James+Park&background=C9A961&color=1A1A1A&size=400&bold=true'
WHERE full_name = 'James Park';

-- Insert featured advisor records for demo advisors
INSERT INTO featured_advisors (advisor_id, start_date, end_date, payment_status, amount_paid)
SELECT id, now(), now() + interval '30 days', 'completed', 9900
FROM profiles 
WHERE full_name IN ('Marcus Chen', 'Isabella Romano', 'Amara Johnson', 'Sophie Laurent')
AND is_advisor = true;