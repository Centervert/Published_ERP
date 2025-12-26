-- Create the company table for parent company (single row)
CREATE TABLE public.company (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  legal_address text,
  phone text,
  website_url text,
  logo_url text,
  logo_dark_url text,
  icon_url text,
  favicon_url text,
  footer_copyright_template text DEFAULT '© {year} {company_name}. All rights reserved.',
  footer_reason_template text DEFAULT 'You received this email because you are a valued {company_name} customer.',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view company"
  ON public.company FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update company"
  ON public.company FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Prevent insert (single row only - seeded via migration)
CREATE POLICY "Prevent insert"
  ON public.company FOR INSERT
  WITH CHECK (false);

-- Prevent delete
CREATE POLICY "Prevent delete"
  ON public.company FOR DELETE
  USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_company_updated_at
  BEFORE UPDATE ON public.company
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the initial Author Services company record
INSERT INTO public.company (name, slug, legal_address, phone, website_url, footer_copyright_template, footer_reason_template)
VALUES (
  'Author Services',
  'author-services',
  'Author Services, 555 Winderley Pl Suite 225, Maitland, FL 32751',
  '866-381-2665',
  'https://authorservices.com',
  '© {year} {company_name}. All rights reserved.',
  'You received this email because you are a valued {company_name} customer.'
);

-- Add company_id foreign key to imprints table (nullable for backward compatibility)
ALTER TABLE public.imprints
  ADD COLUMN company_id uuid REFERENCES public.company(id);