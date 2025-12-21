-- Update the handle_new_user function to respect invited_role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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