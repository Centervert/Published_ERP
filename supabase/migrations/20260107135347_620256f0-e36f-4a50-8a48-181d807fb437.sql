-- Broaden contacts visibility to all authenticated users (internal CRM)
-- This fixes the UI counts/filters being limited by the existing restrictive SELECT policy.

ALTER POLICY "Users can view own or assigned contacts"
ON public.contacts
USING (auth.uid() IS NOT NULL);

-- Tighten UPDATE permissions so widening SELECT doesn't allow everyone to edit every contact.
ALTER POLICY "Authenticated users can update contacts"
ON public.contacts
USING (
  (auth.uid() = created_by)
  OR (auth.uid() = assigned_asc)
  OR (auth.uid() = assigned_ae)
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
  OR has_role(auth.uid(), 'marketing'::public.app_role)
);
