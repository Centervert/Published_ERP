-- Create lead_source enum type
CREATE TYPE public.lead_source AS ENUM (
  'website_landing_page',
  'manual_entry',
  'marketing_partner',
  'import'
);

-- Add lead_source and lead_source_detail columns to contacts table
ALTER TABLE public.contacts
ADD COLUMN lead_source public.lead_source DEFAULT 'manual_entry',
ADD COLUMN lead_source_detail text;

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.lead_source IS 'Category of how the contact was acquired';
COMMENT ON COLUMN public.contacts.lead_source_detail IS 'Specific details like URL, partner name, or campaign';