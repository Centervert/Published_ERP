-- Create optimized function to get contact health stats in a single query
CREATE OR REPLACE FUNCTION get_contact_health_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*)::text,
    'validated', COUNT(*) FILTER (WHERE email_validation_result IS NOT NULL)::text,
    'deliverable', COUNT(*) FILTER (WHERE email_validation_result = 'deliverable')::text,
    'undeliverable', COUNT(*) FILTER (WHERE email_validation_result = 'undeliverable')::text,
    'catchAll', COUNT(*) FILTER (WHERE email_validation_result = 'catch_all')::text,
    'doNotSend', COUNT(*) FILTER (WHERE email_validation_result = 'do_not_send')::text,
    'unknown', COUNT(*) FILTER (WHERE email_validation_result = 'unknown')::text,
    'lowRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'low')::text,
    'mediumRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'medium')::text,
    'highRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'high')::text
  )
  FROM contacts
  WHERE email IS NOT NULL AND email != '';
$$;

-- Create index for faster filtering on validation result
CREATE INDEX IF NOT EXISTS idx_contacts_validation_result 
ON contacts (email_validation_result) 
WHERE email IS NOT NULL AND email != '';

-- Create index for faster filtering on validation risk
CREATE INDEX IF NOT EXISTS idx_contacts_validation_risk 
ON contacts (email_validation_risk) 
WHERE email IS NOT NULL AND email != '';