-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Advisors can manage their featured status" ON featured_advisors;
DROP POLICY IF EXISTS "Featured advisors visible to everyone" ON featured_advisors;

-- Create proper INSERT policy for featured_advisors
CREATE POLICY "Advisors can insert featured requests"
ON featured_advisors FOR INSERT
TO authenticated
WITH CHECK (advisor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create SELECT policy (public visibility)
CREATE POLICY "Featured advisors visible to everyone"
ON featured_advisors FOR SELECT
USING (true);

-- Add booking cancellation policy
CREATE POLICY "Users can cancel pending bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  client_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND status = 'pending'
);

-- Create a user_roles table for proper role management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Only admins can manage user roles
CREATE POLICY "Admins can manage user roles"
ON user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());