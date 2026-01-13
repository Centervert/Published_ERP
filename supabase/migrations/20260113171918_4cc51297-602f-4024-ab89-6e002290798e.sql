
-- Create the RPC function to get recipient health counts for campaign targeting
CREATE OR REPLACE FUNCTION public.get_recipient_health_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH contact_health AS (
    SELECT 
      c.id,
      c.imprint_id,
      c.status,
      c.email,
      c.email_validation_result,
      -- Check if contact is sendable (deliverable, active, has email)
      CASE 
        WHEN c.email IS NULL OR c.email = '' THEN 'no_email'
        WHEN c.status != 'active' THEN 'inactive'
        WHEN c.email_validation_result = 'undeliverable' THEN 'undeliverable'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'bounced') THEN 'bounced'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'unsubscribed') THEN 'unsubscribed'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'complained') THEN 'complained'
        WHEN c.email_validation_result = 'deliverable' THEN 'sendable'
        ELSE 'not_validated'
      END as health_status
    FROM contacts c
    WHERE c.status = 'active' AND c.email IS NOT NULL AND c.email != ''
  ),
  imprint_counts AS (
    SELECT 
      imprint_id::text as id,
      COUNT(*) FILTER (WHERE health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_health
    WHERE imprint_id IS NOT NULL
    GROUP BY imprint_id
  ),
  list_counts AS (
    SELECT 
      cl.list_id::text as id,
      COUNT(*) FILTER (WHERE ch.health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE ch.health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE ch.health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_lists cl
    JOIN contact_health ch ON ch.id = cl.contact_id
    GROUP BY cl.list_id
  ),
  totals AS (
    SELECT 
      COUNT(*) FILTER (WHERE health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_health
  ),
  exclusion_reasons AS (
    SELECT 
      COUNT(*) FILTER (WHERE health_status = 'no_email') as "noEmail",
      COUNT(*) FILTER (WHERE health_status = 'bounced') as bounced,
      COUNT(*) FILTER (WHERE health_status = 'unsubscribed') as unsubscribed,
      COUNT(*) FILTER (WHERE health_status = 'complained') as complained,
      COUNT(*) FILTER (WHERE health_status = 'undeliverable') as undeliverable
    FROM contact_health
  )
  SELECT jsonb_build_object(
    'total', (SELECT jsonb_build_object('sendable', sendable::text, 'notValidated', "notValidated"::text, 'excluded', excluded::text) FROM totals),
    'exclusionReasons', (SELECT jsonb_build_object('noEmail', "noEmail"::text, 'bounced', bounced::text, 'unsubscribed', unsubscribed::text, 'complained', complained::text, 'undeliverable', undeliverable::text) FROM exclusion_reasons),
    'byImprint', COALESCE((SELECT jsonb_object_agg(id, jsonb_build_object('sendable', sendable, 'notValidated', "notValidated", 'excluded', excluded)) FROM imprint_counts), '{}'::jsonb),
    'byList', COALESCE((SELECT jsonb_object_agg(id, jsonb_build_object('sendable', sendable, 'notValidated', "notValidated", 'excluded', excluded)) FROM list_counts), '{}'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;
