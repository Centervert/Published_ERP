-- Add assigned_to column to contacts table for Author Success Coach assignment
ALTER TABLE public.contacts 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster filtering by assigned user
CREATE INDEX idx_contacts_assigned_to ON public.contacts(assigned_to);