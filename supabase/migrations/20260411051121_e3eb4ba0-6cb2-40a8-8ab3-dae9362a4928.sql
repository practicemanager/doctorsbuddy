
-- Inventory items table
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'General',
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  min_stock_level integer NOT NULL DEFAULT 5,
  cost_per_unit numeric DEFAULT 0,
  supplier_name text,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic inventory" ON public.inventory_items FOR SELECT USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can create clinic inventory" ON public.inventory_items FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can update clinic inventory" ON public.inventory_items FOR UPDATE USING (clinic_id = get_user_clinic_id());
CREATE POLICY "Users can delete clinic inventory" ON public.inventory_items FOR DELETE USING (clinic_id = get_user_clinic_id());

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transaction type enum
CREATE TYPE public.inventory_transaction_type AS ENUM ('restock', 'usage', 'adjustment', 'expired', 'treatment_deduction');

-- Inventory transactions table
CREATE TABLE public.inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type public.inventory_transaction_type NOT NULL,
  quantity_changed integer NOT NULL,
  notes text,
  performed_by uuid REFERENCES public.profiles(id),
  treatment_id uuid REFERENCES public.tooth_treatments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory transactions" ON public.inventory_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_transactions.inventory_item_id AND inventory_items.clinic_id = get_user_clinic_id()));
CREATE POLICY "Users can create inventory transactions" ON public.inventory_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_transactions.inventory_item_id AND inventory_items.clinic_id = get_user_clinic_id()));

-- Function to deduct inventory when treatment is completed
CREATE OR REPLACE FUNCTION public.deduct_inventory(p_item_id uuid, p_quantity integer, p_treatment_id uuid DEFAULT NULL, p_performed_by uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE inventory_items SET quantity = quantity - p_quantity WHERE id = p_item_id AND quantity >= p_quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;
  INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity_changed, treatment_id, performed_by, notes)
  VALUES (p_item_id, 'treatment_deduction', -p_quantity, p_treatment_id, p_performed_by, 'Auto-deducted from treatment');
END;
$$;
