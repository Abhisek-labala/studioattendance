import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const initialSetupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const staffSchema = z.object({
  staffCode: z.string().min(2, 'Staff code is required (e.g. GFX-001)'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  email: z.string().email('Valid email address is required'),
  designation: z.enum([
    'Photographer',
    'Videographer',
    'Photo Editor',
    'Video Editor',
    'Photographer / Editor',
    'Team Leader',
  ]),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  monthlyTargetPoints: z.coerce.number().min(0, 'Target points must be 0 or more').default(150),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  createLoginAccount: z.boolean().optional(),
  loginPassword: z.string().min(8).optional(),
});

export const attendanceSchema = z.object({
  staffId: z.string().uuid('Valid staff ID required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['Present', 'Absent', 'Leave', 'Half Day', 'Weekly Off', 'Holiday']),
  firstHalfCheckIn: z.string().optional().nullable(),
  firstHalfCheckOut: z.string().optional().nullable(),
  secondHalfCheckIn: z.string().optional().nullable(),
  secondHalfCheckOut: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const attendanceCorrectionSchema = z.object({
  attendanceId: z.string().uuid('Valid attendance ID required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  proposedStatus: z.enum(['Present', 'Absent', 'Leave', 'Half Day', 'Weekly Off', 'Holiday']).optional(),
  proposedFirstHalfIn: z.string().optional().nullable(),
  proposedFirstHalfOut: z.string().optional().nullable(),
  proposedSecondHalfIn: z.string().optional().nullable(),
  proposedSecondHalfOut: z.string().optional().nullable(),
});

export const workEntrySchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  staffId: z.string().uuid('Valid staff ID required'),
  projectId: z.string().uuid().optional().nullable(),
  workType: z.string().min(1, 'Work type is required'),
  quantityOrDuration: z.coerce.number().min(0.01, 'Quantity or duration must be greater than 0'),
  isLateNight: z.boolean().default(false),
  isOutOfStation: z.boolean().default(false),
  isRework: z.boolean().default(false),
  remarks: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const projectSchema = z.object({
  projectCode: z.string().min(2, 'Project code is required'),
  projectName: z.string().min(2, 'Project name is required'),
  clientName: z.string().min(2, 'Client name is required'),
  clientContact: z.string().optional().nullable(),
  eventType: z.string().min(2, 'Event type is required'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  location: z.string().min(2, 'Location is required'),
  isOutOfStation: z.boolean().default(false),
  deliveryDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be in YYYY-MM-DD format').optional().nullable(),
  status: z.enum([
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
    'Completed',
  ]).default('Planned'),
  remarks: z.string().optional().nullable(),
  photographerIds: z.array(z.string().uuid()).optional(),
  editorIds: z.array(z.string().uuid()).optional(),
});

export const taskSchema = z.object({
  projectId: z.string().uuid('Valid project ID required'),
  workflowType: z.enum(['Photo', 'Video', 'Other']),
  taskType: z.enum([
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
    'Delivered',
  ]),
  assignedStaffId: z.string().uuid().optional().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be in YYYY-MM-DD format').optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  remarks: z.string().optional().nullable(),
});

export const leaveRequestSchema = z.object({
  staffId: z.string().uuid('Valid staff ID required'),
  leaveType: z.enum(['Casual Leave', 'Sick Leave', 'Paid Leave', 'Unpaid Leave', 'Emergency']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const studioSettingsSchema = z.object({
  studioName: z.string().min(2, 'Studio name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  workingHoursPerDay: z.coerce.number().min(1).max(24).default(8),
  lateGracePeriodMinutes: z.coerce.number().min(0).max(120).default(15),
  halfDayMinimumMinutes: z.coerce.number().min(60).max(600).default(240),
  fullDayMinimumMinutes: z.coerce.number().min(120).max(900).default(480),
  overtimeThresholdMinutes: z.coerce.number().min(120).max(1000).default(510),
  requireWorkApproval: z.boolean().default(true),
  requireAttendanceApproval: z.boolean().default(false),
});

