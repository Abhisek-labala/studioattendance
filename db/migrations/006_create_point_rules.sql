-- Migration 006: Create point rules table with baseline Studio GFX rates
CREATE TABLE IF NOT EXISTS point_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_version VARCHAR(50) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    rate_unit VARCHAR(50) NOT NULL CHECK (rate_unit IN ('sheet', 'hour', 'event')),
    base_points_per_unit NUMERIC(10, 2) NOT NULL,
    late_night_eligible BOOLEAN NOT NULL DEFAULT false,
    late_night_bonus_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    out_of_station_eligible BOOLEAN NOT NULL DEFAULT false,
    out_of_station_bonus_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rule_version_work_type UNIQUE (rule_version, work_type)
);

CREATE INDEX IF NOT EXISTS idx_point_rules_active ON point_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_point_rules_version ON point_rules(rule_version);

-- Seed baseline Studio GFX Point Rules (Version 1.0)
INSERT INTO point_rules (rule_version, work_type, rate_unit, base_points_per_unit, late_night_eligible, late_night_bonus_points, out_of_station_eligible, out_of_station_bonus_points)
VALUES
    ('1.0', 'Album Photo Edit', 'sheet', 1.00, false, 0.00, false, 0.00),
    ('1.0', 'Video Edit', 'hour', 10.00, false, 0.00, false, 0.00),
    ('1.0', 'Engagement Shoot', 'event', 10.00, false, 0.00, true, 10.00),
    ('1.0', 'Pre-Wedding Shoot', 'event', 20.00, false, 0.00, true, 10.00),
    ('1.0', 'Wedding Shoot', 'event', 20.00, true, 10.00, true, 10.00),
    ('1.0', 'Birthday / Small Event Shoot', 'event', 10.00, false, 0.00, true, 10.00)
ON CONFLICT (rule_version, work_type) DO NOTHING;

