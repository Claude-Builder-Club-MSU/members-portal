-- Create events bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for events bucket
CREATE POLICY "Public Access to QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Board can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'events'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

CREATE POLICY "Board can update QR codes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'events'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

CREATE POLICY "Board can delete QR codes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'events'
  AND (storage.foldername(name))[1] = 'qr-codes'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);