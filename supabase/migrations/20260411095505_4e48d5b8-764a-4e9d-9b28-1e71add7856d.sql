
-- 1. Fix clinics anon SELECT: drop the overly permissive policy
DROP POLICY IF EXISTS "Anon can verify clinic exists" ON public.clinics;

-- Create a minimal view for anon clinic verification (only id and name)
CREATE OR REPLACE VIEW public.clinics_public
WITH (security_invoker = false) AS
SELECT id, name FROM public.clinics;

-- Grant anon SELECT on the view only
GRANT SELECT ON public.clinics_public TO anon;

-- Update the patients anon INSERT policy to use the view for validation
DROP POLICY IF EXISTS "Public patient self-registration" ON public.patients;
CREATE POLICY "Public patient self-registration"
ON public.patients
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics_public WHERE id = clinic_id)
);

-- Update the queue_tokens anon INSERT policy to use the view for validation
DROP POLICY IF EXISTS "Public queue token creation" ON public.queue_tokens;
CREATE POLICY "Public queue token creation"
ON public.queue_tokens
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics_public WHERE id = clinic_id)
);

-- 2. Fix profiles INSERT: enforce safe default role and null clinic_id on insert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND role = 'receptionist'
  AND clinic_id IS NULL
);
