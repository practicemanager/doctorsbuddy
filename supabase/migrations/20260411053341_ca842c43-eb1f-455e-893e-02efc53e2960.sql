
CREATE TABLE public.treatment_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_name TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  doctor_fee NUMERIC NOT NULL DEFAULT 0,
  lab_cost NUMERIC NOT NULL DEFAULT 0,
  other_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, treatment_name)
);

ALTER TABLE public.treatment_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic pricing" ON public.treatment_pricing FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic pricing" ON public.treatment_pricing FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic pricing" ON public.treatment_pricing FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic pricing" ON public.treatment_pricing FOR DELETE USING (clinic_id = get_user_clinic_id());

CREATE TRIGGER update_treatment_pricing_updated_at BEFORE UPDATE ON public.treatment_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
