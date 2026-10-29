-- Migration 003: Create attendance register and correction tables
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (
        status IN ('Present', 'Absent', 'Leave', 'Half Day', 'Weekly Off', 'Holiday')
    ),
    first_half_check_in TIME,
    first_half_check_out TIME,
    second_half_check_in TIME,
    second_half_check_out TIME,
    total_working_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_minutes INTEGER NOT NULL DEFAULT 0,
    is_late_arrival BOOLEAN NOT NULL DEFAULT false,
    remarks TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_staff_date UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance(staff_id, date);

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    proposed_status VARCHAR(50) CHECK (
        proposed_status IN ('Present', 'Absent', 'Leave', 'Half Day', 'Weekly Off', 'Holiday')
    ),
    proposed_first_half_in TIME,
    proposed_first_half_out TIME,
    proposed_second_half_in TIME,
    proposed_second_half_out TIME,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
        status IN ('Pending', 'Approved', 'Rejected')
    ),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_att_corr_attendance ON attendance_corrections(attendance_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_status ON attendance_corrections(status);

