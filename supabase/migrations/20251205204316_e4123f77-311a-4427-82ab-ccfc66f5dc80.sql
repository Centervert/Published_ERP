-- Email tracking events table
CREATE TABLE public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID,
    contact_id UUID,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained')),
    link_url TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by campaign
CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_contact ON public.email_events(contact_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users to read events (we'll refine with team roles later)
CREATE POLICY "Authenticated users can read email events"
ON public.email_events
FOR SELECT
TO authenticated
USING (true);

-- Edge functions need to insert events (public access for tracking endpoints)
CREATE POLICY "Allow insert for tracking"
ON public.email_events
FOR INSERT
WITH CHECK (true);