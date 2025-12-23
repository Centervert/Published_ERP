-- Add column to store List-Unsubscribe header for VPS worker
ALTER TABLE public.email_queue 
ADD COLUMN IF NOT EXISTS list_unsubscribe_header TEXT;