
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  vendor_name TEXT,
  gst_rate NUMERIC NOT NULL DEFAULT 18,
  gst_amount NUMERIC GENERATED ALWAYS AS (amount * gst_rate / 100) STORED,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic expenses" ON public.expenses FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic expenses" ON public.expenses FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic expenses" ON public.expenses FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic expenses" ON public.expenses FOR DELETE USING (clinic_id = get_user_clinic_id());

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
