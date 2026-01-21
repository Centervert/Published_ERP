-- Create export_jobs table to track background export operations
CREATE TABLE public.export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  total_batches INTEGER NOT NULL DEFAULT 0,
  completed_batches INTEGER NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 25000,
  file_paths TEXT[] DEFAULT '{}',
  error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own export jobs
CREATE POLICY "Users can view own export jobs"
ON public.export_jobs
FOR SELECT
USING (auth.uid() = created_by);

-- Users can create their own export jobs
CREATE POLICY "Users can create own export jobs"
ON public.export_jobs
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Service role can manage all export jobs (for edge function)
CREATE POLICY "Service role can manage all export jobs"
ON public.export_jobs
FOR ALL
USING (true)
WITH CHECK (true);

-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Users can read their own exports
CREATE POLICY "Users can read own exports"
ON storage.objects
FOR SELECT
USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can write exports
CREATE POLICY "Service can write exports"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'exports');