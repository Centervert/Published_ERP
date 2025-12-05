-- Add is_bot flag to email_events for non-destructive bot detection
ALTER TABLE public.email_events 
ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;