-- Add partial index for active contacts (common query pattern)
CREATE INDEX IF NOT EXISTS idx_contacts_active_created 
ON contacts (created_at DESC) 
WHERE status = 'active';

-- Update statistics for better query planning
ANALYZE contacts;