-- Identity and Directory: employees. Load after companies, departments, and positions.
-- UUID workflows reference guid. UNIQUE allows nullable GUIDs while making the key valid for foreign keys.

-- Stores directory records and the GUID used by workflow tables.

CREATE TABLE IF NOT EXISTS pms.employees (
    guid               uuid,
    id                 bigint PRIMARY KEY,
    code               text NOT NULL,
    email              text NOT NULL,
    first_name         text NOT NULL,
    last_name          text NOT NULL,
    hrdotnet_id        bigint,
    company            text NOT NULL,
    position           text,
    division           text,
    department         text NOT NULL,
    branch             text NOT NULL,
    employment_status  text NOT NULL CHECK (employment_status IN
                          ('probationary', 'regular', 'resigned', 'terminated',
                           'contractual', 'end_of_contract', 'retired', 'separated')),
    status             text NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    -- name details
    middle_name        text,
    suffix             text,

    -- demographics
    mobile_number      text,
    gender             text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    birth_date         date CHECK (birth_date IS NULL OR birth_date > DATE '1900-01-01'),
    place_of_birth     text,
    marital_status     text CHECK (marital_status IN
                          ('single', 'married', 'widowed', 'separated', 'divorced', 'annulled')),
    nationality        text,
    religion           text,
    blood_type         text CHECK (blood_type IN
                          ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),

    photo_url          text,

    UNIQUE (guid),
    UNIQUE (company, code, email)
);