-- Fix user_email_connections RLS - users should ONLY see their own tokens
DROP POLICY IF EXISTS "Service role can manage all connections" ON public.user_email_connections;
DROP POLICY IF EXISTS "Users can delete own email connections" ON public.user_email_connections;
DROP POLICY IF EXISTS "Users can view own email connections" ON public.user_email_connections;

-- Recreate with proper policies
CREATE POLICY "Users can view own email connections" 
ON public.user_email_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email connections" 
ON public.user_email_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email connections" 
ON public.user_email_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email connections" 
ON public.user_email_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix email_events - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can read email events" ON public.email_events;
CREATE POLICY "Authenticated users can read email events" 
ON public.email_events 
FOR SELECT 
TO authenticated
USING (true);

-- Fix email_queue - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view email_queue" ON public.email_queue;
CREATE POLICY "Authenticated users can view email_queue" 
ON public.email_queue 
FOR SELECT 
TO authenticated
USING (true);

-- Fix contact_activity - require authentication
DROP POLICY IF EXISTS "Authenticated users can view contact_activity" ON public.contact_activity;
CREATE POLICY "Authenticated users can view contact_activity" 
ON public.contact_activity 
FOR SELECT 
TO authenticated
USING (true);

-- Fix contacts - require authentication
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (true);

-- Fix campaigns - require authentication
DROP POLICY IF EXISTS "Marketing and authenticated can view campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can view campaigns" 
ON public.campaigns 
FOR SELECT 
TO authenticated
USING (true);

-- Fix deals - require authentication
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.deals;
CREATE POLICY "Authenticated users can view deals" 
ON public.deals 
FOR SELECT 
TO authenticated
USING (true);

-- Fix products - require authentication
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (true);

-- Fix imprints - require authentication
DROP POLICY IF EXISTS "Marketing and authenticated can view imprints" ON public.imprints;
CREATE POLICY "Authenticated users can view imprints" 
ON public.imprints 
FOR SELECT 
TO authenticated
USING (true);

-- Fix profiles - require authentication (still allow anyone authenticated to see team profiles)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Fix commission_tiers - require authentication
DROP POLICY IF EXISTS "Authenticated users can view commission tiers" ON public.commission_tiers;
CREATE POLICY "Authenticated users can view commission tiers" 
ON public.commission_tiers 
FOR SELECT 
TO authenticated
USING (true);

-- Fix contact_communications - require authentication
DROP POLICY IF EXISTS "Authenticated users can view contact_communications" ON public.contact_communications;
CREATE POLICY "Authenticated users can view contact_communications" 
ON public.contact_communications 
FOR SELECT 
TO authenticated
USING (true);