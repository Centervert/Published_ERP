-- Development Documentation System Tables (Isolated, Non-Destructive)
-- All tables prefixed with dev_ for easy identification and removal

-- Main document container
CREATE TABLE public.dev_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'active',  -- active, archived
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev_documents
CREATE POLICY "Authenticated users can view dev_documents"
ON public.dev_documents FOR SELECT
USING (true);

CREATE POLICY "Admins can insert dev_documents"
ON public.dev_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update dev_documents"
ON public.dev_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete dev_documents"
ON public.dev_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Immutable version history for markdown
CREATE TABLE public.dev_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.dev_documents(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  content_md text NOT NULL,
  change_summary text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  UNIQUE(document_id, version_number)
);

-- Enable RLS
ALTER TABLE public.dev_document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev_document_versions
CREATE POLICY "Authenticated users can view dev_document_versions"
ON public.dev_document_versions FOR SELECT
USING (true);

CREATE POLICY "Admins can insert dev_document_versions"
ON public.dev_document_versions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Structured items (decisions, risks, milestones, scope items, releases)
CREATE TABLE public.dev_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.dev_documents(id) ON DELETE CASCADE,
  item_type text NOT NULL,  -- decision, risk, blocker, milestone, scope, link, release
  title text NOT NULL,
  body_md text,
  status text,  -- proposed, accepted, deprecated, open, mitigating, closed
  severity text,  -- low, medium, high, critical
  owner_name text,
  owner_user_id uuid,
  due_date date,
  phase text,  -- phase_1, phase_2, phase_3
  related_type text,  -- For loose references: contact, deal, campaign, etc.
  related_id text,    -- UUID as text for loose coupling
  tags text[],
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev_items
CREATE POLICY "Authenticated users can view dev_items"
ON public.dev_items FOR SELECT
USING (true);

CREATE POLICY "Admins can insert dev_items"
ON public.dev_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update dev_items"
ON public.dev_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete dev_items"
ON public.dev_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Meetings with notes
CREATE TABLE public.dev_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.dev_documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date timestamptz,
  attendees text[],
  notes_md text,
  outcomes_md text,
  action_items_md text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev_meetings
CREATE POLICY "Authenticated users can view dev_meetings"
ON public.dev_meetings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert dev_meetings"
ON public.dev_meetings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update dev_meetings"
ON public.dev_meetings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete dev_meetings"
ON public.dev_meetings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Link meetings to items (decisions, action items)
CREATE TABLE public.dev_meeting_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.dev_meetings(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.dev_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_meeting_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dev_meeting_links
CREATE POLICY "Authenticated users can view dev_meeting_links"
ON public.dev_meeting_links FOR SELECT
USING (true);

CREATE POLICY "Admins can manage dev_meeting_links"
ON public.dev_meeting_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_dev_documents_updated_at
BEFORE UPDATE ON public.dev_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_items_updated_at
BEFORE UPDATE ON public.dev_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_meetings_updated_at
BEFORE UPDATE ON public.dev_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_dev_items_document_id ON public.dev_items(document_id);
CREATE INDEX idx_dev_items_item_type ON public.dev_items(item_type);
CREATE INDEX idx_dev_items_status ON public.dev_items(status);
CREATE INDEX idx_dev_items_is_archived ON public.dev_items(is_archived);
CREATE INDEX idx_dev_document_versions_document_id ON public.dev_document_versions(document_id);
CREATE INDEX idx_dev_meetings_document_id ON public.dev_meetings(document_id);