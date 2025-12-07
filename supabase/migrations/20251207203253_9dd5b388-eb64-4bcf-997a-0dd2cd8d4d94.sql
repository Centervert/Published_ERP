-- Add title and phone fields to profiles table for email signatures
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS phone text;