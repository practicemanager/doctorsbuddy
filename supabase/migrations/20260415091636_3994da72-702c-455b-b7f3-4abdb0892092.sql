
-- 1. Fix profiles UPDATE policy: create a function to safely update profile
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Drop existing permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create restrictive UPDATE policy that prevents role/clinic_id changes
CREATE POLICY "Users can update own profile safely"
  ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND (
      clinic_id IS NOT DISTINCT FROM (SELECT p.clinic_id FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );

-- 2. Fix deduct_inventory: add clinic ownership check
CREATE OR REPLACE FUNCTION public.deduct_inventory(
  p_item_id uuid,
  p_quantity integer,
  p_treatment_id uuid DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the item belongs to the caller's clinic
  IF NOT EXISTS (
    SELECT 1 FROM inventory_items
    WHERE id = p_item_id
      AND clinic_id = public.get_user_clinic_id()
  ) THEN
    RAISE EXCEPTION 'Access denied: item does not belong to your clinic';
  END IF;

  UPDATE inventory_items
  SET quantity = quantity - p_quantity
  WHERE id = p_item_id AND quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for item %', p_item_id;
  END IF;

  INSERT INTO inventory_transactions (
    inventory_item_id, transaction_type, quantity_changed,
    treatment_id, performed_by, notes
  ) VALUES (
    p_item_id, 'treatment_deduction', -p_quantity,
    p_treatment_id, p_performed_by, 'Auto-deducted from treatment'
  );
END;
$$;

-- 3. Fix patient-documents storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads to patient-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from patient-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from patient-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete patient documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_patient_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_patient_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_patient_documents" ON storage.objects;

-- Recreate with clinic ownership checks
CREATE POLICY "clinic_scoped_read_patient_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "clinic_scoped_upload_patient_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "clinic_scoped_update_patient_docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "clinic_scoped_delete_patient_docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

-- 4. Fix clinic-logos storage policies
DROP POLICY IF EXISTS "Anyone can view clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_clinic_logos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_clinic_logos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_clinic_logos" ON storage.objects;

-- Public read is fine for logos
CREATE POLICY "public_read_clinic_logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-logos');

-- Upload/update/delete restricted to own clinic folder
CREATE POLICY "clinic_scoped_upload_logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "clinic_scoped_update_logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );

CREATE POLICY "clinic_scoped_delete_logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] = get_user_clinic_id()::text
  );
