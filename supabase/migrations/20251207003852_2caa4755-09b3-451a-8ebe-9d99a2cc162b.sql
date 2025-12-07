-- Add new columns to contacts table for CRM functionality
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_type text DEFAULT 'lead';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS imprint_id uuid REFERENCES public.imprints(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes text;

-- Create contact_links table for dynamic websites/social profiles
CREATE TABLE IF NOT EXISTS public.contact_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  link_type text NOT NULL, -- 'author_website', 'amazon', 'facebook', 'twitter', 'instagram', 'linkedin', 'goodreads', 'other'
  url text NOT NULL,
  label text, -- optional custom label for 'other' type
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on contact_links
ALTER TABLE public.contact_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_links
CREATE POLICY "Authenticated users can view contact_links"
ON public.contact_links FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create contact_links"
ON public.contact_links FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contact_links"
ON public.contact_links FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete contact_links"
ON public.contact_links FOR DELETE
USING (true);