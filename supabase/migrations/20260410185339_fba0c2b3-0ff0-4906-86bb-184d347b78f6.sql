
-- Add social/GMB fields to clinics
ALTER TABLE public.clinics
  ADD COLUMN website TEXT,
  ADD COLUMN google_maps_url TEXT,
  ADD COLUMN facebook_url TEXT,
  ADD COLUMN instagram_url TEXT,
  ADD COLUMN twitter_url TEXT,
  ADD COLUMN tiktok_url TEXT;

-- Vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic vendors" ON public.vendors FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can create clinic vendors" ON public.vendors FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can update clinic vendors" ON public.vendors FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can delete clinic vendors" ON public.vendors FOR DELETE USING (clinic_id = public.get_user_clinic_id());

CREATE INDEX idx_vendors_clinic ON public.vendors(clinic_id);

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
