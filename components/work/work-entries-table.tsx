'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  FileSpreadsheet,
  Info,
  Edit2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { reviewWorkEntryAction, correctApprovedWorkEntryAction } from '@/app/actions/work';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatKolkataDate, formatPoints } from '@/lib/utils';

export interface WorkEntryItem {
  id: string;
  work_date: string;
  staff_id: string;
  staff_name: string;
  staff_code: string;
  project_id?: string;
  project_name?: string;
  work_type: string;
  quantity_or_duration: number;
  is_late_night: boolean;
  is_out_of_station: boolean;
  is_rework: boolean;
  base_points: number;
  bonus_points: number;
  total_points: number;
  rule_version: string;
  calculation_snapshot: any;
  remarks?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  rejection_reason?: string;
  submitted_at: string;
}

interface WorkEntriesTableProps {
  entries: WorkEntryItem[];
  isAdmin: boolean;
}

export function WorkEntriesTable({ entries, isAdmin }: WorkEntriesTableProps) {
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'Submitted' | 'Approved' | 'Rejected'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [snapshotModalEntry, setSnapshotModalEntry] = useState<WorkEntryItem | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter entries based on tab & search query
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Status filter
      if (selectedTab !== 'ALL' && e.status !== selectedTab) return false;

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesStaff = e.staff_name.toLowerCase().includes(q) || e.staff_code.toLowerCase().includes(q);
        const matchesType = e.work_type.toLowerCase().includes(q);
        const matchesProject = e.project_name?.toLowerCase().includes(q);
        const matchesRemarks = e.remarks?.toLowerCase().includes(q);
        if (!matchesStaff && !matchesType && !matchesProject && !matchesRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedTab, searchQuery]);

  // Reset to page 1 on filter change
  const handleTabChange = (tab: 'ALL' | 'Submitted' | 'Approved' | 'Rejected') => {
    setSelectedTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + pageSize);

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    let reason = '';
    if (decision === 'Rejected') {
      const input = prompt('Please state the rejection reason (required):');
      if (!input || input.trim().length === 0) return;
      reason = input.trim();
    }

    setLoadingId(id);
    try {
      const res = await reviewWorkEntryAction(id, decision, reason);
      if (!res.success) {
        alert('Action failed: ' + res.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleAdminCorrection = async (entry: WorkEntryItem) => {
    const newPtsStr = prompt(
      `Enter corrected points for ${entry.staff_name} (${entry.work_type}):`,
      String(entry.total_points)
    );
    if (newPtsStr === null) return;
    const newPts = parseFloat(newPtsStr);
    if (isNaN(newPts) || newPts < 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    const reason = prompt('Audited Correction Reason (required for audit log):');
    if (!reason || reason.trim().length < 5) {
      alert('A valid reason of at least 5 characters is required.');
      return;
    }

    setLoadingId(entry.id);
    try {
      const res = await correctApprovedWorkEntryAction(entry.id, newPts, reason);
      if (!res.success) {
        alert('Correction failed: ' + res.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls Bar: Tabs + Search + Page Size */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Status Filter Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => handleTabChange('ALL')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            onClick={() => handleTabChange('Submitted')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedTab === 'Submitted'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({entries.filter((e) => e.status === 'Submitted').length})
          </button>
          <button
            onClick={() => handleTabChange('Approved')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedTab === 'Approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({entries.filter((e) => e.status === 'Approved').length})
          </button>
          <button
            onClick={() => handleTabChange('Rejected')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedTab === 'Rejected'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({entries.filter((e) => e.status === 'Rejected').length})
          </button>
        </div>

        {/* Search Input & Page size */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-8 pl-8 pr-2.5 text-xs w-44 sm:w-56 bg-white border-slate-200"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:outline-none"
            title="Rows per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Work Entries Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 border-b border-slate-200">
              <TableHead className="w-28 text-xs font-bold text-slate-700">Date</TableHead>
              {isAdmin && <TableHead className="text-xs font-bold text-slate-700">Staff Member</TableHead>}
              <TableHead className="text-xs font-bold text-slate-700">Work Type & Project</TableHead>
              <TableHead className="text-center text-xs font-bold text-slate-700">Quantity</TableHead>
              <TableHead className="text-center text-xs font-bold text-slate-700">Bonuses</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700">Points</TableHead>
              <TableHead className="text-center text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileSpreadsheet className="h-6 w-6 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No work register entries found.</p>
                    {searchQuery && (
                      <p className="text-[11px] text-slate-400">
                        Try adjusting your search query or switching tabs.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEntries.map((e) => (
                <TableRow key={e.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                  {/* Date */}
                  <TableCell className="text-xs text-slate-700 font-medium whitespace-nowrap">
                    {formatKolkataDate(e.work_date)}
                  </TableCell>

                  {/* Staff Member (Admin only) */}
                  {isAdmin && (
                    <TableCell>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{e.staff_name}</p>
                      <p className="font-mono text-[10px] text-slate-500">{e.staff_code}</p>
                    </TableCell>
                  )}

                  {/* Work Type & Project */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900">{e.work_type}</span>
                      <button
                        onClick={() => setSnapshotModalEntry(e)}
                        className="text-slate-400 hover:text-amber-600 p-0.5 rounded transition-colors"
                        title="View Calculation Rule Snapshot"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {e.project_name ? (
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{e.project_name}</p>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Studio Direct / Independent</span>
                    )}
                    {e.remarks && (
                      <p className="text-[10px] text-slate-600 italic mt-0.5">&ldquo;{e.remarks}&rdquo;</p>
                    )}
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="text-center text-xs font-medium text-slate-800 whitespace-nowrap">
                    {e.quantity_or_duration}
                    <span className="text-[10px] text-slate-400 ml-1">
                      {e.work_type === 'Album Photo Edit'
                        ? 'sheets'
                        : e.work_type === 'Video Edit'
                        ? 'hrs'
                        : 'event'}
                    </span>
                  </TableCell>

                  {/* Bonuses */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {e.is_late_night && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                          Late-Night
                        </span>
                      )}
                      {e.is_out_of_station && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                          Out-Station
                        </span>
                      )}
                      {e.is_rework && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                          Rework
                        </span>
                      )}
                      {!e.is_late_night && !e.is_out_of_station && !e.is_rework && (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Points */}
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="font-bold text-xs text-slate-900">
                      {formatPoints(e.total_points)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-0.5">pts</span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        e.status === 'Approved'
                          ? 'success'
                          : e.status === 'Rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px] px-2 py-0.5 font-medium"
                    >
                      {e.status}
                    </Badge>
                    {e.status === 'Rejected' && e.rejection_reason && (
                      <p className="text-[10px] text-red-600 mt-0.5 max-w-[120px] truncate mx-auto" title={e.rejection_reason}>
                        {e.rejection_reason}
                      </p>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin && e.status === 'Submitted' && (
                        <>
                          <Button
                            size="sm"
                            disabled={loadingId === e.id}
                            onClick={() => handleReview(e.id, 'Approved')}
                            className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === e.id}
                            onClick={() => handleReview(e.id, 'Rejected')}
                            className="h-6 px-2 text-[11px] text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {isAdmin && e.status === 'Approved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAdminCorrection(e)}
                          className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                          title="Audited point correction"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Correct
                        </Button>
                      )}

                      {!isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSnapshotModalEntry(e)}
                          className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                        >
                          Details
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {filteredEntries.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 gap-2">
            <div>
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(startIndex + pageSize, filteredEntries.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredEntries.length}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Previous
              </Button>

              <span className="px-2 text-xs font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot / Formula Modal */}
      {snapshotModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                Entry Calculation Breakdown
              </h3>
              <button
                onClick={() => setSnapshotModalEntry(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Member:</span>
                <span className="font-semibold">{snapshotModalEntry.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Work Type:</span>
                <span className="font-semibold">{snapshotModalEntry.work_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rule Version:</span>
                <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                  v{snapshotModalEntry.rule_version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base Points:</span>
                <span className="font-semibold">{formatPoints(snapshotModalEntry.base_points)} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bonus Points:</span>
                <span className="font-semibold">{formatPoints(snapshotModalEntry.bonus_points)} pts</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="font-bold text-slate-900">Total Awarded Points:</span>
                <span className="font-bold text-amber-600 text-sm">
                  {formatPoints(snapshotModalEntry.total_points)} pts
                </span>
              </div>

              {snapshotModalEntry.calculation_snapshot?.formula && (
                <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Audit Formula</span>
                  <p className="font-mono text-xs text-slate-800 mt-0.5">
                    {snapshotModalEntry.calculation_snapshot.formula}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSnapshotModalEntry(null)} className="h-7 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
