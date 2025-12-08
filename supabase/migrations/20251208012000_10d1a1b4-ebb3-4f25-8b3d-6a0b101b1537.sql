
-- Phase 1A: Add new enum values to app_role
-- These must be committed before they can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'asc';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ae';
