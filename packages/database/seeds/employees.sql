-- Development fixtures only. Populates the employee directory (schema/employees.sql).
--
-- Employees 21 and 24 to 27 are the real accounts of the team databases: their ids, GUIDs, codes,
-- emails, and names are copied from pms.employees as the developers hold it, so every database
-- can share them. Employees 22 and 23 are fixtures without a login.
-- The real accounts keep the columns that the team databases leave empty (division and the
-- personal details) empty here too.

-- ---------------------------------------------------------------------------
-- 2. Employees
-- ---------------------------------------------------------------------------

-- Stable ids and GUIDs: the other seeds refer to these GUIDs as employee, author, and actor.
INSERT INTO pms.employees (
    guid, id, code, email, first_name, last_name, hrdotnet_id,
    company, position, division, department, branch, employment_status, status,
    middle_name, suffix, mobile_number, gender, birth_date, place_of_birth,
    marital_status, nationality, religion, blood_type, photo_url,
    created_at, updated_at
)
VALUES
  ('284ddc9e-ebe4-468d-945f-fb18af72e622', 21, 'ITI-001', 'iging@hrdotnet.com', 'Iging', 'DotTech', 1,
   'Mayon Consolidated Inc.', 'Software Engineer', NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('00000000-0000-0000-0000-000000000022', 22, 'EMP-002', 'employee2@example.invalid', 'Maria', 'Santos', 2,
   'Mayon Consolidated Inc.', 'Engineering Manager', NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('00000000-0000-0000-0000-000000000023', 23, 'EMP-003', 'employee3@example.invalid', 'Ramon', 'Reyes', 3,
   'Mayon Consolidated Inc.', 'Human Resources Officer', NULL, 'Human Resources', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('6a685ca5-7613-4e80-a384-4ebe60263aa3', 24, 'SIXERS-023', 'lebronjames@gmail.com', 'Lebron', 'James', 23,
   'Mayon Consolidated Inc.', NULL, NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('6293e9c7-6495-4555-85a9-1eccebc6d34c', 25, 'admin', 'admin@pms.local', 'System', 'Administrator', NULL,
   'Mayon Consolidated Inc.', NULL, NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('ce58dfdf-e0bf-47d8-9060-3dc10d732d07', 26, 'ITI-002', 'iging@managerdotnet.com', 'Iging', 'ManagerDotTech', 2,
   'Mayon Consolidated Inc.', NULL, NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now()),
  ('08bd7bb2-faa4-46ae-b7c1-cc20664d7331', 27, 'ITI-003', 'iging@userdotnet.com', 'Iging', 'UserDotTech', 3,
   'Mayon Consolidated Inc.', 'Software Engineer', NULL, 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, NULL,
   now(), now())
ON CONFLICT (id) DO NOTHING;
