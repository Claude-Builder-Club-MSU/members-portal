-- Remove triggers or dependencies if needed - none for these columns
DROP POLICY IF EXISTS "Anyone can view active QR codes" ON public.event_qr_codes;
ALTER TABLE public.event_qr_codes DROP COLUMN IF EXISTS active;
ALTER TABLE public.event_qr_codes DROP COLUMN IF EXISTS expires_at;

CREATE POLICY "Anyone can view active QR codes"
ON public.event_qr_codes FOR SELECT
TO authenticated
USING (true);
