
-- Create queue token status enum
CREATE TYPE public.queue_status AS ENUM ('waiting', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.queue_priority AS ENUM ('normal', 'urgent', 'emergency');

-- Create queue_tokens table
CREATE TABLE public.queue_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id),
  token_number integer NOT NULL,
  status queue_status NOT NULL DEFAULT 'waiting',
  priority queue_priority NOT NULL DEFAULT 'normal',
  counter_number text,
  notes text,
  queue_date date NOT NULL DEFAULT CURRENT_DATE,
  called_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, queue_date, token_number)
);

-- Enable RLS
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic queue" ON public.queue_tokens FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic queue tokens" ON public.queue_tokens FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic queue tokens" ON public.queue_tokens FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic queue tokens" ON public.queue_tokens FOR DELETE USING (clinic_id = get_user_clinic_id());

-- Auto-update timestamp trigger
CREATE TRIGGER update_queue_tokens_updated_at
  BEFORE UPDATE ON public.queue_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next token number for a clinic on a given date
CREATE OR REPLACE FUNCTION public.get_next_token_number(p_clinic_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(token_number), 0) + 1
  FROM public.queue_tokens
  WHERE clinic_id = p_clinic_id AND queue_date = p_date;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tokens;
