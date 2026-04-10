
-- Create enum types
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE public.campaign_type AS ENUM ('email', 'whatsapp', 'sms');
CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE public.user_role AS ENUM ('owner', 'dentist', 'hygienist', 'receptionist', 'assistant');

-- Clinics table (tenant)
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'receptionist',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  type TEXT NOT NULL DEFAULT 'General Checkup',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.campaign_type NOT NULL DEFAULT 'email',
  status public.campaign_status NOT NULL DEFAULT 'draft',
  subject TEXT,
  content TEXT,
  audience_filter JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaign messages table
CREATE TABLE public.campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  channel public.campaign_type NOT NULL,
  status public.message_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's clinic_id
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Clinics: users can see their own clinic
CREATE POLICY "Users can view their clinic" ON public.clinics FOR SELECT USING (id = public.get_user_clinic_id());
CREATE POLICY "Owners can update their clinic" ON public.clinics FOR UPDATE USING (id = public.get_user_clinic_id());
CREATE POLICY "Anyone can create a clinic" ON public.clinics FOR INSERT WITH CHECK (true);

-- Profiles: users can see profiles in their clinic, manage their own
CREATE POLICY "Users can view clinic profiles" ON public.profiles FOR SELECT USING (clinic_id = public.get_user_clinic_id() OR user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Patients: clinic-scoped
CREATE POLICY "Users can view clinic patients" ON public.patients FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can create clinic patients" ON public.patients FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can update clinic patients" ON public.patients FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can delete clinic patients" ON public.patients FOR DELETE USING (clinic_id = public.get_user_clinic_id());

-- Appointments: clinic-scoped
CREATE POLICY "Users can view clinic appointments" ON public.appointments FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can create clinic appointments" ON public.appointments FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can update clinic appointments" ON public.appointments FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can delete clinic appointments" ON public.appointments FOR DELETE USING (clinic_id = public.get_user_clinic_id());

-- Invoices: clinic-scoped
CREATE POLICY "Users can view clinic invoices" ON public.invoices FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can create clinic invoices" ON public.invoices FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can update clinic invoices" ON public.invoices FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can delete clinic invoices" ON public.invoices FOR DELETE USING (clinic_id = public.get_user_clinic_id());

-- Invoice items: via invoice's clinic
CREATE POLICY "Users can view invoice items" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.clinic_id = public.get_user_clinic_id())
);
CREATE POLICY "Users can create invoice items" ON public.invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.clinic_id = public.get_user_clinic_id())
);
CREATE POLICY "Users can update invoice items" ON public.invoice_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.clinic_id = public.get_user_clinic_id())
);
CREATE POLICY "Users can delete invoice items" ON public.invoice_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.clinic_id = public.get_user_clinic_id())
);

-- Campaigns: clinic-scoped
CREATE POLICY "Users can view clinic campaigns" ON public.campaigns FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can create clinic campaigns" ON public.campaigns FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can update clinic campaigns" ON public.campaigns FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "Users can delete clinic campaigns" ON public.campaigns FOR DELETE USING (clinic_id = public.get_user_clinic_id());

-- Campaign messages: via campaign's clinic
CREATE POLICY "Users can view campaign messages" ON public.campaign_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_messages.campaign_id AND campaigns.clinic_id = public.get_user_clinic_id())
);
CREATE POLICY "Users can create campaign messages" ON public.campaign_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_messages.campaign_id AND campaigns.clinic_id = public.get_user_clinic_id())
);

-- Indexes for performance
CREATE INDEX idx_profiles_clinic ON public.profiles(clinic_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_patients_clinic ON public.patients(clinic_id);
CREATE INDEX idx_appointments_clinic ON public.appointments(clinic_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);
CREATE INDEX idx_invoices_clinic ON public.invoices(clinic_id);
CREATE INDEX idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX idx_campaigns_clinic ON public.campaigns(clinic_id);
CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
