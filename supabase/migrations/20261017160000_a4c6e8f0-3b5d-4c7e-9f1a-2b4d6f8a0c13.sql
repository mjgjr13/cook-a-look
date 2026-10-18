-- Owner request (2026-10-17): swap the profile photos of James Whitaker and
-- Marcus Reed, and move Marcus Reed's listed city from Tokyo to Melbourne.
-- Data-only change; no schema changes.
--   James Whitaker: profile with user_id 0047d08c-9d96-4016-ae37-603f03526010
--   Marcus Reed (sample profile): profile id 50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f
-- Photo URLs are set explicitly (the first version of this script matched James
-- by profile id, which is not his user id, and left Marcus without a photo).

-- James gets Marcus's original photo
UPDATE public.profiles
SET avatar_url = 'https://qdpqfsqjtbvlulekfhoy.supabase.co/storage/v1/object/public/avatars/samples/50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f/avatar-2026-10-17.jpg'
WHERE user_id = '0047d08c-9d96-4016-ae37-603f03526010'::uuid;

-- Marcus gets James's original photo, and moves to Melbourne
UPDATE public.profiles
SET avatar_url = 'https://qdpqfsqjtbvlulekfhoy.supabase.co/storage/v1/object/public/avatars/0047d08c-9d96-4016-ae37-603f03526010/avatar_1792254477341.jpg',
    location = 'Melbourne, Australia',
    bio = 'Melbourne-based stylist specializing in modern business attire and travel-ready wardrobes for busy professionals.'
WHERE id = '50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f'::uuid;

-- Check: should show 2 rows. James -> .../samples/50ed9a7f..., Marcus -> .../0047d08c...
SELECT full_name, location, avatar_url
FROM public.profiles
WHERE user_id = '0047d08c-9d96-4016-ae37-603f03526010'::uuid
   OR id = '50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f'::uuid;
