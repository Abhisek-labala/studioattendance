'use client';

import React, { useActionState } from 'react';
import { Settings, Building2, Clock, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateStudioSettingsAction } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SettingsViewProps {
  settings: {
    studio_name: string;
    phone?: string;
    email?: string;
    address?: string;
    working_hours_per_day: number;
    late_grace_period_minutes: number;
    half_day_minimum_minutes: number;
    full_day_minimum_minutes: number;
    overtime_threshold_minutes: number;
    require_work_approval: boolean;
    require_attendance_approval: boolean;
  } | null;
}

export function SettingsView({ settings }: SettingsViewProps) {
  const [state, formAction, isPending] = useActionState(updateStudioSettingsAction, null);

  const s = settings || {
    studio_name: 'Studio GFX Photography',
    phone: '+91 98765 43210',
    email: 'contact@studiogfx.com',
    address: '',
    working_hours_per_day: 8,
    late_grace_period_minutes: 15,
    half_day_minimum_minutes: 240,
    full_day_minimum_minutes: 480,
    overtime_threshold_minutes: 510,
    require_work_approval: true,
    require_attendance_approval: false,
  };

  return (
    <div className="space-y-6 max-w-4xl w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Studio Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure studio details, attendance policies, and approval workflows.</p>
      </div>

      {state?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="font-semibold">Settings updated successfully!</p>
        </div>
      )}

      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="font-medium">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {/* Studio Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              Studio Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Studio Name *</label>
              <Input name="studioName" defaultValue={s.studio_name} required className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone</label>
                <Input name="phone" defaultValue={s.phone || ''} className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <Input type="email" name="email" defaultValue={s.email || ''} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Address</label>
              <textarea name="address" rows={2} defaultValue={s.address || ''} className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Policy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Attendance Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Used by the attendance engine for calculating late arrivals, overtime, and half-days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Working Hours / Day</label>
                <Input type="number" name="workingHoursPerDay" defaultValue={s.working_hours_per_day} step="0.5" min="1" max="24" className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Late Grace Period (minutes)</label>
                <Input type="number" name="lateGracePeriodMinutes" defaultValue={s.late_grace_period_minutes} min="0" max="60" className="text-sm" />
                <p className="text-[10px] text-slate-400">Tolerance before marking a check-in as late</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Half Day Minimum (min)</label>
                <Input type="number" name="halfDayMinimumMinutes" defaultValue={s.half_day_minimum_minutes} min="60" className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Full Day Minimum (min)</label>
                <Input type="number" name="fullDayMinimumMinutes" defaultValue={s.full_day_minimum_minutes} min="240" className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Overtime Threshold (min)</label>
                <Input type="number" name="overtimeThresholdMinutes" defaultValue={s.overtime_threshold_minutes} min="240" className="text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-700" />
              Approval Workflows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="requireWorkApproval"
                name="requireWorkApproval"
                defaultChecked={s.require_work_approval}
                className="h-4 w-4 rounded border-slate-300"
              />
              <div>
                <label htmlFor="requireWorkApproval" className="text-sm font-semibold text-slate-800">
                  Require Admin Approval for Work Entries
                </label>
                <p className="text-xs text-slate-500">When enabled, submitted work entries wait for admin review before counting toward official points.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="requireAttendanceApproval"
                name="requireAttendanceApproval"
                defaultChecked={s.require_attendance_approval}
                className="h-4 w-4 rounded border-slate-300"
              />
              <div>
                <label htmlFor="requireAttendanceApproval" className="text-sm font-semibold text-slate-800">
                  Require Admin Approval for Attendance Records
                </label>
                <p className="text-xs text-slate-500">When enabled, staff attendance submissions require admin approval before being finalized.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isPending} className="bg-slate-900 hover:bg-slate-800 text-white">
            {isPending ? 'Saving Changes...' : 'Save Studio Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

