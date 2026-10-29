'use client';

import React, { useState, useEffect } from 'react';
import { Target, X, Check, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setStaffMonthlyTargetAction, getStaffMonthlyTargetAction } from '@/app/actions/staff';

interface TargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: {
    id: string;
    full_name: string;
    staff_code: string;
    current_target?: number;
  } | null;
  currentYear?: number;
  currentMonth?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function TargetModal({
  isOpen,
  onClose,
  staff,
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth() + 1,
}: TargetModalProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [targetPoints, setTargetPoints] = useState<string>(
    staff?.current_target ? String(staff.current_target) : '150'
  );
  const [notes, setNotes] = useState('');
  const [updateDefault, setUpdateDefault] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isLoadingTarget, setIsLoadingTarget] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (staff && isOpen) {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth);
      setTargetPoints(staff.current_target ? String(staff.current_target) : '150');
      setNotes('');
      setUpdateDefault(false);
      setError(null);
      setSuccess(false);
    }
  }, [staff, isOpen, currentYear, currentMonth]);

  // When month or year changes, fetch that specific month's target
  useEffect(() => {
    if (!staff || !isOpen) return;

    let isSubscribed = true;
    setIsLoadingTarget(true);

    getStaffMonthlyTargetAction(staff.id, selectedYear, selectedMonth)
      .then((res) => {
        if (isSubscribed && res.success) {
          setTargetPoints(String(res.targetPoints));
          if (res.notes) setNotes(res.notes);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingTarget(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [staff, selectedYear, selectedMonth, isOpen]);

  if (!isOpen || !staff) return null;

  const monthName = MONTHS[selectedMonth - 1];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const val = parseFloat(targetPoints);
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid positive number for target points.');
      setIsPending(false);
      return;
    }

    const res = await setStaffMonthlyTargetAction(
      staff.id,
      val,
      selectedYear,
      selectedMonth,
      notes,
      updateDefault
    );
    setIsPending(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setError(res.error || 'Failed to update target points.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Set Month-Wise Target</h3>
              <p className="text-[11px] text-slate-500">
                Customizable productivity target per month
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Target for {monthName} {selectedYear} saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          {/* Staff Info Banner */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500">Staff: </span>
              <span className="font-bold text-slate-900">{staff.full_name}</span>
              <span className="text-slate-400 ml-1 font-mono">({staff.staff_code})</span>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              Monthly Goal
            </span>
          </div>

          {/* Month & Year Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Select Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 font-medium"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 font-medium"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Points Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Target Points for {monthName} {selectedYear} *
              </label>
              {isLoadingTarget && (
                <span className="text-[10px] text-slate-400 animate-pulse">Loading target...</span>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                step="5"
                min="0"
                required
                value={targetPoints}
                onChange={(e) => setTargetPoints(e.target.value)}
                placeholder="e.g. 150"
                className="pr-12 text-sm font-bold text-slate-900"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">pts</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Each month can have a unique target (e.g. 200 pts in wedding season, 120 pts in monsoon).
            </p>
          </div>

          {/* Notes (e.g. Season / Reason) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Month Notes (Optional)</label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Peak wedding season target"
              className="text-xs"
            />
          </div>

          {/* Optional Checkbox to also set as default */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="updateDefault"
              checked={updateDefault}
              onChange={(e) => setUpdateDefault(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="updateDefault" className="text-[11px] text-slate-600 cursor-pointer">
              Also set this as the default baseline target for future unassigned months
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isPending ? 'Saving...' : `Save Target for ${monthName}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


