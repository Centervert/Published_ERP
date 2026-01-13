
-- Create the "Author Services (Non-Authors)" list for contacts without an imprint
INSERT INTO public.lists (name, description)
VALUES (
  'Author Services (Non-Authors)', 
  'Contacts not assigned to any publishing imprint - for marketing to non-authors'
);

-- Populate the list with all active contacts that have no imprint assigned
INSERT INTO public.contact_lists (list_id, contact_id)
SELECT 
  (SELECT id FROM public.lists WHERE name = 'Author Services (Non-Authors)'),
  c.id
FROM public.contacts c
WHERE c.imprint_id IS NULL 
  AND c.status = 'active'
  AND c.email IS NOT NULL 
  AND c.email != '';

-- Create a trigger function to auto-add contacts to this list when they have no imprint
CREATE OR REPLACE FUNCTION public.auto_add_to_non_authors_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  non_authors_list_id UUID;
BEGIN
  -- Get the list ID
  SELECT id INTO non_authors_list_id 
  FROM public.lists 
  WHERE name = 'Author Services (Non-Authors)';
  
  -- If list doesn't exist, do nothing
  IF non_authors_list_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- For INSERT: Add to list if no imprint and active
  IF TG_OP = 'INSERT' THEN
    IF NEW.imprint_id IS NULL AND NEW.status = 'active' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
      INSERT INTO public.contact_lists (list_id, contact_id)
      VALUES (non_authors_list_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For UPDATE: Handle imprint changes
  IF TG_OP = 'UPDATE' THEN
    -- If imprint was removed (set to NULL) and contact is active, add to list
    IF OLD.imprint_id IS NOT NULL AND NEW.imprint_id IS NULL AND NEW.status = 'active' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
      INSERT INTO public.contact_lists (list_id, contact_id)
      VALUES (non_authors_list_id, NEW.id)
      ON CONFLICT DO NOTHING;
    -- If imprint was added (was NULL, now has value), remove from list
    ELSIF OLD.imprint_id IS NULL AND NEW.imprint_id IS NOT NULL THEN
      DELETE FROM public.contact_lists 
      WHERE list_id = non_authors_list_id AND contact_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on the contacts table
DROP TRIGGER IF EXISTS trigger_auto_add_non_authors ON public.contacts;
CREATE TRIGGER trigger_auto_add_non_authors
  AFTER INSERT OR UPDATE OF imprint_id, status, email ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_to_non_authors_list();
