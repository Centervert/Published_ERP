-- Add foreign key from contact_activity.created_by to profiles.id
ALTER TABLE public.contact_activity
ADD CONSTRAINT contact_activity_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;