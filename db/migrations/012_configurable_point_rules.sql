-- Migration 012: Make point rules and work types fully dynamic and configurable

-- Allow dynamic work types in work_entries by dropping rigid inline check constraint
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'work_entries'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%work_type%'
    ) LOOP
        EXECUTE 'ALTER TABLE work_entries DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Allow flexible units in point_rules by dropping rigid rate_unit constraint
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'point_rules'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%rate_unit%'
    ) LOOP
        EXECUTE 'ALTER TABLE point_rules DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;
