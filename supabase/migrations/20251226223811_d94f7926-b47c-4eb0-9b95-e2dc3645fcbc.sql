-- Insert existing users into staff table with their profile user_id linked
INSERT INTO public.staff (full_name, email, phone, title, department, user_id, active)
VALUES
  ('Tyler Amos', 'tyler@centervert.com', NULL, NULL, 'information_technology', 'ace9254e-1244-4f8a-95a1-adbfae89a518', true),
  ('Angelica Quintana', 'angelica@authorservices.com', '1-866-449-1832', 'Operations Manager', 'operations', '20baac5d-8bfb-4ff1-a658-232810a56f45', true),
  ('Dallas Burnett', 'dburnett@authorservices.com', '(864) 415-0931', 'President', 'executive', 'eaed37cc-de15-4bd2-9c8b-689c327624f7', true)
ON CONFLICT DO NOTHING;