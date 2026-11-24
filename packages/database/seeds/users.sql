-- Development fixtures only. Populates roles and one login per seeded employee (schema/users.sql).
--
-- Every seeded account signs in with the development password Seed-Pass-2026.
-- password_hash holds its bcrypt hash (cost 10, as the backend uses). Never use it outside a local database.
--
--   username  role     employee
--   jdelacruz USER     EMP-001 (21)
--   msantos   MANAGER  EMP-002 (22)
--   rreyes    ADMIN    EMP-003 (23)

-- ---------------------------------------------------------------------------
-- 14. Roles and Users
-- ---------------------------------------------------------------------------

-- Id 1 is ADMIN_ROLE_ID in the backend. The codes are ROLE_CODES in @pms/shared-types.
INSERT INTO pms.user_role (id, code, name, created_at, updated_at)
VALUES
  (1, 'ADMIN', 'HR Admin', now(), now()),
  (2, 'MANAGER', 'Manager', now(), now()),
  (3, 'USER', 'Employee', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pms.users (
    id, employee_id, user_role_id, email, username, password_hash,
    failed_login_attempts, login_locked_until, created_at, updated_at
)
VALUES
  (1, 21, 3, 'employee1@example.invalid', 'jdelacruz', '$2b$10$ZmihHjnemPnjn37cmY3LzuoPC6UswADN2neAsJqHATG.Khtnh5k6G', 0, NULL, now(), now()),
  (2, 22, 2, 'employee2@example.invalid', 'msantos', '$2b$10$ZmihHjnemPnjn37cmY3LzuoPC6UswADN2neAsJqHATG.Khtnh5k6G', 0, NULL, now(), now()),
  (3, 23, 1, 'employee3@example.invalid', 'rreyes', '$2b$10$ZmihHjnemPnjn37cmY3LzuoPC6UswADN2neAsJqHATG.Khtnh5k6G', 0, NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Advance the identity past the explicit fixture ids.
SELECT setval(pg_get_serial_sequence('pms.users', 'id'), (SELECT max(id) FROM pms.users));
