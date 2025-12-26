-- Add header_image_dark_url column to imprints table for dark mode header images
ALTER TABLE public.imprints 
ADD COLUMN IF NOT EXISTS header_image_dark_url text;