-- Add scheduled_for column to email_queue for batch scheduling
ALTER TABLE public.email_queue 
ADD COLUMN scheduled_for TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient querying of due emails
CREATE INDEX idx_email_queue_scheduled_for ON public.email_queue (scheduled_for) 
WHERE status = 'pending';