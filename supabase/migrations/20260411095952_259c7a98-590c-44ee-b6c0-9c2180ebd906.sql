
-- Create a function to check clinic existence (bypasses RLS)
CREATE OR REPLACE FUNCTION public.clinic_exists(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinics WHERE id = p_clinic_id);
$$;

-- Fix anon patient self-registration
DROP POLICY IF EXISTS "Public patient self-registration" ON public.patients;
CREATE POLICY "Public patient self-registration"
ON public.patients
FOR INSERT
TO anon
WITH CHECK (public.clinic_exists(clinic_id));

-- Fix authenticated patient self-registration
DROP POLICY IF EXISTS "Authenticated patient self-registration" ON public.patients;
CREATE POLICY "Authenticated patient self-registration"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (public.clinic_exists(clinic_id));

-- Fix anon queue token
DROP POLICY IF EXISTS "Public queue token creation" ON public.queue_tokens;
CREATE POLICY "Public queue token creation"
ON public.queue_tokens
FOR INSERT
TO anon
WITH CHECK (public.clinic_exists(clinic_id));

-- Fix authenticated queue token
DROP POLICY IF EXISTS "Authenticated queue token self-registration" ON public.queue_tokens;
CREATE POLICY "Authenticated queue token self-registration"
ON public.queue_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.clinic_exists(clinic_id));
