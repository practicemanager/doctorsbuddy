
-- 1. Create a safe view for google_integrations (no tokens)
CREATE OR REPLACE VIEW public.google_integrations_safe AS
SELECT id, clinic_id, connected_email, sync_enabled, last_sync_at, calendar_id, created_at, updated_at
FROM public.google_integrations;

-- 2. Revoke direct SELECT on sensitive columns from anon and authenticated
-- We do this by dropping the existing SELECT policy and recreating it to exclude token columns
-- Actually, column-level REVOKE is more appropriate:
REVOKE SELECT ON public.google_integrations FROM anon;

-- Drop the existing permissive SELECT policy and replace with one that excludes token columns
-- We can't do column-level RLS, so instead we revoke SELECT from authenticated on token columns
-- and grant SELECT only on safe columns.
-- Approach: revoke all SELECT from authenticated, then grant only on safe columns
REVOKE SELECT ON public.google_integrations FROM authenticated;
GRANT SELECT (id, clinic_id, connected_email, sync_enabled, last_sync_at, calendar_id, token_expires_at, created_at, updated_at) ON public.google_integrations TO authenticated;

-- 3. Fix anonymous patient insert - require valid clinic_id
DROP POLICY IF EXISTS "Public patient self-registration" ON public.patients;
CREATE POLICY "Public patient self-registration"
ON public.patients
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id)
);

-- 4. Fix anonymous queue token insert - require valid clinic_id
DROP POLICY IF EXISTS "Public queue token creation" ON public.queue_tokens;
CREATE POLICY "Public queue token creation"
ON public.queue_tokens
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id)
);

-- 5. Grant anon SELECT on clinics so the above EXISTS checks work
-- (anon needs to verify clinic exists; this is a minimal read)
CREATE POLICY "Anon can verify clinic exists"
ON public.clinics
FOR SELECT
TO anon
USING (true);
