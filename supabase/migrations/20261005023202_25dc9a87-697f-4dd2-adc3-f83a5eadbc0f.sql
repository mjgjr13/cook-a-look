-- Sample/test advisor updates requested by the owner (2026-10-05). Data only.
-- 1. Rates: James Whitaker $445/hour, Diane Holloway $85/hour.
-- 2. New headshots and portfolio photos for the sample profiles Maya Ellison,
--    Diane Holloway and Marcus Reed (CC0 photos hosted on www.cookalook.com;
--    see docs/IMAGE_CREDITS.md). James Whitaker's photos are unchanged.

UPDATE public.profiles SET price_per_session = 445, updated_at = now()
WHERE id = 'd5717c49-9c09-49d5-b2ee-34b138f6be04';

UPDATE public.profiles SET
  price_per_session = 85,
  avatar_url = 'https://www.cookalook.com/images/advisors/diane-holloway/headshot.webp',
  portfolio_images = ARRAY[
    'https://www.cookalook.com/images/advisors/diane-holloway/portfolio-1.webp',
    'https://www.cookalook.com/images/advisors/diane-holloway/portfolio-2.webp',
    'https://www.cookalook.com/images/advisors/diane-holloway/portfolio-3.webp',
    'https://www.cookalook.com/images/advisors/diane-holloway/portfolio-4.webp'],
  updated_at = now()
WHERE id = 'e7087720-24b1-4a9d-a750-67da5dbeaceb';

UPDATE public.profiles SET
  avatar_url = 'https://www.cookalook.com/images/advisors/maya-ellison/headshot.webp',
  portfolio_images = ARRAY[
    'https://www.cookalook.com/images/advisors/maya-ellison/portfolio-1.webp',
    'https://www.cookalook.com/images/advisors/maya-ellison/portfolio-2.webp',
    'https://www.cookalook.com/images/advisors/maya-ellison/portfolio-3.webp',
    'https://www.cookalook.com/images/advisors/maya-ellison/portfolio-4.webp'],
  updated_at = now()
WHERE id = 'efab14d9-20c3-4b5e-bb7b-38c8c9a3d548';

UPDATE public.profiles SET
  avatar_url = 'https://www.cookalook.com/images/advisors/marcus-reed/headshot.webp',
  portfolio_images = ARRAY[
    'https://www.cookalook.com/images/advisors/marcus-reed/portfolio-1.webp',
    'https://www.cookalook.com/images/advisors/marcus-reed/portfolio-2.webp',
    'https://www.cookalook.com/images/advisors/marcus-reed/portfolio-3.webp',
    'https://www.cookalook.com/images/advisors/marcus-reed/portfolio-4.webp'],
  updated_at = now()
WHERE id = '50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f';