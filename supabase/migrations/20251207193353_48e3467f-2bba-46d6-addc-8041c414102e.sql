-- Create table to store user email connections (OAuth tokens)
CREATE TABLE public.user_email_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'outlook',
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.user_email_connections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own connections
CREATE POLICY "Users can view own email connections" 
ON public.user_email_connections 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own email connections" 
ON public.user_email_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- System can manage all connections (for OAuth callback)
CREATE POLICY "Service role can manage all connections" 
ON public.user_email_connections 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_user_email_connections_updated_at
BEFORE UPDATE ON public.user_email_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();