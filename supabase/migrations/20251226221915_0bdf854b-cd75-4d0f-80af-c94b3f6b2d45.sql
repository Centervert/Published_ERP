-- Create staff table for internal team members
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identity
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  title TEXT DEFAULT 'Author Success Coach',
  
  -- Categorization
  department TEXT DEFAULT 'sales',
  
  -- Link to system user (NULL until invited/activated)
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_staff_email ON public.staff(email);
CREATE INDEX idx_staff_user_id ON public.staff(user_id);
CREATE INDEX idx_staff_department ON public.staff(department);
CREATE INDEX idx_staff_active ON public.staff(active) WHERE active = true;

-- Updated at trigger
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view staff"
  ON public.staff FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert staff"
  ON public.staff FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update staff"
  ON public.staff FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete staff"
  ON public.staff FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Seed the 9 sales reps
INSERT INTO public.staff (full_name, email, phone, title, department) VALUES
  ('Brian Cook', 'bcook@authorservices.com', '689-686-9323', 'Author Success Coach', 'sales'),
  ('Cari Caryl', 'ccaryl@authorservices.com', '321-204-3920', 'Author Success Coach', 'sales'),
  ('Chris Shingleton', 'cshingleton@authorservices.com', '407-754-2941', 'Author Success Coach', 'sales'),
  ('Gina Fleming', 'gfleming@authorservices.com', '407-949-3047', 'Author Success Coach', 'sales'),
  ('Heather Saylor', 'hsaylor@authorservices.com', '689-278-1520', 'Author Success Coach', 'sales'),
  ('Lisa Waters', 'lwaters@authorservices.com', '407-214-9081', 'Author Success Coach', 'sales'),
  ('Shell Micheal', 'smichael@authorservices.com', '407-206-6264', 'Author Success Coach', 'sales'),
  ('Thomas Higgins', 'thiggins@authorservices.com', '407-216-2660', 'Author Success Coach', 'sales'),
  ('Sylvia Burleigh', 'sburleigh@authorservices.com', '407-949-3025', 'Author Success Coach', 'sales');

-- Add staff references to contacts table
ALTER TABLE public.contacts
  ADD COLUMN staff_asc_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN staff_ae_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE INDEX idx_contacts_staff_asc ON public.contacts(staff_asc_id);
CREATE INDEX idx_contacts_staff_ae ON public.contacts(staff_ae_id);

COMMENT ON COLUMN public.contacts.staff_asc_id IS 'Preferred: Reference to staff table for ASC assignment';
COMMENT ON COLUMN public.contacts.staff_ae_id IS 'Preferred: Reference to staff table for AE assignment';