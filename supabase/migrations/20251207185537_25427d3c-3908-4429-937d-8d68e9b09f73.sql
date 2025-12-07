-- Create books table for tracking author publications
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast lookups by contact
CREATE INDEX idx_books_contact_id ON public.books(contact_id);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create books"
ON public.books FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update books"
ON public.books FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete books"
ON public.books FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();