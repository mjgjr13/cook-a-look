GRANT SELECT, INSERT, UPDATE ON public.advisor_reviews TO authenticated;
GRANT SELECT ON public.advisor_reviews TO anon;
GRANT ALL ON public.advisor_reviews TO service_role;