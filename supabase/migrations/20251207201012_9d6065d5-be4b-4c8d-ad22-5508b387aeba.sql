-- Add last_inbox_sync_at to track when we last synced each user's inbox
ALTER TABLE public.user_email_connections 
ADD COLUMN IF NOT EXISTS last_inbox_sync_at timestamp with time zone;