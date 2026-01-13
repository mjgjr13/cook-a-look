-- Create a SECURITY DEFINER function to get public featured advisors (excluding payment details)
CREATE OR REPLACE FUNCTION public.get_public_featured_advisors()
RETURNS TABLE (
  id uuid,
  advisor_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fa.id,
    fa.advisor_id,
    fa.start_date,
    fa.end_date,
    fa.created_at
  FROM featured_advisors fa
  WHERE fa.payment_status = 'completed'
    AND fa.start_date <= now()
    AND fa.end_date > now();
$$;

-- Grant execute to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_featured_advisors() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_featured_advisors() TO authenticated;

-- Create a view that wraps the function for easy querying
CREATE OR REPLACE VIEW public.public_featured_advisors 
WITH (security_invoker = false)
AS SELECT * FROM public.get_public_featured_advisors();

-- Grant select on the view
GRANT SELECT ON public.public_featured_advisors TO anon;
GRANT SELECT ON public.public_featured_advisors TO authenticated;