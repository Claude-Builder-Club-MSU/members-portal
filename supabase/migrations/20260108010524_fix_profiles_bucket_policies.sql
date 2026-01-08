-- Drop existing policies on profiles bucket
DROP POLICY IF EXISTS "Users can upload to own avatar folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own resume folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;

-- Avatar policies (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '-', 1)
);

-- Resume policies (public bucket)
CREATE POLICY "Anyone can view resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'resumes');

CREATE POLICY "Users can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'resumes'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
);

CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'resumes'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
);

CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'resumes'
  AND auth.uid()::text = split_part((storage.foldername(name))[2], '.', 1)
);