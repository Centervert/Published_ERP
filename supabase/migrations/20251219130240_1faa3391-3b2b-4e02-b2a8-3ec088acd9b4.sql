-- Create storage bucket for import files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('import-files', 'import-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload their own import files
CREATE POLICY "Users can upload own import files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: users can read their own import files
CREATE POLICY "Users can read own import files"
ON storage.objects FOR SELECT
USING (bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: service role can access all import files
CREATE POLICY "Service role can access import files"
ON storage.objects FOR ALL
USING (bucket_id = 'import-files')
WITH CHECK (bucket_id = 'import-files');

-- Modify import_jobs table to use file_path instead of file_data
ALTER TABLE public.import_jobs 
  ALTER COLUMN file_data DROP NOT NULL,
  ADD COLUMN file_path TEXT;