-- Create storage bucket for check-in photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('check-in-photos', 'check-in-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload photos
CREATE POLICY "Users can upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'check-in-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy to allow users to read their own photos
CREATE POLICY "Users can view own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'check-in-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy to allow users to update their own photos
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'check-in-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy to allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'check-in-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
