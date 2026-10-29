'use client';

import React, { useState, useActionState, useEffect } from 'react';
import {
  Award,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Info,
  X,
  Moon,
  MapPin,
} from 'lucide-react';
import {
  savePointRuleAction,
  togglePointRuleStatusAction,
  deletePointRuleAction,
  PointRuleActionResponse,
} from '@/app/actions/point-rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PointRuleConfig } from '@/lib/points/engine';

interface PointRulesManagerProps {
  initialRules: PointRuleConfig[];
  isAdmin: boolean;
}

export function PointRulesManager({ initialRules, isAdmin }: PointRulesManagerProps) {
  const [rules, setRules] = useState<PointRuleConfig[]>(initialRules);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PointRuleConfig | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Sync state if initialRules changes
  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  const [state, formAction, isPending] = useActionState<PointRuleActionResponse | null, FormData>(
    savePointRuleAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setModalOpen(false);
      setEditingRule(null);
    }
  }, [state?.success]);

  const handleEdit = (rule: PointRuleConfig) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleToggleActive = async (rule: PointRuleConfig) => {
    if (!rule.id) return;
    setLoadingId(rule.id);
    try {
      const res = await togglePointRuleStatusAction(rule.id, !rule.is_active);
      if (!res.success) {
        alert('Action failed: ' + res.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (rule: PointRuleConfig) => {
    if (!rule.id) return;
    if (confirm(`Are you sure you want to delete the point rule for "${rule.work_type}"?`)) {
      setLoadingId(rule.id);
      try {
        const res = await deletePointRuleAction(rule.id);
        if (!res.success) {
          alert('Delete failed: ' + res.error);
        }
      } finally {
        setLoadingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Point Rules Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure rates, units, and bonus criteria for photography shoots and editing. All values are editable in real time.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={handleAddNew}
            className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Add Point Rule
          </Button>
        )}
      </div>

      {/* Configurable Point Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Configured Studio Point Rules</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {rules.length} configured rules
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work Type</TableHead>
              <TableHead className="text-right">Base Rate</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-center">Late-Night Bonus</TableHead>
              <TableHead className="text-center">Out-of-Station Bonus</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-xs text-slate-400">
                  No point rules configured. Click &ldquo;Add Point Rule&rdquo; to create one.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule, idx) => (
                <TableRow key={rule.id || idx} className="hover:bg-slate-50/70">
                  <TableCell className="font-semibold text-sm text-slate-900">
                    {rule.work_type}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-700 text-sm">
                    {parseFloat(String(rule.base_points_per_unit)).toFixed(0)} pts
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    per {rule.rate_unit}
                  </TableCell>
                  <TableCell className="text-center">
                    {rule.late_night_eligible ? (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                        <Moon className="h-3 w-3" />
                        +{parseFloat(String(rule.late_night_bonus_points)).toFixed(0)} pts
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {rule.out_of_station_eligible ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <MapPin className="h-3 w-3" />
                        +{parseFloat(String(rule.out_of_station_bonus_points)).toFixed(0)} pts
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      disabled={loadingId === rule.id || !isAdmin}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${rule.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      title={isAdmin ? 'Click to toggle status' : undefined}
                    >
                      {rule.is_active ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> Inactive
                        </>
                      )}
                    </button>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                          className="h-8 text-xs text-slate-600 hover:text-slate-900"
                          title="Edit this rule"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === rule.id}
                          onClick={() => handleDelete(rule)}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete this rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Examples Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            Configured Rate Summary
          </CardTitle>
          <CardDescription className="text-xs">
            Live overview of point distribution according to active configured rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 text-xs text-slate-700">
            {rules
              .filter((r) => r.is_active)
              .map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{r.work_type}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Rate: {parseFloat(String(r.base_points_per_unit))} pts / {r.rate_unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-amber-700 text-sm">
                      {parseFloat(String(r.base_points_per_unit))} pts
                    </span>
                    {(r.late_night_eligible || r.out_of_station_eligible) && (
                      <span className="block text-[10px] text-slate-400 font-medium">
                        {r.late_night_eligible && r.out_of_station_eligible
                          ? '+Bonuses (OOS, LN)'
                          : r.late_night_eligible
                            ? '+Late Night'
                            : '+Out-Station'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                {editingRule ? `Edit Rule: ${editingRule.work_type}` : 'Create New Point Rule'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {state?.error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="font-medium">{state.error}</p>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {editingRule?.id && <input type="hidden" name="id" value={editingRule.id} />}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Work Type Name *</label>
                <Input
                  name="workType"
                  defaultValue={editingRule?.work_type || ''}
                  required
                  placeholder="e.g. Drone Cinematography, Reels Editing, Maternity Shoot"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Base Points *</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    name="basePointsPerUnit"
                    defaultValue={editingRule ? String(editingRule.base_points_per_unit) : '10'}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Per Unit *</label>
                  <select
                    name="rateUnit"
                    defaultValue={editingRule?.rate_unit || 'event'}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900"
                  >
                    <option value="event">per event</option>
                    <option value="sheet">per sheet</option>
                    <option value="hour">per hour</option>
                    <option value="day">per day</option>
                    <option value="item">per item</option>
                  </select>
                </div>
              </div>

              {/* Late-Night Bonus Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="lateNightEligible"
                    name="lateNightEligible"
                    defaultChecked={editingRule?.late_night_eligible ?? false}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <label
                    htmlFor="lateNightEligible"
                    className="text-xs font-semibold text-slate-800 flex items-center gap-1"
                  >
                    <Moon className="h-3.5 w-3.5 text-indigo-600" />
                    Eligible for Late-Night Bonus
                  </label>
                </div>
                <div className="pl-6">
                  <label className="text-[11px] text-slate-600 block mb-1">
                    Late-Night Bonus Points Amount
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    name="lateNightBonusPoints"
                    defaultValue={
                      editingRule ? String(editingRule.late_night_bonus_points) : '10'
                    }
                    className="h-8 text-xs bg-white w-32"
                  />
                </div>
              </div>

              {/* Out-of-Station Bonus Section */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="outOfStationEligible"
                    name="outOfStationEligible"
                    defaultChecked={editingRule?.out_of_station_eligible ?? true}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600"
                  />
                  <label
                    htmlFor="outOfStationEligible"
                    className="text-xs font-semibold text-slate-800 flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                    Eligible for Out-of-Station Bonus
                  </label>
                </div>
                <div className="pl-6">
                  <label className="text-[11px] text-slate-600 block mb-1">
                    Out-of-Station Bonus Points Amount
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    name="outOfStationBonusPoints"
                    defaultValue={
                      editingRule ? String(editingRule.out_of_station_bonus_points) : '10'
                    }
                    className="h-8 text-xs bg-white w-32"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rule Version</label>
                  <Input
                    name="ruleVersion"
                    defaultValue={editingRule?.rule_version || '1.0'}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isActiveRule"
                    name="isActive"
                    defaultChecked={editingRule ? editingRule.is_active : true}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="isActiveRule" className="text-xs font-semibold text-slate-800">
                    Active Rule Status
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  {isPending ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
