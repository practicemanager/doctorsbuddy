
DROP POLICY IF EXISTS "Authenticated users can create a clinic" ON public.clinics;

CREATE POLICY "Authenticated users can create a clinic"
ON public.clinics
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);
