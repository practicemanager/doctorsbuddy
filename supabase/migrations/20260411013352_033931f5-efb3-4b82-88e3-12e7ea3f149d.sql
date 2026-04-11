
-- Enum for tooth status
CREATE TYPE public.tooth_status AS ENUM ('healthy', 'decayed', 'missing', 'treated', 'needs_treatment');

-- Enum for treatment status
CREATE TYPE public.treatment_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- Tooth records: one per tooth per patient
CREATE TABLE public.tooth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  tooth_number integer NOT NULL CHECK (tooth_number >= 11 AND tooth_number <= 48),
  status tooth_status NOT NULL DEFAULT 'healthy',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, tooth_number)
);

ALTER TABLE public.tooth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic tooth records" ON public.tooth_records FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic tooth records" ON public.tooth_records FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic tooth records" ON public.tooth_records FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic tooth records" ON public.tooth_records FOR DELETE USING (clinic_id = get_user_clinic_id());

CREATE TRIGGER update_tooth_records_updated_at BEFORE UPDATE ON public.tooth_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tooth conditions
CREATE TABLE public.tooth_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tooth_record_id uuid NOT NULL REFERENCES public.tooth_records(id) ON DELETE CASCADE,
  condition_name text NOT NULL,
  severity text DEFAULT 'moderate',
  diagnosed_at date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tooth_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tooth conditions" ON public.tooth_conditions FOR SELECT USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_conditions.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can create tooth conditions" ON public.tooth_conditions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_conditions.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can update tooth conditions" ON public.tooth_conditions FOR UPDATE USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_conditions.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can delete tooth conditions" ON public.tooth_conditions FOR DELETE USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_conditions.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));

-- Tooth treatments
CREATE TABLE public.tooth_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tooth_record_id uuid NOT NULL REFERENCES public.tooth_records(id) ON DELETE CASCADE,
  treatment_name text NOT NULL,
  status treatment_status NOT NULL DEFAULT 'planned',
  cost numeric DEFAULT 0,
  performed_by uuid REFERENCES public.profiles(id),
  performed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tooth_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tooth treatments" ON public.tooth_treatments FOR SELECT USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_treatments.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can create tooth treatments" ON public.tooth_treatments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_treatments.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can update tooth treatments" ON public.tooth_treatments FOR UPDATE USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_treatments.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can delete tooth treatments" ON public.tooth_treatments FOR DELETE USING (EXISTS (SELECT 1 FROM tooth_records WHERE tooth_records.id = tooth_treatments.tooth_record_id AND tooth_records.clinic_id = get_user_clinic_id()));

CREATE TRIGGER update_tooth_treatments_updated_at BEFORE UPDATE ON public.tooth_treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
