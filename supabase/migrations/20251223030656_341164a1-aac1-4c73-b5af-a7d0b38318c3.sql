-- Update all existing imprints to use updates.authorservices.com
UPDATE public.imprints 
SET from_email = REPLACE(from_email, '@news.authorservices.com', '@updates.authorservices.com')
WHERE from_email LIKE '%@news.authorservices.com';

-- Update all existing campaigns to use updates.authorservices.com
UPDATE public.campaigns 
SET from_email = REPLACE(from_email, '@news.authorservices.com', '@updates.authorservices.com')
WHERE from_email LIKE '%@news.authorservices.com';