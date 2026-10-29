'use client';

import React, { useState, useActionState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  PlusCircle,
  Search,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  Award,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { createProjectAction, updateProjectStatusAction, ProjectActionResponse } from '@/app/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatKolkataDate, formatPoints } from '@/lib/utils';

const PROJECT_STATUSES = [
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
];

const STATUS_BADGE_STYLE: Record<string, string> = {
  Planned: 'bg-slate-100 text-slate-700 border-slate-200',
  Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  Shooting: 'bg-amber-50 text-amber-800 border-amber-200',
  'Data Backup': 'bg-orange-50 text-orange-700 border-orange-200',
  'Photo Editing': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Video Editing': 'bg-purple-50 text-purple-700 border-purple-200',
  'Album Design': 'bg-pink-50 text-pink-700 border-pink-200',
  'Quality Check': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Revision: 'bg-red-50 text-red-700 border-red-200',
  'Ready for Delivery': 'bg-teal-50 text-teal-700 border-teal-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  client_name: string;
  client_contact?: string;
  event_type: string;
  event_date: string;
  location: string;
  is_out_of_station: boolean;
  delivery_deadline?: string;
  status: string;
  remarks?: string;
  assigned_staff_count: number;
  pending_tasks: number;
  total_approved_points: number;
  my_role?: string;
  my_pending_tasks?: number;
}

interface ProjectsViewProps {
  projects: Project[];
  staffOptions: any[];
  isAdmin: boolean;
}

function ProjectFormModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState<ProjectActionResponse | null, FormData>(
    createProjectAction,
    null
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-amber-600" />
            Create New Project
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Project Code *</label>
              <Input name="projectCode" placeholder="PRJ-2026-004" required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Event Type *</label>
              <select
                name="eventType"
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                <option>Wedding Shoot</option>
                <option>Pre-Wedding Shoot</option>
                <option>Engagement Shoot</option>
                <option>Birthday / Small Event</option>
                <option>Corporate Event</option>
                <option>Product Photography</option>
                <option>Portrait Session</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Project Name *</label>
            <Input
              name="projectName"
              placeholder="e.g. Raj & Simran Grand Wedding"
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Client Name *</label>
              <Input name="clientName" placeholder="Mr. / Mrs. Client" required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Client Contact</label>
              <Input name="clientContact" placeholder="+91 98765 43210" className="h-8 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Event Date *</label>
              <Input type="date" name="eventDate" required className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Delivery Deadline</label>
              <Input type="date" name="deliveryDeadline" className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Location *</label>
            <Input name="location" placeholder="e.g. Taj Hotel, Mumbai" required className="h-8 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Initial Status</label>
              <select
                name="status"
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="isOutOfStation"
                name="isOutOfStation"
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="isOutOfStation" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                Out-of-Station Event
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Remarks / Notes</label>
            <textarea
              name="remarks"
              rows={2}
              className="w-full rounded-md border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none"
              placeholder="Special requirements, shoot details..."
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
              {isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectsView({ projects, isAdmin }: ProjectsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        q.length === 0 ||
        p.project_name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.event_type.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await updateProjectStatusAction(id, newStatus);
      if (!res.success) alert('Error: ' + res.error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Project Management' : 'My Assigned Projects'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Manage studio weddings, events, deadlines, and staff assignments'
              : 'Your assigned photography shoots, video projects, and editing pipelines'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
            {filtered.length} {filtered.length === 1 ? 'Project' : 'Projects'}
          </span>
          {isAdmin && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar - Compact & Clean */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search projects, client, or event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="ALL">All Statuses ({projects.length})</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">
            {search || statusFilter !== 'ALL'
              ? 'No matching projects'
              : !isAdmin
              ? 'No projects assigned to you yet'
              : 'No projects created'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {!isAdmin
              ? 'You will see projects here once studio management assigns you to an event shoot, editing task, or production pipeline.'
              : 'Click "+ New Project" to add your studio\'s first wedding or event project.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
            >
              <CardContent className="p-4 space-y-3">
                {/* Top Row: Code, Status Badge, Role Badge */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.project_code}
                    </span>

                    {/* Assigned Role Pill for Staff */}
                    {p.my_role && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                        <UserCheck className="h-3 w-3" />
                        {p.my_role}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  {isAdmin ? (
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      disabled={updatingId === p.id}
                      className={`h-6 rounded border text-[10px] font-bold px-1.5 ${
                        STATUS_BADGE_STYLE[p.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-block rounded border text-[10px] font-bold px-2 py-0.5 ${
                        STATUS_BADGE_STYLE[p.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  )}
                </div>

                {/* Project Title & Client info */}
                <div>
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-bold text-sm text-slate-900 hover:text-amber-600 hover:underline block leading-snug"
                  >
                    {p.project_name}
                  </Link>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <span className="font-medium text-slate-700">{p.client_name}</span> &middot; {p.event_type}
                  </p>
                </div>

                {/* Event Schedule & Location */}
                <div className="space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                      Event: <strong className="text-slate-700">{formatKolkataDate(p.event_date)}</strong>
                    </span>
                    {p.delivery_deadline && (
                      <span className="text-slate-400">
                        &nbsp;&middot; Due: {formatKolkataDate(p.delivery_deadline)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.location}</span>
                    {p.is_out_of_station && (
                      <Badge variant="warning" className="text-[9px] px-1.5 py-0 shrink-0 ml-auto">
                        Out-Station
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Footer Stats & View Link */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  {isAdmin ? (
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {p.assigned_staff_count} staff
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {p.pending_tasks} tasks
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px]">
                      {p.my_pending_tasks && p.my_pending_tasks > 0 ? (
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          {p.my_pending_tasks} active task{p.my_pending_tasks > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Tasks completed
                        </span>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-amber-600 hover:underline"
                  >
                    Details
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Project Create Modal */}
      <ProjectFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
