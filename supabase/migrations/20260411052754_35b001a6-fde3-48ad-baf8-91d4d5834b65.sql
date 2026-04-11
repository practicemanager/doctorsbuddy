
CREATE TABLE public.treatment_material_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_name TEXT NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, treatment_name, inventory_item_id)
);

ALTER TABLE public.treatment_material_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic mappings" ON public.treatment_material_mappings FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic mappings" ON public.treatment_material_mappings FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic mappings" ON public.treatment_material_mappings FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic mappings" ON public.treatment_material_mappings FOR DELETE USING (clinic_id = get_user_clinic_id());
