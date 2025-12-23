-- Fix contacts table RLS policy to restrict visibility
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;

-- Create new restrictive policy: users can only see contacts they created or are assigned to
CREATE POLICY "Users can view own or assigned contacts"
ON public.contacts FOR SELECT
USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_asc OR
  auth.uid() = assigned_ae OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'marketing'::app_role)
);