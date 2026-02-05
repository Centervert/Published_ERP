-- Create giveaway_entries table for questionnaire submissions
CREATE TABLE public.giveaway_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  phone_normalized text,
  city text,
  state text,
  referrer_name text,
  referrer_email text,
  genres text[] DEFAULT '{}',
  marketing_services_used text[] DEFAULT '{}',
  primary_marketing_reason text,
  has_published_before boolean,
  writing_stage text,
  marketing_confidence text,
  manuscript_file_path text,
  manuscript_file_name text,
  traffic_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referral_code text UNIQUE,
  entry_count integer NOT NULL DEFAULT 1,
  ip_address text,
  user_agent text
);

-- Create giveaway_page_views table for analytics tracking
CREATE TABLE public.giveaway_page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  traffic_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ip_address text,
  user_agent text,
  session_id text NOT NULL,
  questionnaire_started boolean NOT NULL DEFAULT false,
  questionnaire_completed boolean NOT NULL DEFAULT false,
  questionnaire_progress integer NOT NULL DEFAULT 0,
  time_on_page_seconds integer DEFAULT 0
);

-- Create giveaway_analytics table for aggregated metrics
CREATE TABLE public.giveaway_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  traffic_source text,
  page_views integer NOT NULL DEFAULT 0,
  cta_clicks integer NOT NULL DEFAULT 0,
  questionnaire_starts integer NOT NULL DEFAULT 0,
  questionnaire_completions integer NOT NULL DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  avg_time_on_page integer DEFAULT 0,
  UNIQUE(date, traffic_source)
);

-- Create indexes for better query performance
CREATE INDEX idx_giveaway_entries_email ON public.giveaway_entries(email);
CREATE INDEX idx_giveaway_entries_created_at ON public.giveaway_entries(created_at);
CREATE INDEX idx_giveaway_entries_referral_code ON public.giveaway_entries(referral_code);
CREATE INDEX idx_giveaway_page_views_session_id ON public.giveaway_page_views(session_id);
CREATE INDEX idx_giveaway_page_views_created_at ON public.giveaway_page_views(created_at);
CREATE INDEX idx_giveaway_analytics_date ON public.giveaway_analytics(date);

-- Enable RLS on all tables
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for giveaway_entries
-- Public can insert (submit entries)
CREATE POLICY "Public can submit giveaway entries"
  ON public.giveaway_entries
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view entries
CREATE POLICY "Admins can view giveaway entries"
  ON public.giveaway_entries
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Only admins can update entries
CREATE POLICY "Admins can update giveaway entries"
  ON public.giveaway_entries
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can delete entries
CREATE POLICY "Super admins can delete giveaway entries"
  ON public.giveaway_entries
  FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for giveaway_page_views
-- Public can insert page views
CREATE POLICY "Public can log page views"
  ON public.giveaway_page_views
  FOR INSERT
  WITH CHECK (true);

-- Public can update their own session (by session_id)
CREATE POLICY "Public can update own session"
  ON public.giveaway_page_views
  FOR UPDATE
  USING (true);

-- Only admins can view page views
CREATE POLICY "Admins can view page views"
  ON public.giveaway_page_views
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for giveaway_analytics
-- Only admins can view analytics
CREATE POLICY "Admins can view giveaway analytics"
  ON public.giveaway_analytics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Only system/admins can manage analytics
CREATE POLICY "Admins can manage giveaway analytics"
  ON public.giveaway_analytics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create storage bucket for manuscripts (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('giveaway-manuscripts', 'giveaway-manuscripts', false);

-- Storage policies for giveaway-manuscripts bucket
-- Public can upload manuscripts
CREATE POLICY "Public can upload manuscripts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'giveaway-manuscripts');

-- Only admins can view manuscripts
CREATE POLICY "Admins can view manuscripts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'giveaway-manuscripts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

-- Only admins can delete manuscripts
CREATE POLICY "Admins can delete manuscripts"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'giveaway-manuscripts' AND has_role(auth.uid(), 'super_admin'::app_role));