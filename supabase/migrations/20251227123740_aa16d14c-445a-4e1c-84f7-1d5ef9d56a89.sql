-- Enable trigram extension for pattern matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Combined search column for efficient "First Last" searches (eliminates OR conditions)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS search_name TEXT 
  GENERATED ALWAYS AS (LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) STORED;

-- Normalized phone column for clean phone searches (strips formatting)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_normalized TEXT 
  GENERATED ALWAYS AS (regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) STORED;

-- GIN trigram indexes for fast ILIKE pattern matching
CREATE INDEX IF NOT EXISTS idx_contacts_first_name_trgm 
  ON contacts USING gin (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_last_name_trgm 
  ON contacts USING gin (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm 
  ON contacts USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_search_name_trgm 
  ON contacts USING gin (search_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized_trgm 
  ON contacts USING gin (phone_normalized gin_trgm_ops);