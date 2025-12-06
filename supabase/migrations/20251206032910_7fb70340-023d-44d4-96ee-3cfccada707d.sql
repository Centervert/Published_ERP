-- Add blocks_json column to campaigns table for storing structured email blocks
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS blocks_json JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.blocks_json IS 'Structured JSON blocks for email content. Rendered to html_content when sending.';