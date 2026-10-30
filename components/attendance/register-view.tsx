'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CorrectionModal } from './correction-modal';
import { formatMinutes } from '@/lib/attendance/timing';
import { formatKolkataDate } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  first_half_check_in?: string;
  first_half_check_out?: string;
  second_half_check_in?: string;
  second_half_check_out?: string;
  first_half_check_in_at?: string;
  first_half_check_out_at?: string;
  second_half_check_in_at?: string;
  second_half_check_out_at?: string;
  first_half_in_location?: string;
  first_half_out_location?: string;
  second_half_in_location?: string;
  second_half_out_location?: string;
  total_working_minutes: number;
  overtime_minutes: number;
  is_late_arrival: boolean;
  remarks?: string;
}

interface RegisterViewProps {
  year: number;
  month: number; // 1-12
  staff: {
    id: string;
    full_name: string;
    staff_code: string;
    designation: string;
  };
  records: AttendanceRecord[];
  isStaffViewingOwn: boolean;
}

export function RegisterView({
  year,
  month,
  staff,
  records,
  isStaffViewingOwn,
}: RegisterViewProps) {
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<any | null>(null);

  // Pagination & Filtering state for DataTable
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showOnlyRecorded, setShowOnlyRecorded] = useState<boolean>(true);

  // Month metadata
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Map records by date string: 'YYYY-MM-DD' -> record
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : '';
      map.set(dStr, r);
    });
    return map;
  }, [records]);

  // Monthly summary metrics
  const summary = useMemo(() => {
    let presentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let weeklyOffs = 0;
    let totalMinutes = 0;
    let totalOvertimeMinutes = 0;

    records.forEach((r) => {
      if (r.status === 'Present') presentDays++;
      else if (r.status === 'Half Day') halfDays++;
      else if (r.status === 'Leave') leaveDays++;
      else if (r.status === 'Absent') absentDays++;
      else if (r.status === 'Weekly Off') weeklyOffs++;

      totalMinutes += Number(r.total_working_minutes || 0);
      totalOvertimeMinutes += Number(r.overtime_minutes || 0);
    });

    return {
      presentDays,
      halfDays,
      leaveDays,
      absentDays,
      weeklyOffs,
      totalMinutes,
      totalOvertimeMinutes,
    };
  }, [records]);

  // Full calendar rows for the month (1..daysInMonth)
  const fullCalendarRows = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateObj = new Date(year, month - 1, dayNum);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dateObj.getDay() === 0;
      const record = recordsMap.get(dateStr);

      return {
        dayNum,
        dateStr,
        dayOfWeek,
        isSunday,
        record,
      };
    });
  }, [daysInMonth, year, month, recordsMap]);

  // Filtered rows for the Interactive DataTable
  const filteredRows = useMemo(() => {
    // Reverse chronological order (latest days first)
    const reversed = [...fullCalendarRows].reverse();

    return reversed.filter((row) => {
      // Toggle: show all calendar days vs only recorded days
      if (showOnlyRecorded && !row.record) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const rowStatus = row.record?.status || (row.isSunday ? 'Weekly Off' : 'Not Recorded');
        if (rowStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [fullCalendarRows, showOnlyRecorded, statusFilter]);

  // Pagination calculations
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentSafePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentSafePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentSafePage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Weekday',
      'Status',
      'Morning In',
      'Morning Out',
      'Evening In',
      'Evening Out',
      'Working Hours',
      'Overtime',
      'Location / Remarks',
    ];

    const csvRows = fullCalendarRows.map((row) => {
      const rec = row.record;
      const status = rec?.status || (row.isSunday ? 'Weekly Off' : 'Not Recorded');
      return [
        row.dateStr,
        row.dayOfWeek,
        status,
        rec?.first_half_check_in || '',
        rec?.first_half_check_out || '',
        rec?.second_half_check_in || '',
        rec?.second_half_check_out || '',
        rec ? formatMinutes(rec.total_working_minutes) : '',
        rec?.overtime_minutes ? `+${formatMinutes(rec.overtime_minutes)}` : '',
        `"${(rec?.remarks || rec?.first_half_in_location || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${staff.staff_code}_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatShortTime = (timeStr?: string | null) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* 1. SCREEN VIEW: Interactive Paginated DataTable */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden print:hidden">
        {/* DataTable Top Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Attendance History & Register
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {monthName} {year} &middot; <strong className="text-slate-800">{staff.full_name}</strong> ({staff.staff_code})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Actions */}
            <Button
              type="button"
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            <Button
              type="button"
              onClick={() => window.print()}
              size="sm"
              className="h-8 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Export PDF / Print
            </Button>
          </div>
        </div>

        {/* Filter & Controls Bar */}
        <div className="px-4 py-2.5 bg-slate-50/75 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {['ALL', 'Present', 'Half Day', 'Leave', 'Absent'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Toggle: Recorded Only vs All 31 Days */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 text-xs">
              <input
                type="checkbox"
                checked={showOnlyRecorded}
                onChange={(e) => {
                  setShowOnlyRecorded(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
              />
              <span>Recorded Days Only</span>
            </label>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-800"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={31}>All</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Paginated Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 text-[11px]">
                <TableHead className="font-semibold text-slate-700 w-28">Date</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center w-24">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Morning Shift</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Evening Shift</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Working Hours</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Overtime</TableHead>
                <TableHead className="font-semibold text-slate-700">Location / Remarks</TableHead>
                {isStaffViewingOwn && (
                  <TableHead className="font-semibold text-slate-700 text-right w-16">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No attendance records match your filter.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => {
                  const rec = row.record;
                  const isSunday = row.isSunday;

                  return (
                    <TableRow key={row.dateStr} className="text-xs hover:bg-slate-50/60">
                      {/* Date & Weekday */}
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {formatKolkataDate(row.dateStr, { day: '2-digit', month: 'short' })}
                          </span>
                          <span className={`text-[11px] ${isSunday ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                            ({row.dayOfWeek})
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        {rec ? (
                          <Badge
                            variant={
                              rec.status === 'Present'
                                ? 'success'
                                : rec.status === 'Half Day'
                                ? 'warning'
                                : rec.status === 'Leave'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            {rec.status}
                          </Badge>
                        ) : isSunday ? (
                          <span className="text-slate-400 text-[11px]">Weekly Off</span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </TableCell>

                      {/* Morning Shift */}
                      <TableCell className="text-center whitespace-nowrap">
                        {rec?.first_half_check_in ? (
                          <div className="flex items-center justify-center gap-1 font-mono text-[11px] text-slate-800">
                            <span>{formatShortTime(rec.first_half_check_in)}</span>
                            <span className="text-slate-300">&ndash;</span>
                            <span>{formatShortTime(rec.first_half_check_out)}</span>
                            {rec.first_half_in_location && (
                              <span title={`Morning Location: ${rec.first_half_in_location}`} className="text-amber-600 cursor-help">
                                <MapPin className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      {/* Evening Shift */}
                      <TableCell className="text-center whitespace-nowrap">
                        {rec?.second_half_check_in ? (
                          <div className="flex items-center justify-center gap-1 font-mono text-[11px] text-slate-800">
                            <span>{formatShortTime(rec.second_half_check_in)}</span>
                            <span className="text-slate-300">&ndash;</span>
                            <span>{formatShortTime(rec.second_half_check_out)}</span>
                            {rec.second_half_in_location && (
                              <span title={`Evening Location: ${rec.second_half_in_location}`} className="text-indigo-600 cursor-help">
                                <MapPin className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="text-center font-mono text-slate-700 whitespace-nowrap">
                        {rec && rec.total_working_minutes > 0 ? (
                          formatMinutes(rec.total_working_minutes)
                        ) : rec ? (
                          <span className="text-slate-400 text-xs">0h 0m</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      {/* Overtime */}
                      <TableCell className="text-center font-mono whitespace-nowrap">
                        {rec && rec.overtime_minutes > 0 ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            +{formatMinutes(rec.overtime_minutes)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>

                      {/* Remarks & Location */}
                      <TableCell className="text-slate-600 text-[11px] max-w-xs truncate" title={rec?.remarks || rec?.first_half_in_location || ''}>
                        {rec?.remarks || rec?.first_half_in_location || <span className="text-slate-300">—</span>}
                      </TableCell>

                      {/* Correction Action */}
                      {isStaffViewingOwn && (
                        <TableCell className="text-right whitespace-nowrap">
                          {rec && (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForCorrection(rec)}
                              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              Correct
                            </button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{totalItems === 0 ? 0 : (currentSafePage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(currentSafePage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-slate-800">{totalItems}</strong> days
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSafePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                type="button"
                variant={page === currentSafePage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={`h-7 min-w-7 px-2 text-xs ${
                  page === currentSafePage
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {page}
              </Button>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSafePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. PRINT / PDF VIEW: Formal Full A4 Sheet (Only rendered when printing) */}
      {/* =================================================================== */}
      <div className="hidden print:block p-0">
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">STUDIO GFX PHOTOGRAPHY</h1>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Monthly Staff Attendance & Duty Register
              </p>
            </div>
            <div className="text-right text-xs text-slate-700">
              <p className="font-bold">{monthName} {year}</p>
              <p className="text-[11px] text-slate-500">A4 Portrait Record</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-200">
            <div><span className="font-semibold text-slate-600">Employee: </span>{staff.full_name}</div>
            <div><span className="font-semibold text-slate-600">Staff ID: </span><span className="font-mono font-bold">{staff.staff_code}</span></div>
            <div><span className="font-semibold text-slate-600">Role: </span>{staff.designation}</div>
            <div><span className="font-semibold text-slate-600">Days in Month: </span>{daysInMonth}</div>
          </div>
        </div>

        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-y border-slate-300 font-bold">
              <th className="py-1 px-1.5 w-10 text-center">Day</th>
              <th className="py-1 px-1.5 w-10">Weekday</th>
              <th className="py-1 px-1.5 w-20">Status</th>
              <th className="py-1 px-1.5 text-center">1st Half In</th>
              <th className="py-1 px-1.5 text-center">1st Half Out</th>
              <th className="py-1 px-1.5 text-center">2nd Half In</th>
              <th className="py-1 px-1.5 text-center">2nd Half Out</th>
              <th className="py-1 px-1.5 text-right">Duration</th>
              <th className="py-1 px-1.5 text-right">Overtime</th>
              <th className="py-1 px-2">Remarks / Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {fullCalendarRows.map((row) => {
              const rec = row.record;
              return (
                <tr key={row.dayNum} className={row.isSunday ? 'bg-slate-50/60 font-medium' : ''}>
                  <td className="py-1 px-1.5 text-center font-bold">{String(row.dayNum).padStart(2, '0')}</td>
                  <td className="py-1 px-1.5">{row.dayOfWeek}</td>
                  <td className="py-1 px-1.5">{rec?.status || (row.isSunday ? 'Weekly Off' : '-')}</td>
                  <td className="py-1 px-1.5 text-center">{rec?.first_half_check_in?.substring(0, 5) || '-'}</td>
                  <td className="py-1 px-1.5 text-center">{rec?.first_half_check_out?.substring(0, 5) || '-'}</td>
                  <td className="py-1 px-1.5 text-center">{rec?.second_half_check_in?.substring(0, 5) || '-'}</td>
                  <td className="py-1 px-1.5 text-center">{rec?.second_half_check_out?.substring(0, 5) || '-'}</td>
                  <td className="py-1 px-1.5 text-right">{rec ? formatMinutes(rec.total_working_minutes) : '-'}</td>
                  <td className="py-1 px-1.5 text-right">{rec?.overtime_minutes ? `+${formatMinutes(rec.overtime_minutes)}` : '-'}</td>
                  <td className="py-1 px-2 text-[9px] truncate max-w-xs">{rec?.remarks || rec?.first_half_in_location || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Verification Signatures (Visible on A4 Print) */}
        <div className="mt-8 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
          <div className="space-y-6">
            <div className="h-8 border-b border-slate-400 w-48" />
            <p className="font-semibold">Staff Member Signature</p>
            <p className="text-[10px] text-slate-500">Date: ____________________</p>
          </div>
          <div className="space-y-6 text-right">
            <div className="h-8 border-b border-slate-400 w-48 ml-auto" />
            <p className="font-semibold">Authorized Signatory / Studio Manager</p>
            <p className="text-[10px] text-slate-500">Date: ____________________</p>
          </div>
        </div>
      </div>

      {/* Correction Modal */}
      <CorrectionModal
        isOpen={!!selectedRecordForCorrection}
        onClose={() => setSelectedRecordForCorrection(null)}
        record={selectedRecordForCorrection}
      />
    </div>
  );
}
