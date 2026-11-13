-- Development fixtures only. Populate a sample company, departments, positions, and employees.

-- ---------------------------------------------------------------------------
-- 2. Identity and Directory
-- ---------------------------------------------------------------------------

-- Explicit identity values give every fixture a stable foreign-key target.
INSERT INTO pms.companies (company_id, name, demo_mode, demo_date, created_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Mayon Consolidated Inc.', false, NULL, now(), now())
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO pms.departments (department_id, company_id, name)
OVERRIDING SYSTEM VALUE
VALUES (1, 1, 'Engineering'), (2, 1, 'Human Resources')
ON CONFLICT (department_id) DO NOTHING;

INSERT INTO pms.positions (position_id, company_id, title, created_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
  (11, 1, 'Software Engineer', now(), now()),
  (12, 1, 'Engineering Manager', now(), now()),
  (13, 1, 'Human Resources Officer', now(), now())
ON CONFLICT (position_id) DO NOTHING;

INSERT INTO pms.employees (
    guid, id, company_id, hrdotnet_id, code, email, first_name, last_name,
    position_id, department_id, status, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000021', 21, 1, 1, 'EMP-001', 'employee1@example.invalid', 'Juan', 'Dela Cruz',
   11, 1, 'active', now(), now()),
  ('00000000-0000-0000-0000-000000000022', 22, 1, 2, 'EMP-002', 'employee2@example.invalid', 'Maria', 'Santos',
   12, 1, 'active', now(), now()),
  ('00000000-0000-0000-0000-000000000023', 23, 1, 3, 'EMP-003', 'employee3@example.invalid', 'Ramon', 'Reyes',
   13, 2, 'active', now(), now())
ON CONFLICT (id) DO NOTHING;


-- Advance identity sequences past the explicit fixture IDs.
SELECT setval(pg_get_serial_sequence('pms.companies', 'company_id'), (SELECT max(company_id) FROM pms.companies));
SELECT setval(pg_get_serial_sequence('pms.departments', 'department_id'), (SELECT max(department_id) FROM pms.departments));
SELECT setval(pg_get_serial_sequence('pms.positions', 'position_id'), (SELECT max(position_id) FROM pms.positions));
