-- Drop the existing foreign keys that reference auth.users
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_assigned_asc_fkey;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_assigned_bss_fkey;

-- Re-create them referencing the public.profiles table instead
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_assigned_asc_fkey
    FOREIGN KEY (assigned_asc) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_assigned_ae_fkey
    FOREIGN KEY (assigned_ae) REFERENCES public.profiles(id) ON DELETE SET NULL;