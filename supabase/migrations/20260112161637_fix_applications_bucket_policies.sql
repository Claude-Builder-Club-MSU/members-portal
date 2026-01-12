-- ============================================================================
-- FIX APPLICATIONS BUCKET ACCESS
-- This migration ensures board/e-board members and application owners can
-- access application documents (resumes and transcripts)
-- ============================================================================

-- First, ensure the bucket exists and is private (requires signed URLs)
UPDATE storage.buckets
SET public = false
WHERE id = 'applications';

-- Drop all existing policies on applications bucket
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE '%application%'
    )
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- ============================================================================
-- STORAGE POLICIES FOR APPLICATIONS BUCKET
-- ============================================================================

-- Policy 1: Users can upload their own application files
-- Files are stored as: {user_id}/resume.pdf or {user_id}/transcript.pdf
CREATE POLICY "Users can upload own application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'applications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own application files
CREATE POLICY "Users can view own application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Board/E-board can view ALL application files
-- This allows reviewers to access any application documents
CREATE POLICY "Board can view all application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);

-- Policy 4: Users can update their own application files
CREATE POLICY "Users can update own application files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'applications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Users can delete their own application files
CREATE POLICY "Users can delete own application files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 6: Board/E-board can delete application files (for cleanup)
CREATE POLICY "Board can delete application files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('board', 'e-board')
  )
);