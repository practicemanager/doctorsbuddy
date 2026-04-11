
DROP POLICY IF EXISTS "Authenticated users can create a clinic" ON public.clinics;

CREATE POLICY "Authenticated users can create a clinic"
ON public.clinics
FOR INSERT
TO authenticated
WITH CHECK (true);
