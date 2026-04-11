
DROP VIEW IF EXISTS public.google_integrations_safe;
CREATE VIEW public.google_integrations_safe
WITH (security_invoker = true) AS
SELECT id, clinic_id, connected_email, sync_enabled, last_sync_at, calendar_id, created_at, updated_at
FROM public.google_integrations;
