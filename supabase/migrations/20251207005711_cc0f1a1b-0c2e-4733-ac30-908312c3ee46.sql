-- Create contact_activity table for CRM-specific activities
CREATE TABLE public.contact_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view contact_activity"
ON public.contact_activity FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create contact_activity"
ON public.contact_activity FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "System can insert contact_activity"
ON public.contact_activity FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_contact_activity_contact_id ON public.contact_activity(contact_id);
CREATE INDEX idx_contact_activity_created_at ON public.contact_activity(created_at DESC);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_activity;