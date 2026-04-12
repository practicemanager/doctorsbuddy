
-- Add op_number column to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS op_number TEXT;

-- Create unique index for op_number per clinic
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_op_number_clinic ON public.patients (clinic_id, op_number);

-- Function to auto-generate OP number
CREATE OR REPLACE FUNCTION public.generate_op_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(op_number, '[^0-9]', '', 'g'), '') AS INT)
  ), 0) + 1
  INTO v_next
  FROM public.patients
  WHERE clinic_id = NEW.clinic_id AND op_number IS NOT NULL;
  
  NEW.op_number := 'OP-' || LPAD(v_next::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger to auto-set op_number on insert
CREATE TRIGGER trg_generate_op_number
BEFORE INSERT ON public.patients
FOR EACH ROW
WHEN (NEW.op_number IS NULL)
EXECUTE FUNCTION public.generate_op_number();

-- Backfill existing patients with OP numbers
DO $$
DECLARE
  r RECORD;
  counter INT;
  current_clinic UUID := NULL;
BEGIN
  counter := 0;
  FOR r IN SELECT id, clinic_id FROM public.patients WHERE op_number IS NULL ORDER BY clinic_id, created_at LOOP
    IF current_clinic IS DISTINCT FROM r.clinic_id THEN
      current_clinic := r.clinic_id;
      counter := 0;
    END IF;
    counter := counter + 1;
    UPDATE public.patients SET op_number = 'OP-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
END;
$$;

-- Create patient_documents table
CREATE TABLE public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  tooth_number INT,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic staff can view documents"
ON public.patient_documents FOR SELECT
TO authenticated
USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic staff can create documents"
ON public.patient_documents FOR INSERT
TO authenticated
WITH CHECK (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic staff can update documents"
ON public.patient_documents FOR UPDATE
TO authenticated
USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic staff can delete documents"
ON public.patient_documents FOR DELETE
TO authenticated
USING (clinic_id = public.get_user_clinic_id());

CREATE TRIGGER update_patient_documents_updated_at
BEFORE UPDATE ON public.patient_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-documents');
