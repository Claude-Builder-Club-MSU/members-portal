-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profiles', 'profiles', true),
  ('applications', 'applications', false);

-- Storage policies for profiles bucket (public read, users can upload own)
CREATE POLICY "Profile pictures are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles' 
    AND (storage.foldername(name))[1] = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profiles'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can upload their own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can update their own resumes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Storage policies for applications bucket (private, users see own, board sees all)
CREATE POLICY "Users can view their own application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Board can view all application files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'applications'
    AND (
      public.has_role(auth.uid(), 'board')
      OR public.has_role(auth.uid(), 'e-board')
    )
  );

CREATE POLICY "Users can upload application files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'applications'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can update their application files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'applications'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );