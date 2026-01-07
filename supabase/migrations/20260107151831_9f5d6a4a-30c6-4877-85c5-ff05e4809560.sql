-- Create GIN trigram index on search_name for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_contacts_search_name_trgm 
ON public.contacts USING GIN (search_name gin_trgm_ops);

-- Also index email for searches
CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm 
ON public.contacts USING GIN (email gin_trgm_ops);

-- Analyze the table to update query planner statistics
ANALYZE contacts;