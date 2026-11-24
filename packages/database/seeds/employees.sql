-- Development fixtures only. Populates the employee directory (schema/employees.sql).

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
  ('00000000-0000-0000-0000-000000000021', 21, 'EMP-001', 'employee1@example.invalid', 'Juan', 'Dela Cruz', 1,
   'Mayon Consolidated Inc.', 'Software Engineer', 'Technology', 'Engineering', 'Main', 'regular', 'active',
   'Santos', NULL, NULL, 'male', '1995-03-14', 'Legazpi City',
   'single', 'Filipino', NULL, 'O+', NULL,
   now(), now()),
  ('00000000-0000-0000-0000-000000000022', 22, 'EMP-002', 'employee2@example.invalid', 'Maria', 'Santos', 2,
   'Mayon Consolidated Inc.', 'Engineering Manager', 'Technology', 'Engineering', 'Main', 'regular', 'active',
   NULL, NULL, NULL, 'female', '1988-07-02', 'Naga City',
   'married', 'Filipino', NULL, 'A+', NULL,
   now(), now()),
  ('00000000-0000-0000-0000-000000000023', 23, 'EMP-003', 'employee3@example.invalid', 'Ramon', 'Reyes', 3,
   'Mayon Consolidated Inc.', 'Human Resources Officer', NULL, 'Human Resources', 'Main', 'probationary', 'active',
   NULL, 'Jr.', NULL, 'male', '1992-11-21', 'Quezon City',
   'single', 'Filipino', NULL, NULL, NULL,
   now(), now())
ON CONFLICT (id) DO NOTHING;
