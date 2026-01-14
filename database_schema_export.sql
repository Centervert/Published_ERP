-- ============================================
-- AUTHOR SERVICES PLATFORM - DATABASE SCHEMA
-- ============================================
-- Generated: 2026-01-14
-- Database: PostgreSQL (Supabase/Lovable Cloud)
-- Schema: public
-- 
-- This file contains the complete database structure for recreation.
-- Execute in order: Enums → Tables → Foreign Keys → Indexes → Functions → Triggers → RLS Policies
-- ============================================

-- ===================
-- 1. ENUMS
-- ===================

-- User roles for access control
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'asc',
  'ae',
  'marketing',
  'member'
);

-- Email campaign lifecycle states
CREATE TYPE public.campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed'
);

-- Sales pipeline stages
CREATE TYPE public.deal_stage AS ENUM (
  'new',
  'outreach',
  'contacted',
  'qualified',
  'nurturing',
  'proposal_sent',
  'won',
  'lost',
  'not_interested'
);

-- Contact/lead origin tracking
CREATE TYPE public.lead_source AS ENUM (
  'website_landing_page',
  'manual_entry',
  'marketing_partner',
  'import'
);

-- Product catalog categories
CREATE TYPE public.product_category AS ENUM (
  'format',
  'bundle',
  'package',
  'service',
  'add_on'
);


-- ===================
-- 2. TABLES
-- ===================

-- --------------------
-- 2.1 Core Tables
-- --------------------

-- User profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,  -- References auth.users(id)
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  title TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User role assignments (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- References auth.users(id)
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- --------------------
-- 2.2 Company & Brands
-- --------------------

-- Parent company configuration (singleton)
CREATE TABLE public.company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  tagline TEXT,
  phone TEXT,
  legal_address TEXT,
  website_url TEXT,
  primary_color TEXT DEFAULT '#1a1a2e',
  secondary_color TEXT DEFAULT '#16213e',
  accent_color TEXT DEFAULT '#0f3460',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#333333',
  heading_font TEXT DEFAULT 'Roboto',
  body_font TEXT DEFAULT 'Open Sans',
  logo_url TEXT,
  logo_dark_url TEXT,
  icon_url TEXT,
  favicon_url TEXT,
  header_image_url TEXT,
  header_image_dark_url TEXT,
  footer_image_url TEXT,
  brand_voice TEXT,
  from_name TEXT,
  from_email TEXT,
  reply_to_email TEXT,
  footer_copyright_template TEXT DEFAULT '© {year} {company_name}. All rights reserved.',
  footer_reason_template TEXT DEFAULT 'You received this email because you are subscribed to our mailing list.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Publishing imprints/brands
CREATE TABLE public.imprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  website_url TEXT,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT,
  brand_voice TEXT,
  primary_color TEXT DEFAULT '#1a1a2e',
  secondary_color TEXT DEFAULT '#16213e',
  accent_color TEXT DEFAULT '#0f3460',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#333333',
  heading_font TEXT DEFAULT 'Roboto',
  body_font TEXT DEFAULT 'Open Sans',
  logo_url TEXT,
  logo_dark_url TEXT,
  icon_url TEXT,
  header_image_url TEXT,
  header_image_dark_url TEXT,
  footer_image_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------
-- 2.3 Staff & Users
-- --------------------

-- Staff directory (may or may not have portal access)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT DEFAULT 'Author Success Coach',
  department TEXT DEFAULT 'sales',
  active BOOLEAN DEFAULT true,
  user_id UUID,  -- References profiles(id) if has portal access
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- OAuth email connections for personal email integration
CREATE TABLE public.user_email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- References profiles(id)
  provider TEXT NOT NULL DEFAULT 'outlook',
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_inbox_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------
-- 2.4 CRM Tables
-- --------------------

-- Core contacts/leads
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  search_name TEXT,
  phone TEXT,
  phone_normalized TEXT,
  address TEXT,
  timezone TEXT,
  contact_type TEXT DEFAULT 'lead',  -- lead, author, bad
  status TEXT DEFAULT 'active',  -- active, unsubscribed, bounced, complained
  lead_source lead_source DEFAULT 'manual_entry',
  lead_source_detail TEXT,
  imprint_id UUID,
  notes TEXT,
  assigned_asc UUID,  -- References auth.users(id)
  assigned_ae UUID,   -- References auth.users(id)
  staff_asc_id UUID,  -- References staff(id)
  staff_ae_id UUID,   -- References staff(id)
  assigned_asc_text TEXT,  -- Legacy text assignment
  assigned_ae_text TEXT,   -- Legacy text assignment
  email_validation_result TEXT,  -- deliverable, undeliverable, catch_all, do_not_send, unknown
  email_validation_risk TEXT,    -- low, medium, high
  email_validated_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dynamic social/website links for contacts
CREATE TABLE public.contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  link_type TEXT NOT NULL,  -- author_website, amazon, facebook, twitter, instagram, linkedin, goodreads, other
  url TEXT NOT NULL,
  label TEXT,  -- Custom label for 'other' type
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CRM activity audit trail
CREATE TABLE public.contact_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  activity_type TEXT NOT NULL,  -- contact_created, contact_updated, note_added, link_added, link_removed, assignment_changed
  description TEXT NOT NULL,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email and call history for contacts
CREATE TABLE public.contact_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  deal_id UUID,
  type TEXT NOT NULL,  -- email, call
  direction TEXT NOT NULL,  -- inbound, outbound
  subject TEXT,
  body TEXT,
  notes TEXT,
  status TEXT DEFAULT 'sent',  -- sent, draft, failed
  outcome TEXT,
  duration_seconds INTEGER,
  external_id TEXT,  -- External message ID (e.g., Outlook)
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes for contacts
CREATE TABLE public.contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  deal_id UUID,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks for contacts
CREATE TABLE public.contact_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  deal_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',  -- low, medium, high
  due_date TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact organization/segmentation lists
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: contacts ↔ lists
CREATE TABLE public.contact_lists (
  contact_id UUID NOT NULL,
  list_id UUID NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, list_id)
);

-- Flexible categorization labels
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: contacts ↔ tags
CREATE TABLE public.contact_tags (
  contact_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

-- --------------------
-- 2.5 Sales Tables
-- --------------------

-- Sales pipeline deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  name TEXT,
  stage deal_stage NOT NULL DEFAULT 'new',
  total_value NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  commission_locked BOOLEAN NOT NULL DEFAULT false,
  outreach_count INTEGER NOT NULL DEFAULT 0,
  book_title TEXT,
  book_description TEXT,
  writing_status TEXT,
  goals TEXT,
  notes TEXT,
  assigned_asc UUID,
  closed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Book tracking for authors
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',  -- draft, in_progress, published
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product catalog
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL DEFAULT 'service',
  cost_price NUMERIC,
  min_price NUMERIC,
  retail_price NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  is_package BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Package contents (junction for products)
CREATE TABLE public.package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tiered commission structure
CREATE TABLE public.commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount NUMERIC NOT NULL,
  max_amount NUMERIC,  -- NULL = unlimited
  percentage NUMERIC NOT NULL,
  milestone_bonus NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------
-- 2.6 Marketing Tables
-- --------------------

-- Reusable email templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  preview_text TEXT,
  blocks_json JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email marketing campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to_email TEXT,
  route_replies_to_asc BOOLEAN DEFAULT false,
  template_id UUID,
  html_content TEXT NOT NULL,
  blocks_json JSONB,
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  scheduled_imprint_ids UUID[],
  scheduled_list_ids UUID[],
  scheduled_additional_recipients TEXT[],
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table: campaigns ↔ lists
CREATE TABLE public.campaign_lists (
  campaign_id UUID NOT NULL,
  list_id UUID NOT NULL,
  PRIMARY KEY (campaign_id, list_id)
);

-- Email tracking analytics
CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  contact_id UUID,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complained')),
  link_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------
-- 2.7 Import System
-- --------------------

-- CSV import job tracking
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_data TEXT,  -- Base64 file data
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  column_mapping JSONB,
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  created_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------
-- 2.8 Development Tables
-- --------------------

-- Development documentation projects
CREATE TABLE public.dev_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document version history
CREATE TABLE public.dev_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  content_md TEXT NOT NULL,
  change_summary TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Development items (tickets, features, risks, decisions, releases)
CREATE TABLE public.dev_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  item_type TEXT NOT NULL,  -- ticket, feature, risk, decision, release
  title TEXT NOT NULL,
  body_md TEXT,
  status TEXT,
  severity TEXT,
  priority INTEGER DEFAULT 0,
  phase TEXT,
  owner_name TEXT,
  owner_user_id UUID,
  due_date DATE,
  tags TEXT[],
  related_type TEXT,
  related_id TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meeting notes
CREATE TABLE public.dev_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ,
  attendees TEXT[],
  notes_md TEXT,
  outcomes_md TEXT,
  action_items_md TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links meetings to items discussed
CREATE TABLE public.dev_meeting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===================
-- 3. FOREIGN KEYS
-- ===================

-- Profiles (references auth.users - handled by Supabase)
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User roles
-- ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Imprints
ALTER TABLE public.imprints ADD CONSTRAINT imprints_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE SET NULL;

-- Staff
ALTER TABLE public.staff ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- User email connections
ALTER TABLE public.user_email_connections ADD CONSTRAINT user_email_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Contacts
ALTER TABLE public.contacts ADD CONSTRAINT contacts_imprint_id_fkey FOREIGN KEY (imprint_id) REFERENCES public.imprints(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_staff_asc_id_fkey FOREIGN KEY (staff_asc_id) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_staff_ae_id_fkey FOREIGN KEY (staff_ae_id) REFERENCES public.staff(id) ON DELETE SET NULL;

-- Contact links
ALTER TABLE public.contact_links ADD CONSTRAINT contact_links_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Contact activity
ALTER TABLE public.contact_activity ADD CONSTRAINT contact_activity_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_activity ADD CONSTRAINT contact_activity_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Contact communications
ALTER TABLE public.contact_communications ADD CONSTRAINT contact_communications_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_communications ADD CONSTRAINT contact_communications_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
ALTER TABLE public.contact_communications ADD CONSTRAINT contact_communications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Contact notes
ALTER TABLE public.contact_notes ADD CONSTRAINT contact_notes_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_notes ADD CONSTRAINT contact_notes_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
ALTER TABLE public.contact_notes ADD CONSTRAINT contact_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Contact tasks
ALTER TABLE public.contact_tasks ADD CONSTRAINT contact_tasks_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_tasks ADD CONSTRAINT contact_tasks_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
ALTER TABLE public.contact_tasks ADD CONSTRAINT contact_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Contact lists junction
ALTER TABLE public.contact_lists ADD CONSTRAINT contact_lists_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_lists ADD CONSTRAINT contact_lists_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

-- Contact tags junction
ALTER TABLE public.contact_tags ADD CONSTRAINT contact_tags_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_tags ADD CONSTRAINT contact_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

-- Deals
ALTER TABLE public.deals ADD CONSTRAINT deals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.deals ADD CONSTRAINT deals_assigned_asc_fkey FOREIGN KEY (assigned_asc) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Books
ALTER TABLE public.books ADD CONSTRAINT books_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.books ADD CONSTRAINT books_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Package items
ALTER TABLE public.package_items ADD CONSTRAINT package_items_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.package_items ADD CONSTRAINT package_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Templates
ALTER TABLE public.templates ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Campaigns
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Campaign lists junction
ALTER TABLE public.campaign_lists ADD CONSTRAINT campaign_lists_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_lists ADD CONSTRAINT campaign_lists_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;

-- Email events
ALTER TABLE public.email_events ADD CONSTRAINT email_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.email_events ADD CONSTRAINT email_events_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Dev document versions
ALTER TABLE public.dev_document_versions ADD CONSTRAINT dev_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dev_documents(id) ON DELETE CASCADE;

-- Dev items
ALTER TABLE public.dev_items ADD CONSTRAINT dev_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dev_documents(id) ON DELETE CASCADE;
ALTER TABLE public.dev_items ADD CONSTRAINT dev_items_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Dev meetings
ALTER TABLE public.dev_meetings ADD CONSTRAINT dev_meetings_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.dev_documents(id) ON DELETE CASCADE;

-- Dev meeting links
ALTER TABLE public.dev_meeting_links ADD CONSTRAINT dev_meeting_links_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.dev_meetings(id) ON DELETE CASCADE;
ALTER TABLE public.dev_meeting_links ADD CONSTRAINT dev_meeting_links_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.dev_items(id) ON DELETE CASCADE;


-- ===================
-- 4. INDEXES
-- ===================

-- Contacts
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_created_at ON public.contacts(created_at);
CREATE INDEX idx_contacts_assigned_asc ON public.contacts(assigned_asc);
CREATE INDEX idx_contacts_imprint_id ON public.contacts(imprint_id);
CREATE INDEX idx_contacts_search_name ON public.contacts(search_name);

-- Contact activity
CREATE INDEX idx_contact_activity_contact_id ON public.contact_activity(contact_id);
CREATE INDEX idx_contact_activity_created_at ON public.contact_activity(created_at DESC);

-- Email events
CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_contact ON public.email_events(contact_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_campaign_id ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_campaign_event_type ON public.email_events(campaign_id, event_type);
CREATE INDEX idx_email_events_campaign_event_email ON public.email_events(campaign_id, event_type, email);

-- Campaigns
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

-- Dev items
CREATE INDEX idx_dev_items_document_id ON public.dev_items(document_id);
CREATE INDEX idx_dev_items_item_type ON public.dev_items(item_type);


-- ===================
-- 5. FUNCTIONS
-- ===================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Handle new user signup: create profile and assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  invited_role TEXT;
  final_role app_role;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
  
  -- Check for invited role in metadata
  invited_role := NEW.raw_user_meta_data ->> 'invited_role';
  
  -- Determine the final role
  IF is_first_user THEN
    final_role := 'admin'::app_role;
  ELSIF invited_role IS NOT NULL AND invited_role IN ('super_admin', 'admin', 'asc', 'ae', 'marketing', 'member') THEN
    final_role := invited_role::app_role;
  ELSE
    final_role := 'member'::app_role;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, final_role);
  
  RETURN NEW;
END;
$$;

-- Calculate commission based on tiered structure
CREATE OR REPLACE FUNCTION public.calculate_commission(sale_amount NUMERIC, cumulative_sales NUMERIC)
RETURNS TABLE(commission NUMERIC, tier_percentage NUMERIC, milestone_bonus NUMERIC)
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

-- Get campaign statistics aggregated in database
CREATE OR REPLACE FUNCTION public.get_campaign_stats(_campaign_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'sent', count(*) FILTER (WHERE event_type = 'sent'),
    'delivered', count(*) FILTER (WHERE event_type = 'delivered'),
    'opened', count(DISTINCT email) FILTER (WHERE event_type = 'opened'),
    'openedHuman', count(DISTINCT email) FILTER (WHERE event_type = 'opened' AND COALESCE(is_bot, false) = false),
    'clicked', count(DISTINCT email) FILTER (WHERE event_type = 'clicked'),
    'bounced', count(*) FILTER (WHERE event_type = 'bounced'),
    'complained', count(*) FILTER (WHERE event_type = 'complained'),
    'unsubscribed', count(*) FILTER (WHERE event_type = 'unsubscribed')
  )
  FROM public.email_events
  WHERE campaign_id = _campaign_id;
$$;

-- Get contact health statistics
CREATE OR REPLACE FUNCTION public.get_contact_health_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*)::text,
    'validated', COUNT(*) FILTER (WHERE email_validation_result IS NOT NULL)::text,
    'deliverable', COUNT(*) FILTER (WHERE email_validation_result = 'deliverable')::text,
    'undeliverable', COUNT(*) FILTER (WHERE email_validation_result = 'undeliverable')::text,
    'catchAll', COUNT(*) FILTER (WHERE email_validation_result = 'catch_all')::text,
    'doNotSend', COUNT(*) FILTER (WHERE email_validation_result = 'do_not_send')::text,
    'unknown', COUNT(*) FILTER (WHERE email_validation_result = 'unknown')::text,
    'lowRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'low')::text,
    'mediumRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'medium')::text,
    'highRisk', COUNT(*) FILTER (WHERE email_validation_risk = 'high')::text
  )
  FROM contacts
  WHERE email IS NOT NULL AND email != '';
$$;

-- Get recipient health counts for campaign targeting
CREATE OR REPLACE FUNCTION public.get_recipient_health_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH contact_health AS (
    SELECT 
      c.id,
      c.imprint_id,
      c.status,
      c.email,
      c.email_validation_result,
      CASE 
        WHEN c.email IS NULL OR c.email = '' THEN 'no_email'
        WHEN c.status != 'active' THEN 'inactive'
        WHEN c.email_validation_result = 'undeliverable' THEN 'undeliverable'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'bounced') THEN 'bounced'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'unsubscribed') THEN 'unsubscribed'
        WHEN EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = c.email AND ee.event_type = 'complained') THEN 'complained'
        WHEN c.email_validation_result = 'deliverable' THEN 'sendable'
        ELSE 'not_validated'
      END as health_status
    FROM contacts c
    WHERE c.status = 'active' AND c.email IS NOT NULL AND c.email != ''
  ),
  imprint_counts AS (
    SELECT 
      imprint_id::text as id,
      COUNT(*) FILTER (WHERE health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_health
    WHERE imprint_id IS NOT NULL
    GROUP BY imprint_id
  ),
  list_counts AS (
    SELECT 
      cl.list_id::text as id,
      COUNT(*) FILTER (WHERE ch.health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE ch.health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE ch.health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_lists cl
    JOIN contact_health ch ON ch.id = cl.contact_id
    GROUP BY cl.list_id
  ),
  totals AS (
    SELECT 
      COUNT(*) FILTER (WHERE health_status = 'sendable') as sendable,
      COUNT(*) FILTER (WHERE health_status = 'not_validated') as "notValidated",
      COUNT(*) FILTER (WHERE health_status IN ('no_email', 'bounced', 'unsubscribed', 'complained', 'undeliverable', 'inactive')) as excluded
    FROM contact_health
  ),
  exclusion_reasons AS (
    SELECT 
      COUNT(*) FILTER (WHERE health_status = 'no_email') as "noEmail",
      COUNT(*) FILTER (WHERE health_status = 'bounced') as bounced,
      COUNT(*) FILTER (WHERE health_status = 'unsubscribed') as unsubscribed,
      COUNT(*) FILTER (WHERE health_status = 'complained') as complained,
      COUNT(*) FILTER (WHERE health_status = 'undeliverable') as undeliverable
    FROM contact_health
  )
  SELECT jsonb_build_object(
    'total', (SELECT jsonb_build_object('sendable', sendable::text, 'notValidated', "notValidated"::text, 'excluded', excluded::text) FROM totals),
    'exclusionReasons', (SELECT jsonb_build_object('noEmail', "noEmail"::text, 'bounced', bounced::text, 'unsubscribed', unsubscribed::text, 'complained', complained::text, 'undeliverable', undeliverable::text) FROM exclusion_reasons),
    'byImprint', COALESCE((SELECT jsonb_object_agg(id, jsonb_build_object('sendable', sendable, 'notValidated', "notValidated", 'excluded', excluded)) FROM imprint_counts), '{}'::jsonb),
    'byList', COALESCE((SELECT jsonb_object_agg(id, jsonb_build_object('sendable', sendable, 'notValidated', "notValidated", 'excluded', excluded)) FROM list_counts), '{}'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Auto-add contacts to non-authors list when imprint is removed
CREATE OR REPLACE FUNCTION public.auto_add_to_non_authors_list()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  non_authors_list_id UUID;
BEGIN
  SELECT id INTO non_authors_list_id 
  FROM public.lists 
  WHERE name = 'Author Services (Non-Authors)';
  
  IF non_authors_list_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    IF NEW.imprint_id IS NULL AND NEW.status = 'active' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
      INSERT INTO public.contact_lists (list_id, contact_id)
      VALUES (non_authors_list_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.imprint_id IS NOT NULL AND NEW.imprint_id IS NULL AND NEW.status = 'active' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
      INSERT INTO public.contact_lists (list_id, contact_id)
      VALUES (non_authors_list_id, NEW.id)
      ON CONFLICT DO NOTHING;
    ELSIF OLD.imprint_id IS NULL AND NEW.imprint_id IS NOT NULL THEN
      DELETE FROM public.contact_lists 
      WHERE list_id = non_authors_list_id AND contact_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;


-- ===================
-- 6. TRIGGERS
-- ===================

-- Note: The auth.users trigger is handled by Supabase
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_imprints_updated_at
  BEFORE UPDATE ON public.imprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_updated_at
  BEFORE UPDATE ON public.company
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_documents_updated_at
  BEFORE UPDATE ON public.dev_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_items_updated_at
  BEFORE UPDATE ON public.dev_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dev_meetings_updated_at
  BEFORE UPDATE ON public.dev_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_notes_updated_at
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_tasks_updated_at
  BEFORE UPDATE ON public.contact_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_email_connections_updated_at
  BEFORE UPDATE ON public.user_email_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-add to non-authors list trigger
CREATE TRIGGER auto_add_contacts_to_non_authors
  AFTER INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_to_non_authors_list();


-- ===================
-- 7. ENABLE RLS
-- ===================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_meeting_links ENABLE ROW LEVEL SECURITY;


-- ===================
-- 8. RLS POLICIES
-- ===================

-- --------------------
-- 8.1 Profiles
-- --------------------
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated can insert placeholder profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (active = false OR auth.uid() = id);

-- --------------------
-- 8.2 User Roles
-- --------------------
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.3 Company
-- --------------------
CREATE POLICY "Authenticated users can view company"
  ON public.company FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update company"
  ON public.company FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.4 Imprints
-- --------------------
CREATE POLICY "Authenticated users can view imprints"
  ON public.imprints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert imprints"
  ON public.imprints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update imprints"
  ON public.imprints FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete imprints"
  ON public.imprints FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.5 Staff
-- --------------------
CREATE POLICY "Authenticated users can view staff"
  ON public.staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage staff"
  ON public.staff FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.6 User Email Connections
-- --------------------
CREATE POLICY "Users can manage own email connections"
  ON public.user_email_connections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --------------------
-- 8.7 Contacts
-- --------------------
CREATE POLICY "Users can view contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_asc 
    OR auth.uid() = assigned_ae
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'marketing')
  );

CREATE POLICY "Authenticated users can insert contacts"
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.8 Contact Links
-- --------------------
CREATE POLICY "Authenticated users can manage contact links"
  ON public.contact_links FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------
-- 8.9 Contact Activity
-- --------------------
CREATE POLICY "Authenticated users can view contact activity"
  ON public.contact_activity FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contact activity"
  ON public.contact_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- --------------------
-- 8.10 Contact Communications
-- --------------------
CREATE POLICY "Authenticated users can view communications"
  ON public.contact_communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert communications"
  ON public.contact_communications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own communications"
  ON public.contact_communications FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete communications"
  ON public.contact_communications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.11 Contact Notes
-- --------------------
CREATE POLICY "Authenticated users can view notes"
  ON public.contact_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notes"
  ON public.contact_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own notes"
  ON public.contact_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete notes"
  ON public.contact_notes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.12 Contact Tasks
-- --------------------
CREATE POLICY "Authenticated users can view tasks"
  ON public.contact_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON public.contact_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update tasks"
  ON public.contact_tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete tasks"
  ON public.contact_tasks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.13 Lists
-- --------------------
CREATE POLICY "Authenticated users can view lists"
  ON public.lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lists"
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
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.14 Contact Lists (Junction)
-- --------------------
CREATE POLICY "Authenticated users can manage contact lists"
  ON public.contact_lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------
-- 8.15 Tags
-- --------------------
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.16 Contact Tags (Junction)
-- --------------------
CREATE POLICY "Authenticated users can manage contact tags"
  ON public.contact_tags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------
-- 8.17 Deals
-- --------------------
CREATE POLICY "Authenticated users can view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ASC and admins can insert deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.has_role(auth.uid(), 'asc') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Assigned ASC or admins can update deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_asc OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can delete deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.18 Books
-- --------------------
CREATE POLICY "Authenticated users can view books"
  ON public.books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.19 Products
-- --------------------
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.20 Package Items
-- --------------------
CREATE POLICY "Authenticated users can view package items"
  ON public.package_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage package items"
  ON public.package_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.21 Commission Tiers
-- --------------------
CREATE POLICY "Authenticated users can view commission tiers"
  ON public.commission_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage commission tiers"
  ON public.commission_tiers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.22 Templates
-- --------------------
CREATE POLICY "Authenticated users can view templates"
  ON public.templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON public.templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update templates"
  ON public.templates FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete templates"
  ON public.templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.23 Campaigns
-- --------------------
CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Creator or admins can delete campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- --------------------
-- 8.24 Campaign Lists (Junction)
-- --------------------
CREATE POLICY "Authenticated users can manage campaign lists"
  ON public.campaign_lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------
-- 8.25 Email Events
-- --------------------
CREATE POLICY "Authenticated users can view email events"
  ON public.email_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for tracking"
  ON public.email_events FOR INSERT
  WITH CHECK (true);

-- --------------------
-- 8.26 Import Jobs
-- --------------------
CREATE POLICY "Users can view own import jobs"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert import jobs"
  ON public.import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own import jobs"
  ON public.import_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own import jobs"
  ON public.import_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- --------------------
-- 8.27 Dev Documents
-- --------------------
CREATE POLICY "Authenticated users can view dev documents"
  ON public.dev_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dev documents"
  ON public.dev_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.28 Dev Document Versions
-- --------------------
CREATE POLICY "Authenticated users can view dev document versions"
  ON public.dev_document_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dev document versions"
  ON public.dev_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.29 Dev Items
-- --------------------
CREATE POLICY "Authenticated users can view dev items"
  ON public.dev_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dev items"
  ON public.dev_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.30 Dev Meetings
-- --------------------
CREATE POLICY "Authenticated users can view dev meetings"
  ON public.dev_meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dev meetings"
  ON public.dev_meetings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------
-- 8.31 Dev Meeting Links
-- --------------------
CREATE POLICY "Authenticated users can view dev meeting links"
  ON public.dev_meeting_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage dev meeting links"
  ON public.dev_meeting_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));


-- ===================
-- 9. STORAGE BUCKETS
-- ===================
-- Note: Run these in your Supabase SQL editor

-- INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('imprint-assets', 'imprint-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('import-files', 'import-files', false);

-- Storage policies for email-assets
-- CREATE POLICY "Public can view email assets" ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');
-- CREATE POLICY "Authenticated can upload email assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-assets');
-- CREATE POLICY "Authenticated can update email assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'email-assets');

-- Storage policies for imprint-assets
-- CREATE POLICY "Public can view imprint assets" ON storage.objects FOR SELECT USING (bucket_id = 'imprint-assets');
-- CREATE POLICY "Authenticated can manage imprint assets" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'imprint-assets') WITH CHECK (bucket_id = 'imprint-assets');

-- Storage policies for import-files
-- CREATE POLICY "Users can manage own import files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'import-files' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================
-- END OF SCHEMA EXPORT
-- ============================================
