-- Restore the original sample-advisor photos (owner request, 2026-10-05).
-- Reverts the photo part of 20261005000000; rates are unchanged.
-- Original headshots are the files still in the avatars bucket; these
-- profiles had no portfolio images before (the site shows its built-in
-- inspiration images when the list is empty).

UPDATE public.profiles SET avatar_url = 'https://chjmyzzczwattluqpbat.supabase.co/storage/v1/object/public/avatars/44e6739a-d2a0-4531-99a6-e8b827e50e80/avatar_1769895319196.png', portfolio_images = '{}', updated_at = now()
WHERE id = 'e7087720-24b1-4a9d-a750-67da5dbeaceb'; -- Diane Holloway

UPDATE public.profiles SET avatar_url = 'https://chjmyzzczwattluqpbat.supabase.co/storage/v1/object/public/avatars/d536b1a5-f9a7-481b-bbb1-643fdc41797e/avatar_1769672222603.png', portfolio_images = '{}', updated_at = now()
WHERE id = 'efab14d9-20c3-4b5e-bb7b-38c8c9a3d548'; -- Maya Ellison

UPDATE public.profiles SET avatar_url = 'https://chjmyzzczwattluqpbat.supabase.co/storage/v1/object/public/avatars/779e519b-9207-4c65-8504-c17aefa45b81/avatar_1769672058663.png', portfolio_images = '{}', updated_at = now()
WHERE id = '50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f'; -- Marcus Reed