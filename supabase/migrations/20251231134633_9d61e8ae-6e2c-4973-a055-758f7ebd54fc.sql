-- Allow all authenticated users to view basic profile info (for showing author names)
CREATE POLICY "Authenticated users can view profiles for name display"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);