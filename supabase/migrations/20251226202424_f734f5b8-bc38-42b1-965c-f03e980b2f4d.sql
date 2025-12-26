-- Add header_image_dark_url column for dark background email headers
ALTER TABLE public.company 
ADD COLUMN header_image_dark_url text;