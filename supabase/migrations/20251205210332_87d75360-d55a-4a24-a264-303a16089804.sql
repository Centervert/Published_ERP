-- Phase 3: Email Templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  preview_text TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RLS for templates
CREATE POLICY "Authenticated users can view templates"
  ON public.templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update templates"
  ON public.templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete templates"
  ON public.templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for templates updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 4: Campaigns
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  html_content TEXT NOT NULL,
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS for campaigns
CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for campaigns updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign recipients (which lists to send to)
CREATE TABLE public.campaign_lists (
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, list_id)
);

ALTER TABLE public.campaign_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage campaign_lists"
  ON public.campaign_lists FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Email queue for batch sending
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email_queue"
  ON public.email_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can manage email_queue"
  ON public.email_queue FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add campaign foreign key to email_events
ALTER TABLE public.email_events 
  ADD CONSTRAINT fk_email_events_campaign 
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_email_queue_campaign ON public.email_queue(campaign_id);
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- Storage bucket for email assets
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true);

-- Storage policies for email-assets
CREATE POLICY "Anyone can view email assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets');

CREATE POLICY "Authenticated users can upload email assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-assets');

CREATE POLICY "Authenticated users can update email assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-assets');

CREATE POLICY "Admins can delete email assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));