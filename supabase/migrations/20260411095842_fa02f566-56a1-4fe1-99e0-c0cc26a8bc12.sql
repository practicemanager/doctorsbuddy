
-- Allow authenticated users (including those not in a clinic) to self-register as patients
-- This covers the case where a logged-in user scans a registration QR code
CREATE POLICY "Authenticated patient self-registration"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id)
);

-- Same for queue_tokens
CREATE POLICY "Authenticated queue token self-registration"
ON public.queue_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id)
);
