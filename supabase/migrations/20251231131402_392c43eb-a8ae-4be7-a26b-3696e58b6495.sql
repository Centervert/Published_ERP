-- Add new fields to deals table
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS writing_status text,
ADD COLUMN IF NOT EXISTS book_title text,
ADD COLUMN IF NOT EXISTS book_description text,
ADD COLUMN IF NOT EXISTS goals text;

-- Add deal_id to contact_communications for tagging communications to deals
ALTER TABLE public.contact_communications
ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_contact_communications_deal_id ON public.contact_communications(deal_id);

-- Create contact_notes table
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes for contact_notes
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON public.contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_deal_id ON public.contact_notes(deal_id);

-- Enable RLS on contact_notes
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_notes
CREATE POLICY "Authenticated users can view contact_notes"
ON public.contact_notes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create contact_notes"
ON public.contact_notes FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own contact_notes"
ON public.contact_notes FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete contact_notes"
ON public.contact_notes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on contact_notes
CREATE TRIGGER update_contact_notes_updated_at
BEFORE UPDATE ON public.contact_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create contact_tasks table
CREATE TABLE IF NOT EXISTS public.contact_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority text DEFAULT 'medium',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes for contact_tasks
CREATE INDEX IF NOT EXISTS idx_contact_tasks_contact_id ON public.contact_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_deal_id ON public.contact_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_contact_tasks_due_date ON public.contact_tasks(due_date);

-- Enable RLS on contact_tasks
ALTER TABLE public.contact_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_tasks
CREATE POLICY "Authenticated users can view contact_tasks"
ON public.contact_tasks FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create contact_tasks"
ON public.contact_tasks FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update contact_tasks"
ON public.contact_tasks FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete contact_tasks"
ON public.contact_tasks FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on contact_tasks
CREATE TRIGGER update_contact_tasks_updated_at
BEFORE UPDATE ON public.contact_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();