-- Add email validation columns to contacts table
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS email_validation_result text,
  ADD COLUMN IF NOT EXISTS email_validation_risk text,
  ADD COLUMN IF NOT EXISTS email_validation_reasons text[],
  ADD COLUMN IF NOT EXISTS email_is_disposable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_is_role_address boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_did_you_mean text,
  ADD COLUMN IF NOT EXISTS email_validated_at timestamptz;

-- Index for filtering by validation status (useful for campaign sends and list views)
CREATE INDEX IF NOT EXISTS idx_contacts_email_validation 
  ON public.contacts (email_validation_result, email_validation_risk);

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.email_validation_result IS 'Mailgun validation result: deliverable, undeliverable, do_not_send, catch_all, unknown';
COMMENT ON COLUMN public.contacts.email_validation_risk IS 'Mailgun risk assessment: low, medium, high, unknown';
COMMENT ON COLUMN public.contacts.email_validation_reasons IS 'Array of validation failure reasons from Mailgun';
COMMENT ON COLUMN public.contacts.email_is_disposable IS 'Whether email is from a disposable email provider';
COMMENT ON COLUMN public.contacts.email_is_role_address IS 'Whether email is a role address (e.g., admin@, support@)';
COMMENT ON COLUMN public.contacts.email_did_you_mean IS 'Suggested email correction for typos';
COMMENT ON COLUMN public.contacts.email_validated_at IS 'Timestamp of last email validation';