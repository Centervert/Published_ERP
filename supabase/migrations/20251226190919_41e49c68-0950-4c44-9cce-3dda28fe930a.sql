-- Fix campaigns deletion permissions so creators can delete their own campaigns

-- Drop overly-restrictive policy (admin-only)
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;

-- Allow campaign creators (and admins) to delete campaigns
CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);
