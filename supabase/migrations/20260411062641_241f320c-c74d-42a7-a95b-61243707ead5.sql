-- Allow public patient self-registration (insert only)
CREATE POLICY "Public patient self-registration"
ON public.patients
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public queue token creation for self-registration
CREATE POLICY "Public queue token creation"
ON public.queue_tokens
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to call get_next_token_number
GRANT EXECUTE ON FUNCTION public.get_next_token_number TO anon;
