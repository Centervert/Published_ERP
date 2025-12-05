-- Contact lists for organization
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lists
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- Tags for flexible categorization
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Many-to-many: contacts <-> lists
CREATE TABLE public.contact_lists (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, list_id)
);

-- Enable RLS on contact_lists
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;

-- Many-to-many: contacts <-> tags
CREATE TABLE public.contact_tags (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

-- Enable RLS on contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Add foreign key from email_events to contacts
ALTER TABLE public.email_events 
  ADD CONSTRAINT fk_email_events_contact 
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at);

-- RLS Policies for lists
CREATE POLICY "Authenticated users can view lists"
  ON public.lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create lists"
  ON public.lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update lists"
  ON public.lists FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete lists"
  ON public.lists FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tags
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update tags"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contacts
CREATE POLICY "Authenticated users can view contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for contact_lists
CREATE POLICY "Authenticated users can view contact_lists"
  ON public.contact_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage contact_lists"
  ON public.contact_lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for contact_tags
CREATE POLICY "Authenticated users can view contact_tags"
  ON public.contact_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage contact_tags"
  ON public.contact_tags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for lists updated_at
CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for contacts updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();