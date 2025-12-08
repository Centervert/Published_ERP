
-- Phase 1B: Create enums and tables for Deals & Products

-- 1. Create product_category enum
CREATE TYPE public.product_category AS ENUM ('format', 'bundle', 'package', 'service', 'add_on');

-- 2. Create deal_stage enum
CREATE TYPE public.deal_stage AS ENUM ('new', 'outreach', 'contacted', 'qualified', 'nurturing', 'proposal_sent', 'won', 'lost', 'not_interested');

-- 3. Create products table with tiered pricing
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL DEFAULT 'service',
  cost_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  is_package BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create package_items junction table
CREATE TABLE public.package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, item_id)
);

-- 5. Create deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  assigned_asc UUID REFERENCES auth.users(id),
  stage deal_stage NOT NULL DEFAULT 'new',
  outreach_count INTEGER NOT NULL DEFAULT 0 CHECK (outreach_count >= 0 AND outreach_count <= 6),
  total_value DECIMAL(10,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  commission_locked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Create commission_tiers table
CREATE TABLE public.commission_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_amount DECIMAL(10,2) NOT NULL,
  max_amount DECIMAL(10,2),
  percentage DECIMAL(5,2) NOT NULL,
  milestone_bonus DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Insert commission tiers
INSERT INTO public.commission_tiers (min_amount, max_amount, percentage, milestone_bonus) VALUES
  (0, 9999.99, 6.00, 0),
  (10000, 14999.99, 7.00, 0),
  (15000, 19999.99, 8.00, 0),
  (20000, 24999.99, 9.00, 0),
  (25000, 29999.99, 10.00, 0),
  (30000, 34999.99, 11.00, 0),
  (35000, 39999.99, 12.00, 0),
  (40000, 54999.99, 12.00, 500),
  (55000, NULL, 12.00, 1000);

-- 8. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

-- 9. Products RLS policies
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can create products"
  ON public.products FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete products"
  ON public.products FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- 10. Package items RLS policies
CREATE POLICY "Authenticated users can view package items"
  ON public.package_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage package items"
  ON public.package_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- 11. Deals RLS policies
CREATE POLICY "Authenticated users can view deals"
  ON public.deals FOR SELECT
  USING (true);

CREATE POLICY "ASC and admins can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND (
      has_role(auth.uid(), 'asc') OR 
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "ASC can update own deals admins can update all"
  ON public.deals FOR UPDATE
  USING (
    assigned_asc = auth.uid() OR 
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete deals"
  ON public.deals FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'));

-- 12. Commission tiers RLS policies
CREATE POLICY "Authenticated users can view commission tiers"
  ON public.commission_tiers FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage commission tiers"
  ON public.commission_tiers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 13. Create updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create function to calculate commission
CREATE OR REPLACE FUNCTION public.calculate_commission(sale_amount DECIMAL, cumulative_sales DECIMAL)
RETURNS TABLE(commission DECIMAL, tier_percentage DECIMAL, milestone_bonus DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT ct.percentage, ct.milestone_bonus INTO tier_percentage, milestone_bonus
  FROM public.commission_tiers ct
  WHERE cumulative_sales >= ct.min_amount
    AND (ct.max_amount IS NULL OR cumulative_sales <= ct.max_amount)
  LIMIT 1;
  
  commission := sale_amount * (COALESCE(tier_percentage, 6) / 100);
  
  RETURN NEXT;
END;
$$;

-- 15. Create indexes
CREATE INDEX idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX idx_deals_assigned_asc ON public.deals(assigned_asc);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);
