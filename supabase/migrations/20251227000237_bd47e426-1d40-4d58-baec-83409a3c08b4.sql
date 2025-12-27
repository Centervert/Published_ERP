-- Add composite index for common filter + sort pattern (faster pagination)
CREATE INDEX IF NOT EXISTS idx_contacts_status_created ON public.contacts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_type_created ON public.contacts (contact_type, created_at DESC);

-- Add index for text search patterns (partial matching won't use btree, but exact/prefix will)
CREATE INDEX IF NOT EXISTS idx_contacts_first_name ON public.contacts (first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON public.contacts (last_name);