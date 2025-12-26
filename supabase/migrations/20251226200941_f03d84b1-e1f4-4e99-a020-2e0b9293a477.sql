-- Phase 1: Extend company table with branding fields (matching imprint structure)
ALTER TABLE public.company
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#1a1a2e',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#16213e',
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#0f3460',
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#333333',
ADD COLUMN IF NOT EXISTS heading_font text DEFAULT 'Roboto',
ADD COLUMN IF NOT EXISTS body_font text DEFAULT 'Open Sans',
ADD COLUMN IF NOT EXISTS brand_voice text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS from_name text,
ADD COLUMN IF NOT EXISTS from_email text,
ADD COLUMN IF NOT EXISTS reply_to_email text,
ADD COLUMN IF NOT EXISTS header_image_url text,
ADD COLUMN IF NOT EXISTS footer_image_url text;

-- Migrate branding data from Author Services imprint to company table
UPDATE public.company c
SET 
  primary_color = i.primary_color,
  secondary_color = i.secondary_color,
  accent_color = i.accent_color,
  background_color = i.background_color,
  text_color = i.text_color,
  heading_font = i.heading_font,
  body_font = i.body_font,
  brand_voice = i.brand_voice,
  tagline = i.tagline,
  from_name = i.from_name,
  from_email = i.from_email,
  reply_to_email = i.reply_to_email,
  logo_url = COALESCE(c.logo_url, i.logo_url),
  logo_dark_url = COALESCE(c.logo_dark_url, i.logo_dark_url),
  icon_url = COALESCE(c.icon_url, i.icon_url),
  header_image_url = i.header_image_url,
  footer_image_url = i.footer_image_url
FROM public.imprints i
WHERE i.slug = 'author-services';

-- Link all existing imprints to the parent company
UPDATE public.imprints 
SET company_id = (SELECT id FROM public.company LIMIT 1)
WHERE company_id IS NULL;

-- Set contacts with Author Services imprint to NULL (they become non-authors)
UPDATE public.contacts 
SET imprint_id = NULL 
WHERE imprint_id = (SELECT id FROM public.imprints WHERE slug = 'author-services');

-- Delete the Author Services imprint record
DELETE FROM public.imprints WHERE slug = 'author-services';