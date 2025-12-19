-- Create import_jobs table for tracking CSV imports
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  file_name TEXT NOT NULL,
  file_data TEXT NOT NULL,
  column_mapping JSONB,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own import jobs"
ON public.import_jobs FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create own import jobs"
ON public.import_jobs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own import jobs"
ON public.import_jobs FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own import jobs"
ON public.import_jobs FOR DELETE
USING (auth.uid() = created_by);

-- Service role policy for edge function
CREATE POLICY "Service role can manage all import jobs"
ON public.import_jobs FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;

-- Create index for faster queries
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs(created_by);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);