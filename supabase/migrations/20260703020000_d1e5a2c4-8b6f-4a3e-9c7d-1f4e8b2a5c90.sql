-- Fix typo in Johnny Test's (demo advisor) location: "Los Angles, CA" -> "Los Angeles, CA".
UPDATE public.profiles
SET location = 'Los Angeles, CA', updated_at = now()
WHERE id = 'd5717c49-9c09-49d5-b2ee-34b138f6be04'
  AND location = 'Los Angles, CA';
