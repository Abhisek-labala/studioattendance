-- Migration 005: Create work entries table
CREATE TABLE IF NOT EXISTS work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_date DATE NOT NULL,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    work_type VARCHAR(100) NOT NULL CHECK (
        work_type IN (
            'Album Photo Edit',
            'Video Edit',
            'Engagement Shoot',
            'Pre-Wedding Shoot',
            'Wedding Shoot',
            'Birthday / Small Event Shoot',
            'Other'
        )
    ),
    quantity_or_duration NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    is_late_night BOOLEAN NOT NULL DEFAULT false,
    is_out_of_station BOOLEAN NOT NULL DEFAULT false,
    is_rework BOOLEAN NOT NULL DEFAULT false,
    base_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bonus_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rule_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    remarks TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Submitted', 'Approved', 'Rejected')
    ),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_entries_staff ON work_entries(staff_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_project ON work_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_work_entries_status ON work_entries(status);
CREATE INDEX IF NOT EXISTS idx_work_entries_type ON work_entries(work_type);

