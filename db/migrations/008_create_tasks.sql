-- Migration 008: Create tasks management table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('Photo', 'Video', 'Other')),
    task_type VARCHAR(100) NOT NULL CHECK (
        task_type IN (
            'Raw Data',
            'Selection',
            'Photo Editing',
            'Quality Check',
            'Album Design',
            'Final Approval',
            'Video Editing',
            'Review',
            'Revision',
            'Final Export',
            'Delivered'
        )
    ),
    assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    deadline DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (
        priority IN ('Low', 'Medium', 'High', 'Urgent')
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
        status IN ('Pending', 'In Progress', 'Completed', 'Overdue')
    ),
    completion_date TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_staff ON tasks(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

