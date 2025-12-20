-- Add fallback text columns for ASC/AE when no profile match is found
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS assigned_asc_text TEXT,
  ADD COLUMN IF NOT EXISTS assigned_ae_text TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.contacts.assigned_asc_text IS 'Fallback text for ASC when no profile match (e.g. "Jane Doe <jane@example.com>")';
COMMENT ON COLUMN public.contacts.assigned_ae_text IS 'Fallback text for AE when no profile match';