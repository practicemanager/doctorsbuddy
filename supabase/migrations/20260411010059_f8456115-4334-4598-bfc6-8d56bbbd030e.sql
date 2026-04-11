
CREATE OR REPLACE FUNCTION public.create_clinic_and_link(
  p_name text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  -- Create the clinic
  INSERT INTO clinics (name, phone, address)
  VALUES (p_name, p_phone, p_address)
  RETURNING id INTO v_clinic_id;
  
  -- Link clinic to user profile and set role to owner
  UPDATE profiles
  SET clinic_id = v_clinic_id, role = 'owner'
  WHERE user_id = auth.uid();
  
  RETURN v_clinic_id;
END;
$$;
