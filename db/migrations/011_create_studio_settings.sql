-- Migration 011: Create studio settings table
CREATE TABLE IF NOT EXISTS studio_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    studio_name VARCHAR(255) NOT NULL DEFAULT 'Studio GFX Photography',
    phone VARCHAR(50) DEFAULT '+91 98765 43210',
    email VARCHAR(255) DEFAULT 'contact@studiogfx.com',
    address TEXT DEFAULT 'Studio GFX, Photography Lane, India',
    working_hours_per_day NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    late_grace_period_minutes INTEGER NOT NULL DEFAULT 15,
    half_day_minimum_minutes INTEGER NOT NULL DEFAULT 240,
    full_day_minimum_minutes INTEGER NOT NULL DEFAULT 480,
    overtime_threshold_minutes INTEGER NOT NULL DEFAULT 510,
    require_work_approval BOOLEAN NOT NULL DEFAULT true,
    require_attendance_approval BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings
INSERT INTO studio_settings (
    id, studio_name, phone, email, address,
    working_hours_per_day, late_grace_period_minutes,
    half_day_minimum_minutes, full_day_minimum_minutes,
    overtime_threshold_minutes, require_work_approval, require_attendance_approval
)
VALUES (
    'default', 'Studio GFX Photography', '+91 98765 43210', 'contact@studiogfx.com', 'Studio GFX, Main Boulevard, India',
    8.00, 15, 240, 480, 510, true, false
)
ON CONFLICT (id) DO NOTHING;

