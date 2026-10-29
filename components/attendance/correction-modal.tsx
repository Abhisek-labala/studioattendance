'use client';

import React, { useActionState, useEffect } from 'react';
import { Edit3, X, AlertCircle } from 'lucide-react';
import { requestAttendanceCorrectionAction, AttendanceActionResponse } from '@/app/actions/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: {
    id: string;
    date: string;
    status: string;
    first_half_check_in?: string;
    first_half_check_out?: string;
    second_half_check_in?: string;
    second_half_check_out?: string;
  } | null;
}

export function CorrectionModal({ isOpen, onClose, record }: CorrectionModalProps) {
  const [state, formAction, isPending] = useActionState<AttendanceActionResponse | null, FormData>(
    requestAttendanceCorrectionAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      alert('Correction request submitted for administrator review.');
      onClose();
    }
  }, [state?.success, onClose]);

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Correction Request</h3>
              <p className="text-xs text-slate-500">Date: {record.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state?.error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="attendanceId" value={record.id} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Proposed Status</label>
            <select
              name="proposedStatus"
              defaultValue={record.status}
              className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
            >
              <option value="Present">Present</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
              <option value="Absent">Absent</option>
              <option value="Weekly Off">Weekly Off</option>
              <option value="Holiday">Holiday</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">1st Half In</label>
              <Input
                type="time"
                name="proposedFirstHalfIn"
                defaultValue={record.first_half_check_in || '09:30'}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">1st Half Out</label>
              <Input
                type="time"
                name="proposedFirstHalfOut"
                defaultValue={record.first_half_check_out || '13:30'}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">2nd Half In</label>
              <Input
                type="time"
                name="proposedSecondHalfIn"
                defaultValue={record.second_half_check_in || '14:30'}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-600">2nd Half Out</label>
              <Input
                type="time"
                name="proposedSecondHalfOut"
                defaultValue={record.second_half_check_out || '18:30'}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Correction Reason *</label>
            <textarea
              name="reason"
              rows={2}
              required
              placeholder="Explain why punch timing or status needs adjustment..."
              className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-slate-900 hover:bg-slate-800">
              {isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

