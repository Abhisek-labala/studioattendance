'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { UserPlus, Edit2, X, AlertCircle } from 'lucide-react';
import { createStaffAction, updateStaffAction, StaffActionResponse } from '@/app/actions/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: {
    id: string;
    staff_code: string;
    full_name: string;
    phone: string;
    email: string;
    designation: string;
    joining_date: string;
    monthly_target_points?: number | string;
    is_active: boolean;
    notes?: string;
  } | null;
}

export function StaffFormModal({ isOpen, onClose, staffToEdit }: StaffFormModalProps) {
  const isEditing = !!staffToEdit;
  const actionToUse = isEditing ? updateStaffAction : createStaffAction;
  const [state, formAction, isPending] = useActionState<StaffActionResponse | null, FormData>(
    actionToUse,
    null
  );

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 p-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              {isEditing ? <Edit2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? `Update details for ${staffToEdit.full_name}` : 'Register a new studio employee'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state?.error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="font-medium">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="mt-4 space-y-4">
          {isEditing && <input type="hidden" name="staffId" value={staffToEdit.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Staff Code *</label>
              <Input
                name="staffCode"
                defaultValue={staffToEdit?.staff_code || 'GFX-'}
                required
                placeholder="e.g. GFX-006"
              />
              {state?.fieldErrors?.staffCode && (
                <p className="text-xs text-red-600">{state.fieldErrors.staffCode[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name *</label>
              <Input
                name="fullName"
                defaultValue={staffToEdit?.full_name || ''}
                required
                placeholder="e.g. Rahul Sharma"
              />
              {state?.fieldErrors?.fullName && (
                <p className="text-xs text-red-600">{state.fieldErrors.fullName[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
              <Input
                name="phone"
                defaultValue={staffToEdit?.phone || '+91 '}
                required
                placeholder="+91 98765 43210"
              />
              {state?.fieldErrors?.phone && (
                <p className="text-xs text-red-600">{state.fieldErrors.phone[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address *</label>
              <Input
                type="email"
                name="email"
                defaultValue={staffToEdit?.email || ''}
                required
                placeholder="staff@studiogfx.com"
              />
              {state?.fieldErrors?.email && (
                <p className="text-xs text-red-600">{state.fieldErrors.email[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Designation *</label>
              <select
                name="designation"
                defaultValue={staffToEdit?.designation || 'Photographer'}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              >
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="Photo Editor">Photo Editor</option>
                <option value="Video Editor">Video Editor</option>
                <option value="Photographer / Editor">Photographer / Editor</option>
                <option value="Team Leader">Team Leader</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Joining Date *</label>
              <Input
                type="date"
                name="joiningDate"
                defaultValue={
                  staffToEdit?.joining_date
                    ? new Date(staffToEdit.joining_date).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Monthly Target (Pts) *</label>
              <Input
                type="number"
                name="monthlyTargetPoints"
                step="5"
                min="0"
                defaultValue={staffToEdit?.monthly_target_points ? parseFloat(String(staffToEdit.monthly_target_points)) : 150}
                required
                placeholder="150"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Notes / Skills</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={staffToEdit?.notes || ''}
              placeholder="e.g. Drone cinematography, Album design specialist"
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked={staffToEdit ? staffToEdit.is_active : true}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-slate-700">
              Active Employee Status
            </label>
          </div>

          {!isEditing && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createLoginAccount"
                  name="createLoginAccount"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="createLoginAccount" className="text-xs font-semibold text-slate-800">
                  Create Web Portal Login Account
                </label>
              </div>
              <div className="pt-1">
                <Input
                  type="password"
                  name="loginPassword"
                  defaultValue="Staff@StudioGFX2026"
                  placeholder="Set initial password (min 8 chars)"
                  className="bg-white text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Default: <span className="font-mono font-semibold">Staff@StudioGFX2026</span>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-slate-900 hover:bg-slate-800">
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

