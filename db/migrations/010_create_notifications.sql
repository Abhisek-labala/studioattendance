-- Migration 010: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN (
            'WORK_SUBMITTED',
            'WORK_APPROVED',
            'WORK_REJECTED',
            'LEAVE_APPROVED',
            'LEAVE_REJECTED',
            'TASK_ASSIGNED',
            'DEADLINE_APPROACHING',
            'TASK_OVERDUE',
            'SYSTEM'
        )
    ),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(created_at DESC);

