-- Add campaign tracking columns for Mailgun webhook updates
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS bounce_count integer DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS delivered_count integer DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS complaint_count integer DEFAULT 0;

-- Drop the email_queue table (no longer needed with Mailgun batch API)
DROP TABLE IF EXISTS public.email_queue;