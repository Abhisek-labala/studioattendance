'use client';

import React, { useState } from 'react';
import { Check, X, AlertCircle, Clock, User } from 'lucide-react';
import { reviewAttendanceCorrectionAction } from '@/app/actions/attendance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatKolkataDate } from '@/lib/utils';

interface CorrectionRequest {
  id: string;
  attendance_id: string;
  staff_name: string;
  staff_code: string;
  date: string;
  current_status: string;
  proposed_status?: string;
  proposed_first_half_in?: string;
  proposed_first_half_out?: string;
  proposed_second_half_in?: string;
  proposed_second_half_out?: string;
  reason: string;
  created_at: string;
}

interface CorrectionsReviewProps {
  requests: CorrectionRequest[];
}

export function CorrectionsReview({ requests }: CorrectionsReviewProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    let notes = '';
    if (decision === 'Rejected') {
      const reasonInput = prompt('Enter rejection reason (optional):');
      if (reasonInput === null) return; // cancelled
      notes = reasonInput;
    }

    setLoadingId(id);
    try {
      const res = await reviewAttendanceCorrectionAction(id, decision, notes);
      if (!res.success) {
        alert('Action failed: ' + res.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm">
        No pending attendance correction requests.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Pending Attendance Correction Requests</h3>
        </div>
        <Badge variant="warning">{requests.length} Pending</Badge>
      </div>

      <div className="divide-y divide-slate-100">
        {requests.map((req) => (
          <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{req.staff_name}</span>
                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  {req.staff_code}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-700">
                  Date: {formatKolkataDate(req.date)}
                </span>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <p>
                  <span className="font-semibold text-slate-700">Reason: </span>
                  &ldquo;{req.reason}&rdquo;
                </p>
                <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-1">
                  <span>Current: <strong>{req.current_status}</strong></span>
                  {req.proposed_status && <span>Proposed: <strong className="text-amber-800">{req.proposed_status}</strong></span>}
                  {req.proposed_first_half_in && <span>1st Half: {req.proposed_first_half_in} - {req.proposed_first_half_out}</span>}
                  {req.proposed_second_half_in && <span>2nd Half: {req.proposed_second_half_in} - {req.proposed_second_half_out}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={loadingId === req.id}
                onClick={() => handleReview(req.id, 'Rejected')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs border-red-200"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                disabled={loadingId === req.id}
                onClick={() => handleReview(req.id, 'Approved')}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

