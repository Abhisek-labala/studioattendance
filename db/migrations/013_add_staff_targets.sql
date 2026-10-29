-- Migration 013: Add staff monthly targets and target tracking
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS monthly_target_points NUMERIC(10,2) NOT NULL DEFAULT 150.00;

CREATE TABLE IF NOT EXISTS staff_monthly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    target_points NUMERIC(10,2) NOT NULL DEFAULT 150.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (staff_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_staff_targets_lookup ON staff_monthly_targets(staff_id, year, month);

