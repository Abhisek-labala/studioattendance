-- Migration 004: Create projects and project assignments
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_contact VARCHAR(100),
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    location TEXT NOT NULL,
    is_out_of_station BOOLEAN NOT NULL DEFAULT false,
    delivery_deadline DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Planned' CHECK (
        status IN (
            'Planned',
            'Scheduled',
            'Shooting',
            'Data Backup',
            'Photo Editing',
            'Video Editing',
            'Album Design',
            'Quality Check',
            'Revision',
            'Ready for Delivery',
            'Delivered',
            'Completed'
        )
    ),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_event_date ON projects(event_date);

CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN ('Photographer', 'Videographer', 'Photo Editor', 'Video Editor', 'Lead')
    ),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_staff_role UNIQUE (project_id, staff_id, role)
);

CREATE INDEX IF NOT EXISTS idx_proj_assign_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_assign_staff ON project_assignments(staff_id);

