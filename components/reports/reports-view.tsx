'use client';

import React, { useState } from 'react';
import { BarChart3, Download, Printer, Award, Camera, Film, Moon, MapPin, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPoints } from '@/lib/utils';
import { formatMinutes } from '@/lib/attendance/timing';

interface ReportsViewProps {
  year: number;
  month: number;
  staffOptions: any[];
  selectedStaffId: string | null;
  performanceData: any[];
  attendanceData: any[];
  isAdmin: boolean;
}

export function ReportsView({
  year, month, staffOptions, selectedStaffId, performanceData, attendanceData, isAdmin
}: ReportsViewProps) {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Summary Totals
  const totalApproved = performanceData.reduce((s, r) => s + r.approved_points, 0);
  const totalTarget = performanceData.reduce((s, r) => s + parseFloat(r.target_points || '150'), 0);
  const totalBonuses = performanceData.reduce((s, r) => s + r.total_bonuses, 0);
  const totalAlbumSheets = performanceData.reduce((s, r) => s + parseFloat(r.album_sheets || '0'), 0);
  const totalVideoHours = performanceData.reduce((s, r) => s + parseFloat(r.video_hours || '0'), 0);

  const handleExportCSV = () => {
    const headers = [
      'Staff Code',
      'Staff Name',
      'Designation',
      'Monthly Target Points',
      'Approved Points',
      'Performance %',
      'Pending Points',
      'Album Sheets',
      'Album Pts',
      'Video Hrs',
      'Video Pts',
      'Shoot Pts',
      'Late-Night Bonus',
      'Out-Station Bonus',
      'Total Bonuses',
      'Shoots',
    ];

    const rows = performanceData.map((r) => {
      const target = parseFloat(r.target_points || '150');
      const approved = parseFloat(r.approved_points || '0');
      const percent = target > 0 ? ((approved / target) * 100).toFixed(1) + '%' : '0.0%';

      return [
        r.staff_code,
        r.full_name,
        r.designation,
        target,
        approved,
        percent,
        r.pending_points,
        parseFloat(r.album_sheets || '0').toFixed(0),
        r.album_edit_points,
        parseFloat(r.video_hours || '0').toFixed(1),
        r.video_edit_points,
        r.shoot_base,
        r.late_night_bonus,
        r.out_of_station_bonus,
        r.total_bonuses,
        r.total_shoots,
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudioGFX_Report_${monthName}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Exports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monthly performance, attendance summary, and work analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} variant="outline" size="sm" className="flex items-center gap-1.5 text-slate-700">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleExportCSV} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <form method="GET" className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Staff:</span>
            <select name="staff" defaultValue={selectedStaffId || ''} className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900">
              <option value="">All Studio Staff</option>
              {staffOptions.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.staff_code})</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Month:</span>
          <select name="month" defaultValue={month} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select name="year" defaultValue={year} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit" className="h-8 rounded bg-slate-900 px-3 text-white font-medium hover:bg-slate-800">
            Generate
          </button>
        </div>
      </form>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Points</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatPoints(totalApproved)}</p>
              </div>
              <Award className="h-8 w-8 text-amber-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Album Sheets</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{totalAlbumSheets.toFixed(0)}</p>
              </div>
              <Film className="h-8 w-8 text-indigo-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Video Hours</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{totalVideoHours.toFixed(1)}</p>
              </div>
              <Camera className="h-8 w-8 text-purple-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Bonuses</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPoints(totalBonuses)}</p>
              </div>
              <MapPin className="h-8 w-8 text-emerald-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Report Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Staff Performance — {monthName} {year}
              </h3>
              <p className="text-[11px] text-slate-500">Approved work entries only</p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead>Staff Member</TableHead>
              <TableHead className="text-right">Monthly Target</TableHead>
              <TableHead className="text-right">Approved Pts</TableHead>
              <TableHead className="text-center min-w-[120px]">Performance %</TableHead>
              <TableHead className="text-right">Album Sheets</TableHead>
              <TableHead className="text-right">Album Pts</TableHead>
              <TableHead className="text-right">Video Hrs</TableHead>
              <TableHead className="text-right">Video Pts</TableHead>
              <TableHead className="text-right">Shoot Pts</TableHead>
              <TableHead className="text-right">
                <span className="flex items-center gap-1 justify-end">
                  <Moon className="h-3 w-3 text-indigo-500" />
                  Late Night
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="flex items-center gap-1 justify-end">
                  <MapPin className="h-3 w-3 text-amber-600" />
                  Out-Station
                </span>
              </TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performanceData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-xs text-slate-400">
                  No performance data for {monthName} {year}.
                </TableCell>
              </TableRow>
            ) : (
              performanceData.map((r, i) => {
                const target = parseFloat(r.target_points || '150');
                const approved = parseFloat(r.approved_points || '0');
                const percent = target > 0 ? (approved / target) * 100 : 0;
                const isAchieved = percent >= 100;
                const visualProgress = Math.min(Math.max(percent, 0), 100);

                return (
                  <TableRow key={i} className="hover:bg-slate-50/70 text-xs">
                    <TableCell>
                      <p className="font-bold text-slate-900">{r.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.staff_code} · {r.designation}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">
                      {target.toFixed(0)} <span className="text-[10px] text-slate-400">pts</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600 text-sm">
                      {formatPoints(r.approved_points)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`font-bold text-[11px] ${
                            isAchieved ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {percent.toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${visualProgress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  <TableCell className="text-right text-slate-700">
                    {parseFloat(r.album_sheets || '0').toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right text-slate-700">
                    {formatPoints(r.album_edit_points)}
                  </TableCell>
                  <TableCell className="text-right text-slate-700">
                    {parseFloat(r.video_hours || '0').toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-slate-700">
                    {formatPoints(r.video_edit_points)}
                  </TableCell>
                  <TableCell className="text-right text-slate-700">
                    {formatPoints(r.shoot_base)}
                  </TableCell>
                  <TableCell className="text-right text-indigo-700 font-medium">
                    {r.late_night_bonus > 0 ? `+${formatPoints(r.late_night_bonus)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-amber-700 font-medium">
                    {r.out_of_station_bonus > 0 ? `+${formatPoints(r.out_of_station_bonus)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {r.pending_points > 0 ? (
                      <span className="text-amber-600">{formatPoints(r.pending_points)}</span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
          {/* Totals Row */}
          {performanceData.length > 1 && (
            <TableRow className="bg-slate-50 font-bold text-xs border-t-2 border-slate-300">
              <TableCell className="font-bold text-slate-900">TOTAL</TableCell>
              <TableCell className="text-right font-semibold text-slate-800">
                {formatPoints(totalTarget)} pts
              </TableCell>
              <TableCell className="text-right text-amber-600 text-sm">
                {formatPoints(totalApproved)}
              </TableCell>
              <TableCell className="text-center font-bold text-slate-800">
                {(totalTarget > 0 ? (totalApproved / totalTarget) * 100 : 0).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">{totalAlbumSheets.toFixed(0)}</TableCell>
              <TableCell className="text-right">{formatPoints(performanceData.reduce((s, r) => s + r.album_edit_points, 0))}</TableCell>
              <TableCell className="text-right">{totalVideoHours.toFixed(1)}</TableCell>
              <TableCell className="text-right">{formatPoints(performanceData.reduce((s, r) => s + r.video_edit_points, 0))}</TableCell>
              <TableCell className="text-right">{formatPoints(performanceData.reduce((s, r) => s + r.shoot_base, 0))}</TableCell>
              <TableCell className="text-right text-indigo-700">
                +{formatPoints(performanceData.reduce((s, r) => s + r.late_night_bonus, 0))}
              </TableCell>
              <TableCell className="text-right text-amber-700">
                +{formatPoints(performanceData.reduce((s, r) => s + r.out_of_station_bonus, 0))}
              </TableCell>
              <TableCell className="text-right text-amber-600">
                {formatPoints(performanceData.reduce((s, r) => s + r.pending_points, 0))}
              </TableCell>
            </TableRow>
          )}
          </TableBody>
        </Table>
      </div>

      {/* Attendance Summary */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Monthly Attendance Summary — {monthName} {year}
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead>Staff Member</TableHead>
              <TableHead className="text-center">Present</TableHead>
              <TableHead className="text-center">Half Day</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Leave</TableHead>
              <TableHead className="text-center">Weekly Off</TableHead>
              <TableHead className="text-right">Working Time</TableHead>
              <TableHead className="text-right">Overtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-xs text-slate-400">
                  No attendance records for {monthName} {year}.
                </TableCell>
              </TableRow>
            ) : (
              attendanceData.map((a, i) => (
                <TableRow key={i} className="hover:bg-slate-50/70 text-xs">
                  <TableCell>
                    <p className="font-bold text-slate-900">{a.full_name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{a.staff_code}</p>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-emerald-700">{a.present_days}</TableCell>
                  <TableCell className="text-center font-semibold text-amber-700">{a.half_days}</TableCell>
                  <TableCell className="text-center font-semibold text-red-700">{a.absent_days}</TableCell>
                  <TableCell className="text-center font-semibold text-blue-700">{a.leave_days}</TableCell>
                  <TableCell className="text-center text-slate-600">{a.weekly_off}</TableCell>
                  <TableCell className="text-right font-medium text-slate-800">
                    {formatMinutes(a.total_minutes)}
                  </TableCell>
                  <TableCell className="text-right text-amber-700 font-medium">
                    {a.overtime_minutes > 0 ? `+${formatMinutes(a.overtime_minutes)}` : '—'}
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

