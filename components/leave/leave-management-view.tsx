'use client';

import React, { useState, useActionState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Check,
  X,
  AlertCircle,
  Clock,
  Search,
  Calendar,
  Send,
  Trash2,
} from 'lucide-react';
import {
  requestLeaveAction,
  reviewLeaveRequestAction,
  cancelLeaveRequestAction,
  LeaveActionResponse,
} from '@/app/actions/leave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKolkataDate } from '@/lib/utils';

interface LeaveManagementViewProps {
  leaveRequests: any[];
  staffOptions: any[];
  isAdmin: boolean;
  currentStaffId?: string;
}

function LeaveRequestFormCard({
  isOpen,
  onClose,
  isAdmin,
  staffOptions,
  currentStaffId,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  staffOptions: any[];
  currentStaffId?: string;
}) {
  const [state, formAction, isPending] = useActionState<LeaveActionResponse | null, FormData>(
    requestLeaveAction,
    null
  );

  // Default to today's date
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  if (!isOpen) return null;

  return (
    <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/20 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Submit Leave Request</h3>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Approved leaves automatically update your studio attendance record
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <CardContent className="p-4 space-y-3">
        {state?.error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold">{state.error}</p>
              {state.fieldErrors && (
                <ul className="mt-1 list-disc list-inside text-[11px] space-y-0.5 text-red-700">
                  {Object.entries(state.fieldErrors).map(([field, errs]) => (
                    <li key={field}>
                      <span className="capitalize">{field}</span>: {errs.join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <form action={formAction} className="space-y-3">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            } gap-2.5`}
          >
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Staff Member *</label>
                <select
                  name="staffId"
                  defaultValue={currentStaffId}
                  className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  required
                >
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.staff_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Leave Type *</label>
              <select
                name="leaveType"
                className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Paid Leave">Paid Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Start Date *
              </label>
              <Input
                type="date"
                name="startDate"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                required
                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                End Date *
              </label>
              <Input
                type="date"
                name="endDate"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">
              Reason / Explanation (min 5 characters) *
            </label>
            <Input
              name="reason"
              placeholder="e.g. Attending family function, Medical appointment, Emergency..."
              required
              minLength={5}
              className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
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
              {isPending ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1.5" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function LeaveManagementView({
  leaveRequests,
  staffOptions,
  isAdmin,
  currentStaffId,
}: LeaveManagementViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingCount = useMemo(() => leaveRequests.filter((l) => l.status === 'Pending').length, [leaveRequests]);
  const approvedCount = useMemo(() => leaveRequests.filter((l) => l.status === 'Approved').length, [leaveRequests]);
  const rejectedCount = useMemo(() => leaveRequests.filter((l) => l.status === 'Rejected').length, [leaveRequests]);

  const filtered = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;

      if (search.trim().length > 0) {
        const q = search.toLowerCase();
        const matchesStaff = l.staff_name?.toLowerCase().includes(q) || l.staff_code?.toLowerCase().includes(q);
        const matchesType = l.leave_type?.toLowerCase().includes(q);
        const matchesReason = l.reason?.toLowerCase().includes(q);
        if (!matchesStaff && !matchesType && !matchesReason) return false;
      }

      return true;
    });
  }, [leaveRequests, statusFilter, search]);

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    let reason = '';
    if (decision === 'Rejected') {
      const input = prompt('Rejection reason (required):');
      if (!input || input.trim().length === 0) return;
      reason = input.trim();
    }
    setLoadingId(id);
    try {
      const res = await reviewLeaveRequestAction(id, decision, reason);
      if (!res.success) alert('Error: ' + res.error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to withdraw this pending leave request?')) return;
    setLoadingId(id);
    try {
      const res = await cancelLeaveRequestAction(id);
      if (!res.success) alert('Error: ' + res.error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Studio Leave Management' : 'My Leave Requests'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Review and manage staff leave applications across the studio'
              : 'Submit leave applications and track your approval status'}
          </p>
        </div>

        <Button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Request Leave
        </Button>
      </div>

      {/* Form Card (Full Width when Open) */}
      <LeaveRequestFormCard
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        isAdmin={isAdmin}
        staffOptions={staffOptions}
        currentStaffId={currentStaffId}
      />

      {/* Pending Alert for Admin */}
      {isAdmin && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 shadow-sm">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">
              {pendingCount} leave request{pendingCount > 1 ? 's' : ''} awaiting your review.
            </p>
            <p className="text-amber-700 text-[11px]">
              Approve or reject requests to automatically synchronize with daily attendance registers.
            </p>
          </div>
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
            All ({leaveRequests.length})
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
            onClick={() => setStatusFilter('Approved')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'Approved'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'Rejected'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by reason or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-full sm:w-56 bg-slate-50/50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 border-b border-slate-200">
              {isAdmin && <TableHead className="text-xs font-bold text-slate-700">Staff Member</TableHead>}
              <TableHead className="text-xs font-bold text-slate-700">Leave Type</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Date Range</TableHead>
              <TableHead className="text-center text-xs font-bold text-slate-700">Duration</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Reason</TableHead>
              <TableHead className="text-center text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CalendarDays className="h-6 w-6 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No leave requests found.</p>
                    <p className="text-[11px] text-slate-400">
                      {search ? 'Try adjusting your search query.' : 'Click "Request Leave" above to submit an application.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lr) => (
                <TableRow key={lr.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                  {isAdmin && (
                    <TableCell>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{lr.staff_name}</p>
                      <p className="font-mono text-[10px] text-slate-500">{lr.staff_code}</p>
                    </TableCell>
                  )}

                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {lr.leave_type}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatKolkataDate(lr.start_date)}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span>{formatKolkataDate(lr.end_date)}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center font-bold text-xs text-slate-900 whitespace-nowrap">
                    {lr.days_count} {lr.days_count === 1 ? 'day' : 'days'}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 max-w-xs">
                    <p className="truncate" title={lr.reason}>
                      {lr.reason}
                    </p>
                    {lr.rejection_reason && (
                      <p className="text-[10px] text-red-600 font-medium mt-0.5" title={lr.rejection_reason}>
                        Reason: {lr.rejection_reason}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="text-center whitespace-nowrap">
                    <Badge
                      variant={
                        lr.status === 'Approved'
                          ? 'success'
                          : lr.status === 'Rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px] px-2 py-0.5 font-medium"
                    >
                      {lr.status}
                    </Badge>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin && lr.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            disabled={loadingId === lr.id}
                            onClick={() => handleReview(lr.id, 'Approved')}
                            className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === lr.id}
                            onClick={() => handleReview(lr.id, 'Rejected')}
                            className="h-6 px-2 text-[11px] text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {!isAdmin && lr.status === 'Pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingId === lr.id}
                          onClick={() => handleCancel(lr.id)}
                          className="h-6 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                          title="Withdraw this leave request"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Withdraw
                        </Button>
                      )}

                      {lr.status !== 'Pending' && !isAdmin && (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
