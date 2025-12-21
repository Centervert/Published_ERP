
-- Add 'marketing' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';

-- Update campaigns policies to allow marketing role
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
CREATE POLICY "Marketing and authenticated can view campaigns" 
ON public.campaigns FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
CREATE POLICY "Marketing and authenticated can create campaigns" 
ON public.campaigns FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
CREATE POLICY "Marketing and authenticated can update campaigns" 
ON public.campaigns FOR UPDATE 
USING (true);

-- Update templates policies
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.templates;
CREATE POLICY "Marketing and authenticated can view templates" 
ON public.templates FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.templates;
CREATE POLICY "Marketing and authenticated can create templates" 
ON public.templates FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.templates;
CREATE POLICY "Marketing and authenticated can update templates" 
ON public.templates FOR UPDATE 
USING (true);

-- Update imprints policies  
DROP POLICY IF EXISTS "Authenticated users can view imprints" ON public.imprints;
CREATE POLICY "Marketing and authenticated can view imprints" 
ON public.imprints FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create imprints" ON public.imprints;
CREATE POLICY "Marketing and authenticated can create imprints" 
ON public.imprints FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can update imprints" ON public.imprints;
CREATE POLICY "Marketing and authenticated can update imprints" 
ON public.imprints FOR UPDATE 
USING (true);

-- Update lists policies (needed for campaign targeting)
DROP POLICY IF EXISTS "Authenticated users can view lists" ON public.lists;
CREATE POLICY "Marketing and authenticated can view lists" 
ON public.lists FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create lists" ON public.lists;
CREATE POLICY "Marketing and authenticated can create lists" 
ON public.lists FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can update lists" ON public.lists;
CREATE POLICY "Marketing and authenticated can update lists" 
ON public.lists FOR UPDATE 
USING (true);
