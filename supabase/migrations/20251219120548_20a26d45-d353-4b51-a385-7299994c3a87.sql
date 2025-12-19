-- Add active status to profiles for placeholder/inactive users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add index for filtering active users
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);

-- Allow inserting placeholder profiles (no auth.users entry needed for these)
-- We need a policy that allows authenticated users to insert placeholder profiles
CREATE POLICY "Authenticated users can create placeholder profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (active = false);