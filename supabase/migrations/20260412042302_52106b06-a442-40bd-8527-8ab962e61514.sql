-- Create storage bucket for clinic logos
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic-logos', 'clinic-logos', true);

-- Allow public read access to logos
CREATE POLICY "Clinic logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload clinic logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinic-logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update clinic logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic-logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "Authenticated users can delete clinic logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic-logos');