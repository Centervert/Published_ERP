-- Create contact_communications table for storing all communication records
CREATE TABLE public.contact_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'call')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
  duration_seconds INTEGER,
  outcome TEXT CHECK (outcome IN ('answered', 'voicemail', 'no_answer', 'busy', 'left_message')),
  notes TEXT,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view contact_communications"
ON public.contact_communications
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create contact_communications"
ON public.contact_communications
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own contact_communications"
ON public.contact_communications
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete contact_communications"
ON public.contact_communications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_contact_communications_contact_id ON public.contact_communications(contact_id);
CREATE INDEX idx_contact_communications_created_at ON public.contact_communications(created_at DESC);