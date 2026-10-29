'use client';

import React, { useState, useActionState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  PlusCircle,
  AlertCircle,
  Calendar,
  User,
  Clock,
  X,
  Film,
  Camera,
  Check,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { createTaskAction, updateTaskStatusAction, TaskActionResponse } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatKolkataDate } from '@/lib/utils';

const PHOTO_TASKS = [
  'Raw Data',
  'Selection',
  'Photo Editing',
  'Quality Check',
  'Album Design',
  'Final Approval',
];

const VIDEO_TASKS = [
  'Raw Data',
  'Video Editing',
  'Review',
  'Revision',
  'Final Export',
  'Delivered',
];

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  Urgent: { label: 'Urgent', className: 'bg-red-50 text-red-700 border-red-200' },
  High: { label: 'High', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  Medium: { label: 'Medium', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Low: { label: 'Low', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function TaskCreateModal({
  isOpen,
  onClose,
  projectOptions,
  staffOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectOptions: any[];
  staffOptions: any[];
}) {
  const [state, formAction, isPending] = useActionState<TaskActionResponse | null, FormData>(
    createTaskAction,
    null
  );
  const [workflowType, setWorkflowType] = useState<'Photo' | 'Video' | 'Other'>('Photo');

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!isOpen) return null;

  const taskTypes = workflowType === 'Photo' ? PHOTO_TASKS : workflowType === 'Video' ? VIDEO_TASKS : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-amber-600" />
            Create Workflow Task
          </h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state?.error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Project *</label>
            <select
              name="projectId"
              required
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
            >
              <option value="">Select Project</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Workflow Type</label>
              <select
                name="workflowType"
                value={workflowType}
                onChange={(e) => setWorkflowType(e.target.value as any)}
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                <option value="Photo">Photo Workflow</option>
                <option value="Video">Video Workflow</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Task Type *</label>
              <select
                name="taskType"
                required
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {taskTypes.length > 0
                  ? taskTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  : ['Raw Data', 'Review', 'Revision', 'Delivered'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Assign To</label>
              <select
                name="assignedStaffId"
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                <option value="">Unassigned</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.staff_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select
                name="priority"
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Deadline</label>
            <Input type="date" name="deadline" className="h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Remarks / Instructions</label>
            <Input
              name="remarks"
              placeholder="e.g. Candid photo retouching, 800 selects..."
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TasksViewProps {
  tasks: any[];
  projectOptions: any[];
  staffOptions: any[];
  isAdmin: boolean;
  currentStaffId?: string;
}

export function TasksView({
  tasks,
  projectOptions,
  staffOptions,
  isAdmin,
}: TasksViewProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'In Progress' | 'Completed' | 'Overdue'>('ALL');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status counts
  const pendingCount = useMemo(() => tasks.filter((t) => t.status === 'Pending').length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter((t) => t.status === 'In Progress').length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'Completed').length, [tasks]);
  const overdueCount = useMemo(() => tasks.filter((t) => t.is_overdue && t.status !== 'Completed').length, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter === 'Overdue') {
        if (!t.is_overdue || t.status === 'Completed') return false;
      } else if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // Search query
      if (search.trim().length > 0) {
        const q = search.toLowerCase();
        const matchesType = t.task_type.toLowerCase().includes(q);
        const matchesProj = t.project_name?.toLowerCase().includes(q);
        const matchesCode = t.project_code?.toLowerCase().includes(q);
        const matchesRemarks = t.remarks?.toLowerCase().includes(q);
        const matchesStaff = t.assigned_to?.toLowerCase().includes(q);
        if (!matchesType && !matchesProj && !matchesCode && !matchesRemarks && !matchesStaff) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, search]);

  const handleStatusUpdate = async (id: string, newStatus: any) => {
    setUpdatingId(id);
    setErrorMessage(null);
    const res = await updateTaskStatusAction(id, newStatus);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update task status.');
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Task Management' : 'My Assigned Tasks'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Photo & video workflow tasks tracking across all studio projects'
              : 'Your assigned editing duties, retouching milestones, and delivery deadlines'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md shadow-sm">
            {inProgressCount + pendingCount} Active Tasks
          </span>

          {isAdmin && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Status Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="inline-flex rounded-md bg-slate-100/80 p-0.5 gap-0.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'Pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('In Progress')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'In Progress'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('Completed')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'Completed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
          {overdueCount > 0 && (
            <button
              onClick={() => setStatusFilter('Overdue')}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'Overdue'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search task, project, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-full sm:w-56 bg-slate-50/50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Tasks Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto">
            <CheckSquare className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">No tasks in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {!isAdmin
              ? 'You are all caught up! When new editing or workflow tasks are assigned to you, they will appear here.'
              : 'No tasks matching the selected filters. Click "+ Create Task" to assign work.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((task) => {
            const priorityInfo = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium;
            const isCompleted = task.status === 'Completed';

            return (
              <Card
                key={task.id}
                className={`border bg-white transition-all hover:shadow-sm overflow-hidden flex flex-col justify-between ${
                  task.is_overdue && !isCompleted
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200/80'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {/* Workflow Type Pill */}
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                        {task.workflow_type === 'Photo' ? (
                          <Camera className="h-3 w-3 text-indigo-500" />
                        ) : (
                          <Film className="h-3 w-3 text-purple-500" />
                        )}
                        {task.workflow_type}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold ${priorityInfo.className}`}
                      >
                        {priorityInfo.label}
                      </span>

                      {/* Overdue Badge */}
                      {task.is_overdue && !isCompleted && (
                        <span className="rounded bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold">
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : task.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  {/* Task Title & Project */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {task.task_type}
                    </h3>
                    {task.project_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Link
                          href={`/projects/${task.project_id}`}
                          className="text-[11px] font-semibold text-slate-700 hover:text-amber-600 hover:underline truncate max-w-[220px]"
                        >
                          {task.project_name}
                        </Link>
                        {task.project_code && (
                          <span className="font-mono text-[9px] font-bold text-slate-400">
                            ({task.project_code})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remarks / Notes */}
                  {task.remarks && (
                    <p className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-md border border-slate-100 italic">
                      &ldquo;{task.remarks}&rdquo;
                    </p>
                  )}

                  {/* Deadline & Assignee Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    {task.deadline && (
                      <div
                        className={`flex items-center gap-1 ${
                          task.is_overdue && !isCompleted
                            ? 'text-red-600 font-semibold'
                            : 'text-slate-600'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Due: {formatKolkataDate(task.deadline)}</span>
                      </div>
                    )}

                    {isAdmin && task.assigned_to && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <User className="h-3 w-3 shrink-0 text-slate-400" />
                        <span>{task.assigned_to}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Action Switcher */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </span>

                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                          <Check className="h-3.5 w-3.5" />
                          Done
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusUpdate(task.id, 'In Progress')}
                          disabled={updatingId === task.id}
                          className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900"
                        >
                          Reopen
                        </Button>
                      </div>
                    ) : (
                      <select
                        value={task.status}
                        disabled={updatingId === task.id}
                        onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                        className="h-7 rounded-md border border-slate-200 bg-slate-50/50 px-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Mark Completed ✓</option>
                      </select>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Create Modal (Admin) */}
      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectOptions={projectOptions}
        staffOptions={staffOptions}
      />
    </div>
  );
}
