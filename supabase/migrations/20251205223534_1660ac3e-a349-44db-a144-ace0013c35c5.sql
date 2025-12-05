-- Add reply_to_email column to email_queue table for worker to use
ALTER TABLE public.email_queue 
ADD COLUMN reply_to_email text;