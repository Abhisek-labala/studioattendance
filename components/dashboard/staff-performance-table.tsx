'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, Target, Edit2, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TargetModal } from '@/components/staff/target-modal';
import { formatPoints } from '@/lib/utils';

export interface StaffPerformanceRecord {
  staff_id: string;
  full_name: string;
  staff_code: string;
  designation: string;
  target_points: number;
  approved_points: number;
  pending_points: number;
  approved_count: number;
  performance_percent: number;
}

interface StaffPerformanceTableProps {
  data: StaffPerformanceRecord[];
  isAdmin: boolean;
  currentYear: number;
  currentMonth: number;
}

export function StaffPerformanceTable({
  data,
  isAdmin,
  currentYear,
  currentMonth,
}: StaffPerformanceTableProps) {
  const [selectedStaffForTarget, setSelectedStaffForTarget] = useState<{
    id: string;
    full_name: string;
    staff_code: string;
    current_target?: number;
  } | null>(null);

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Target & Performance Details</h3>
              <p className="text-[11px] text-slate-500">
                Monthly productivity points vs assigned goals & achievement percentage
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
              {monthName}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="min-w-[160px]">Staff Member</TableHead>
                <TableHead className="min-w-[130px]">Designation</TableHead>
                <TableHead className="text-right min-w-[110px]">Monthly Target</TableHead>
                <TableHead className="text-right min-w-[110px]">Approved Points</TableHead>
                <TableHead className="min-w-[200px]">Performance Achievement</TableHead>
                <TableHead className="text-right min-w-[90px]">Pending</TableHead>
                <TableHead className="text-right min-w-[80px]">Entries</TableHead>
                {isAdmin && <TableHead className="text-right min-w-[100px]">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="h-28 text-center text-xs text-slate-400">
                    No staff records or work entries for this month.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((staff) => {
                  const percent = staff.performance_percent;
                  const isAchieved = percent >= 100;
                  const isOnTrack = percent >= 75 && percent < 100;

                  // Progress bar clamped from 0 to 100 for visual width
                  const visualProgress = Math.min(Math.max(percent, 0), 100);

                  return (
                    <TableRow key={staff.staff_id} className="hover:bg-slate-50/70">
                      <TableCell>
                        <Link
                          href={`/staff/${staff.staff_id}`}
                          className="font-bold text-slate-900 hover:text-amber-600 text-xs block hover:underline"
                        >
                          {staff.full_name}
                        </Link>
                        <span className="font-mono text-[10px] text-slate-400">{staff.staff_code}</span>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">{staff.designation}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-bold text-xs text-slate-800">
                            {formatPoints(staff.target_points)}
                          </span>
                          <span className="text-[10px] text-slate-400">pts</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            staff.approved_points > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {formatPoints(staff.approved_points)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-0.5">pts</span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`font-bold ${
                                isAchieved
                                  ? 'text-emerald-700'
                                  : isOnTrack
                                  ? 'text-amber-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {percent.toFixed(1)}%
                            </span>
                            <Badge
                              variant={
                                isAchieved
                                  ? 'default'
                                  : isOnTrack
                                  ? 'warning'
                                  : 'secondary'
                              }
                              className="text-[9px] px-1.5 py-0"
                            >
                              {isAchieved
                                ? 'Target Achieved'
                                : isOnTrack
                                ? 'On Track'
                                : `${(staff.target_points - staff.approved_points > 0
                                    ? staff.target_points - staff.approved_points
                                    : 0
                                  ).toFixed(0)} pts left`}
                            </Badge>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isAchieved
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : isOnTrack
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                                  : 'bg-gradient-to-r from-slate-400 to-slate-500'
                              }`}
                              style={{ width: `${visualProgress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-xs text-slate-500">
                        {staff.pending_points > 0 ? (
                          <span className="text-amber-700 font-medium">
                            +{formatPoints(staff.pending_points)} pts
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs font-semibold text-slate-700">
                        {staff.approved_count}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedStaffForTarget({
                                id: staff.staff_id,
                                full_name: staff.full_name,
                                staff_code: staff.staff_code,
                                current_target: staff.target_points,
                              })
                            }
                            className="h-7 px-2 text-[11px] text-slate-700 hover:text-amber-800 hover:border-amber-300 hover:bg-amber-50 gap-1"
                            title="Set Target Points for this staff member"
                          >
                            <Target className="h-3 w-3 text-amber-600" />
                            <span>Set Target</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Target Modal for Admin */}
      <TargetModal
        isOpen={!!selectedStaffForTarget}
        onClose={() => setSelectedStaffForTarget(null)}
        staff={selectedStaffForTarget}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />
    </>
  );
}

