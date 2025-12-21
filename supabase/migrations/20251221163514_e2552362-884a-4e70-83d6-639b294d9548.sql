-- Add columns to store scheduled campaign settings
ALTER TABLE public.campaigns 
ADD COLUMN scheduled_imprint_ids UUID[] DEFAULT NULL,
ADD COLUMN scheduled_additional_recipients TEXT[] DEFAULT NULL,
ADD COLUMN route_replies_to_asc BOOLEAN DEFAULT FALSE;