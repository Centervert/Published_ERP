-- Aggregate campaign stats in the database to avoid client-side 1,000 row limits
-- and make live metric refresh reliable.

CREATE OR REPLACE FUNCTION public.get_campaign_stats(_campaign_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'sent', count(*) FILTER (WHERE event_type = 'sent'),
    'delivered', count(*) FILTER (WHERE event_type = 'delivered'),
    'opened', count(DISTINCT email) FILTER (WHERE event_type = 'opened'),
    'openedHuman', count(DISTINCT email) FILTER (WHERE event_type = 'opened' AND COALESCE(is_bot, false) = false),
    'clicked', count(DISTINCT email) FILTER (WHERE event_type = 'clicked'),
    'bounced', count(*) FILTER (WHERE event_type = 'bounced'),
    'complained', count(*) FILTER (WHERE event_type = 'complained'),
    'unsubscribed', count(*) FILTER (WHERE event_type = 'unsubscribed')
  )
  FROM public.email_events
  WHERE campaign_id = _campaign_id;
$$;

-- Helpful indexes for fast aggregation (safe to run even if already present)
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON public.email_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_event_type ON public.email_events (campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_event_email ON public.email_events (campaign_id, event_type, email);
