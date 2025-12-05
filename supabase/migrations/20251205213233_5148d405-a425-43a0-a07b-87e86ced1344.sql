-- Add columns to email_queue to store pre-rendered email data
-- This allows the VPS worker to send without complex queries
ALTER TABLE public.email_queue 
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS from_name text,
ADD COLUMN IF NOT EXISTS from_email text,
ADD COLUMN IF NOT EXISTS html_content text,
ADD COLUMN IF NOT EXISTS contact_first_name text,
ADD COLUMN IF NOT EXISTS contact_last_name text;