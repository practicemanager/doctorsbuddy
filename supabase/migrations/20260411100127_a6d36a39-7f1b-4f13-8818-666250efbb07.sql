
-- Replace the original staff-only INSERT with one that also allows self-registration
DROP POLICY IF EXISTS "Users can create clinic patients" ON public.patients;
CREATE POLICY "Users can create clinic patients"
ON public.patients
FOR INSERT
TO public
WITH CHECK (
  clinic_id = get_user_clinic_id()
  OR public.clinic_exists(clinic_id)
);

-- Same for queue_tokens
DROP POLICY IF EXISTS "Users can create clinic queue tokens" ON public.queue_tokens;
CREATE POLICY "Users can create clinic queue tokens"
ON public.queue_tokens
FOR INSERT
TO public
WITH CHECK (
  clinic_id = get_user_clinic_id()
  OR public.clinic_exists(clinic_id)
);
