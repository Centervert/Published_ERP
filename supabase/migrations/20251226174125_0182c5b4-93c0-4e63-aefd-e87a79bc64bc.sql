-- Add priority column to dev_items table
ALTER TABLE public.dev_items 
ADD COLUMN priority integer DEFAULT 0;

-- Add index for sorting by priority
CREATE INDEX idx_dev_items_priority ON public.dev_items(priority DESC);