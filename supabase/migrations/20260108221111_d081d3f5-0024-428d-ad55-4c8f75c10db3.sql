-- Add column to persist selected list IDs on campaigns (similar to scheduled_imprint_ids)
ALTER TABLE public.campaigns 
ADD COLUMN scheduled_list_ids text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.scheduled_list_ids IS 'Array of list IDs selected for this campaign (persisted when recipients are confirmed)';