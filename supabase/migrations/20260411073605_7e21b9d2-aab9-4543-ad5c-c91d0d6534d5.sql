
-- Create patient medical history table
CREATE TABLE public.patient_medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  blood_group TEXT,
  allergies TEXT[] DEFAULT '{}',
  medical_conditions TEXT[] DEFAULT '{}',
  current_medications TEXT[] DEFAULT '{}',
  pregnancy_status TEXT DEFAULT 'not_applicable',
  smoking_habits TEXT DEFAULT 'none',
  diabetes_status TEXT DEFAULT 'none',
  heart_condition BOOLEAN DEFAULT false,
  bleeding_disorders BOOLEAN DEFAULT false,
  hepatitis BOOLEAN DEFAULT false,
  hiv BOOLEAN DEFAULT false,
  epilepsy BOOLEAN DEFAULT false,
  asthma BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

-- Enable RLS
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view clinic medical history"
ON public.patient_medical_history FOR SELECT
USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can create clinic medical history"
ON public.patient_medical_history FOR INSERT
WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update clinic medical history"
ON public.patient_medical_history FOR UPDATE
USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete clinic medical history"
ON public.patient_medical_history FOR DELETE
USING (clinic_id = get_user_clinic_id());

-- Timestamp trigger
CREATE TRIGGER update_patient_medical_history_updated_at
BEFORE UPDATE ON public.patient_medical_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
