'use client';

import React, { useState, useMemo, useActionState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Moon,
  MapPin,
  RefreshCw,
  FolderKanban,
  Calendar,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { submitWorkEntryAction, WorkActionResponse } from '@/app/actions/work';
import { calculateWorkPoints, PointRuleConfig, WorkType } from '@/lib/points/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface WorkSubmissionCardProps {
  currentStaffId?: string;
  isAdmin: boolean;
  staffOptions?: Array<{ id: string; full_name: string; staff_code: string }>;
  projectOptions?: Array<{ id: string; project_code: string; project_name: string; is_out_of_station: boolean }>;
  pointRules?: PointRuleConfig[];
}

export function WorkSubmissionCard({
  currentStaffId,
  isAdmin,
  staffOptions = [],
  projectOptions = [],
  pointRules = [],
}: WorkSubmissionCardProps) {
  const [state, formAction, isPending] = useActionState<WorkActionResponse | null, FormData>(
    submitWorkEntryAction,
    null
  );

  const [isOpen, setIsOpen] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState(currentStaffId || '');

  // Default to first active rule or Wedding Shoot
  const defaultWorkType = pointRules.length > 0 ? pointRules[0].work_type : 'Wedding Shoot';
  const [workType, setWorkType] = useState<WorkType>(defaultWorkType);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLateNight, setIsLateNight] = useState<boolean>(false);
  const [isOutOfStation, setIsOutOfStation] = useState<boolean>(false);
  const [isRework, setIsRework] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Default to today's date in YYYY-MM-DD
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  // Sync default work type if rules load asynchronously
  useEffect(() => {
    if (pointRules.length > 0 && !pointRules.some((r) => r.work_type === workType)) {
      setWorkType(pointRules[0].work_type);
    }
  }, [pointRules]);

  // Find active rule configuration
  const activeRule = useMemo(() => {
    return pointRules.find((r) => r.work_type === workType) || null;
  }, [pointRules, workType]);

  // Generate unique idempotency key on mount or after successful submission
  useEffect(() => {
    setIdempotencyKey(Math.random().toString(36).substring(2) + Date.now().toString(36));
    if (state?.success) {
      setRemarks('');
      setQuantity(1);
      setIsLateNight(false);
      setIsRework(false);
    }
  }, [state?.success]);

  // When project changes, auto-detect out-of-station flag
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projectOptions.find((p) => p.id === projId);
    if (proj) {
      setIsOutOfStation(proj.is_out_of_station);
    }
  };

  // Live calculation preview using identical engine logic
  const liveCalculation = useMemo(() => {
    return calculateWorkPoints(
      {
        workType,
        quantityOrDuration: quantity,
        isLateNight,
        isOutOfStation,
        isRework,
      },
      activeRule
    );
  }, [workType, quantity, isLateNight, isOutOfStation, isRework, activeRule]);

  // Unit text based on active rule or work type
  const unitLabel = useMemo(() => {
    if (activeRule) {
      if (activeRule.rate_unit === 'sheet') return `Sheets (${activeRule.base_points_per_unit} pt/sheet)`;
      if (activeRule.rate_unit === 'hour') return `Hours (${activeRule.base_points_per_unit} pts/hr)`;
      return `Qty (${activeRule.rate_unit})`;
    }
    if (workType === 'Album Photo Edit') return 'Sheets (1 pt/sheet)';
    if (workType === 'Video Edit') return 'Hours (10 pts/hr)';
    return 'Event Count';
  }, [workType, activeRule]);

  const isLateNightAllowed = activeRule ? Boolean(activeRule.late_night_eligible) : workType === 'Wedding Shoot';
  const isOutOfStationAllowed = activeRule ? Boolean(activeRule.out_of_station_eligible) : true;

  return (
    <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden">
      {/* Sleek Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">Log Work Entry</h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Record editing sheets, video cut hours, or shoot events for productivity points
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Subtle Live Points Pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400">
              {liveCalculation.totalPoints} pts
            </span>
          </div>

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Form</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Form Body */}
      {isOpen && (
        <CardContent className="p-4 space-y-3.5">
          {state?.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <p className="font-medium">{state.error}</p>
            </div>
          )}

          {state?.success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="font-medium">Work entry submitted successfully for admin review!</p>
            </div>
          )}

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

            {/* Row 1: Primary Fields (Grid) */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
              } gap-2.5`}
            >
              {/* Staff Member (Admin Only) */}
              {isAdmin ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Staff Member *</label>
                  <select
                    name="staffId"
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                    required
                  >
                    <option value="">Select Staff</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.staff_code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="staffId" value={currentStaffId} />
              )}

              {/* Work Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  Date *
                </label>
                <Input
                  type="date"
                  name="workDate"
                  defaultValue={todayStr}
                  required
                  className="h-8 text-xs bg-slate-50/50 focus:bg-white border-slate-200"
                />
              </div>

              {/* Project / Client */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <FolderKanban className="h-3 w-3 text-slate-400" />
                  Project / Client
                </label>
                <select
                  name="projectId"
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none truncate"
                >
                  <option value="">Studio Direct / Independent</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Work Type *</label>
                <select
                  name="workType"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none truncate"
                >
                  {pointRules.length > 0 ? (
                    pointRules
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <option key={r.work_type} value={r.work_type}>
                          {r.work_type} ({parseFloat(String(r.base_points_per_unit))} pts / {r.rate_unit})
                        </option>
                      ))
                  ) : (
                    <>
                      <option value="Wedding Shoot">Wedding Shoot (20 pts)</option>
                      <option value="Pre-Wedding Shoot">Pre-Wedding Shoot (20 pts)</option>
                      <option value="Engagement Shoot">Engagement Shoot (10 pts)</option>
                      <option value="Birthday / Small Event Shoot">Birthday / Small Event Shoot (10 pts)</option>
                      <option value="Album Photo Edit">Album Photo Edit (1 pt / sheet)</option>
                      <option value="Video Edit">Video Edit (10 pts / hour)</option>
                      <option value="Other">Other Custom Work</option>
                    </>
                  )}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">{unitLabel} *</label>
                <Input
                  type="number"
                  name="quantityOrDuration"
                  step="0.1"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  required
                  className="h-8 text-xs bg-slate-50/50 focus:bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Row 2: Bonus Pills + Remarks in a clean flex layout */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 pt-1">
              {/* Bonus Selector Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Late-Night Toggle Chip */}
                <label
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border cursor-pointer select-none transition-colors ${
                    !isLateNightAllowed
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                      : isLateNight
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={!isLateNightAllowed ? 'Not applicable for this work type' : 'Late night work bonus'}
                >
                  <input
                    type="checkbox"
                    name="isLateNight"
                    checked={isLateNight && isLateNightAllowed}
                    disabled={!isLateNightAllowed}
                    onChange={(e) => setIsLateNight(e.target.checked)}
                    className="sr-only"
                  />
                  <Moon className="h-3 w-3 text-indigo-500" />
                  <span>Late-Night (+{activeRule ? activeRule.late_night_bonus_points : 10} pts)</span>
                </label>

                {/* Out-of-Station Toggle Chip */}
                <label
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border cursor-pointer select-none transition-colors ${
                    !isOutOfStationAllowed
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                      : isOutOfStation
                      ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="isOutOfStation"
                    checked={isOutOfStation && isOutOfStationAllowed}
                    disabled={!isOutOfStationAllowed}
                    onChange={(e) => setIsOutOfStation(e.target.checked)}
                    className="sr-only"
                  />
                  <MapPin className="h-3 w-3 text-amber-600" />
                  <span>Out-Station (+{activeRule ? activeRule.out_of_station_bonus_points : 10} pts)</span>
                </label>

                {/* Rework Toggle Chip */}
                <label
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border cursor-pointer select-none transition-colors ${
                    isRework
                      ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="isRework"
                    checked={isRework}
                    onChange={(e) => setIsRework(e.target.checked)}
                    className="sr-only"
                  />
                  <RefreshCw className="h-3 w-3 text-red-500" />
                  <span>Rework (0 pts)</span>
                </label>
              </div>

              {/* Remarks Field (Flex 1) */}
              <div className="flex-1">
                <Input
                  name="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks (e.g. Edited 40 sheets, Udaipur royal wedding...)"
                  className="h-8 text-xs bg-slate-50/50 focus:bg-white border-slate-200 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Row 3: Calculation & Submit Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Estimated:
                </span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-sm">
                  {isRework ? (
                    <span className="font-bold text-red-600">Rework penalty applied = 0 pts</span>
                  ) : (
                    liveCalculation.calculationSnapshot.formula
                  )}
                </span>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 px-4 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm shrink-0"
              >
                {isPending ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1.5" />
                    Submit Work Entry
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
