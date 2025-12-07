-- Replace assigned_to with two specific assignment fields
ALTER TABLE public.contacts DROP COLUMN IF EXISTS assigned_to;

-- Add ASC (Author Success Coach) assignment - for leads
ALTER TABLE public.contacts ADD COLUMN assigned_asc uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add BSS (Book Support Specialist) assignment - for authors
ALTER TABLE public.contacts ADD COLUMN assigned_bss uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for faster filtering
CREATE INDEX idx_contacts_assigned_asc ON public.contacts(assigned_asc);
CREATE INDEX idx_contacts_assigned_bss ON public.contacts(assigned_bss);