-- Drop the existing FK to auth.users and create one to public.profiles
ALTER TABLE public.contact_notes
DROP CONSTRAINT contact_notes_created_by_fkey;

ALTER TABLE public.contact_notes
ADD CONSTRAINT contact_notes_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Do the same for contact_tasks
ALTER TABLE public.contact_tasks
DROP CONSTRAINT IF EXISTS contact_tasks_created_by_fkey;

ALTER TABLE public.contact_tasks
ADD CONSTRAINT contact_tasks_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id);