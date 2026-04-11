
-- Prescriptions table for visit-level data
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id),
  chief_complaint TEXT,
  gum_condition TEXT DEFAULT 'normal',
  alignment_condition TEXT DEFAULT 'normal',
  medications JSONB DEFAULT '[]'::jsonb,
  diagnosis_notes TEXT,
  treatment_plan TEXT,
  doctor_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  chart_type TEXT NOT NULL DEFAULT 'adult',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic prescriptions" ON public.prescriptions FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic prescriptions" ON public.prescriptions FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic prescriptions" ON public.prescriptions FOR DELETE USING (clinic_id = get_user_clinic_id());

-- Prescription items - per-tooth findings in a single entry
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  condition TEXT,
  treatment TEXT,
  treatment_status TEXT DEFAULT 'planned',
  cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prescription items" ON public.prescription_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.prescriptions WHERE prescriptions.id = prescription_items.prescription_id AND prescriptions.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can create prescription items" ON public.prescription_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.prescriptions WHERE prescriptions.id = prescription_items.prescription_id AND prescriptions.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can update prescription items" ON public.prescription_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.prescriptions WHERE prescriptions.id = prescription_items.prescription_id AND prescriptions.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can delete prescription items" ON public.prescription_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.prescriptions WHERE prescriptions.id = prescription_items.prescription_id AND prescriptions.clinic_id = get_user_clinic_id()));
