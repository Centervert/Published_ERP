-- Move extensions out of public schema for better security posture
CREATE SCHEMA IF NOT EXISTS extensions;

-- If pg_trgm was created in public, move it to extensions schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  END IF;
END $$;