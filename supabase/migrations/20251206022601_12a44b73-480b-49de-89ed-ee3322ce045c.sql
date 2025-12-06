
-- Create imprints table for brand management
CREATE TABLE public.imprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- From Email Configuration
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT,
  
  -- Brand Colors (hex values)
  primary_color TEXT DEFAULT '#1a1a2e',
  secondary_color TEXT DEFAULT '#16213e',
  accent_color TEXT DEFAULT '#0f3460',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#333333',
  
  -- Brand Typography (Google Fonts names)
  heading_font TEXT DEFAULT 'Roboto',
  body_font TEXT DEFAULT 'Open Sans',
  
  -- Brand Assets (URLs to storage)
  logo_url TEXT,
  logo_dark_url TEXT,
  icon_url TEXT,
  header_image_url TEXT,
  footer_image_url TEXT,
  
  -- Additional metadata for AI
  brand_voice TEXT,
  tagline TEXT,
  website_url TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.imprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view imprints"
ON public.imprints FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create imprints"
ON public.imprints FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update imprints"
ON public.imprints FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete imprints"
ON public.imprints FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_imprints_updated_at
BEFORE UPDATE ON public.imprints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for imprint assets
INSERT INTO storage.buckets (id, name, public) VALUES ('imprint-assets', 'imprint-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view imprint assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'imprint-assets');

CREATE POLICY "Authenticated users can upload imprint assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imprint-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update imprint assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'imprint-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete imprint assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'imprint-assets' AND auth.role() = 'authenticated');
