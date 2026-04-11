
-- Store Google OAuth tokens per clinic
CREATE TABLE public.google_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  connected_email TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id)
);

ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinic google integration"
  ON public.google_integrations FOR SELECT TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Users can insert their clinic google integration"
  ON public.google_integrations FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Users can update their clinic google integration"
  ON public.google_integrations FOR UPDATE TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Users can delete their clinic google integration"
  ON public.google_integrations FOR DELETE TO authenticated
  USING (clinic_id = public.get_user_clinic_id());

-- Track sync status for individual appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_sync_status TEXT DEFAULT 'pending';
