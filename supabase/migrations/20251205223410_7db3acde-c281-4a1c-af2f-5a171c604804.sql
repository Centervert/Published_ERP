-- Add reply_to_email column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN reply_to_email text;