'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  Edit2,
  Camera,
  Film,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StaffFormModal } from './staff-form-modal';
import { TargetModal } from './target-modal';
import { toggleStaffStatusAction } from '@/app/actions/staff';
import { formatKolkataDate } from '@/lib/utils';

interface StaffMember {
  id: string;
  staff_code: string;
  full_name: string;
  phone: string;
  email: string;
  designation: string;
  joining_date: string;
  is_active: boolean;
  notes?: string;
  has_user_account: boolean;
  total_approved_points?: string | number;
  current_target_points?: string | number;
  month_approved_points?: string | number;
}

interface StaffDirectoryViewProps {
  staffList: StaffMember[];
  isAdmin: boolean;
}

export function StaffDirectoryView({ staffList, isAdmin }: StaffDirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaffForTarget, setSelectedStaffForTarget] = useState<{
    id: string;
    full_name: string;
    staff_code: string;
    current_target?: number;
  } | null>(null);

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staff_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);

    const matchesDesignation =
      selectedDesignation === 'ALL' || s.designation === selectedDesignation;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && s.is_active) ||
      (statusFilter === 'INACTIVE' && !s.is_active);

    return matchesSearch && matchesDesignation && matchesStatus;
  });

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (staffId: string, currentState: boolean) => {
    if (confirm(`Are you sure you want to ${currentState ? 'deactivate' : 'activate'} this staff member?`)) {
      await toggleStaffStatusAction(staffId, !currentState);
    }
  };

  // Helper badge for designation
  const getDesignationBadge = (desig: string) => {
    switch (desig) {
      case 'Photographer':
        return <Badge variant="info" className="gap-1"><Camera className="h-3 w-3" /> Photographer</Badge>;
      case 'Videographer':
        return <Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-800 border-purple-200"><Film className="h-3 w-3" /> Videographer</Badge>;
      case 'Photo Editor':
        return <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-800 border-indigo-200">Photo Editor</Badge>;
      case 'Video Editor':
        return <Badge variant="secondary" className="gap-1 bg-pink-100 text-pink-800 border-pink-200">Video Editor</Badge>;
      case 'Photographer / Editor':
        return <Badge variant="warning" className="gap-1"><Sparkles className="h-3 w-3" /> Photo / Editor</Badge>;
      case 'Team Leader':
        return <Badge variant="default" className="gap-1 bg-slate-900 text-amber-400">Team Leader</Badge>;
      default:
        return <Badge variant="outline">{desig}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage photography crew, cinematographers, photo/video editors, and team leaders.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setEditingStaff(null);
              setIsModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Designation Filter */}
        <select
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700"
        >
          <option value="ALL">All Designations</option>
          <option value="Photographer">Photographers</option>
          <option value="Videographer">Videographers</option>
          <option value="Photo Editor">Photo Editors</option>
          <option value="Video Editor">Video Editors</option>
          <option value="Photographer / Editor">Photographer / Editor</option>
          <option value="Team Leader">Team Leaders</option>
        </select>

        {/* Status Filter */}
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({staffList.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Active ({staffList.filter((s) => s.is_active).length})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
              statusFilter === 'INACTIVE' ? 'bg-white text-red-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Inactive ({staffList.filter((s) => !s.is_active).length})
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Staff Member</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="min-w-[160px]">Monthly Goal & Progress</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Users className="h-6 w-6 text-slate-300" />
                    <p className="text-xs font-medium">No staff members found matching criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const target = parseFloat(String(staff.current_target_points || '150'));
                const approved = parseFloat(String(staff.month_approved_points || '0'));
                const percent = target > 0 ? (approved / target) * 100 : 0;
                const isAchieved = percent >= 100;
                const visualProgress = Math.min(Math.max(percent, 0), 100);

                return (
                  <TableRow key={staff.id} className="hover:bg-slate-50/70">
                    <TableCell className="font-mono text-xs font-bold text-slate-800">
                      {staff.staff_code}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/staff/${staff.id}`}
                        className="font-semibold text-slate-900 hover:text-amber-600 hover:underline flex items-center gap-1.5"
                      >
                        {staff.full_name}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                      {staff.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{staff.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>{getDesignationBadge(staff.designation)}</TableCell>

                    {/* Monthly Goal & Progress */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {approved.toFixed(0)} <span className="text-slate-400 font-normal">/ {target.toFixed(0)} pts</span>
                          </span>
                          <span
                            className={`font-bold text-[11px] ${
                              isAchieved ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${visualProgress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{staff.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatKolkataDate(staff.joining_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {staff.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/staff/${staff.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600">
                            Profile
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedStaffForTarget({
                                  id: staff.id,
                                  full_name: staff.full_name,
                                  staff_code: staff.staff_code,
                                  current_target: target,
                                })
                              }
                              className="h-8 text-xs text-slate-600 hover:text-amber-700"
                              title="Set Target Points"
                            >
                              <Target className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(staff)}
                              className="h-8 text-xs text-slate-600 hover:text-slate-900"
                              title="Edit details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(staff.id, staff.is_active)}
                            className={`h-8 text-xs ${
                              staff.is_active
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {staff.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Staff Target Modal */}
      <TargetModal
        isOpen={!!selectedStaffForTarget}
        onClose={() => setSelectedStaffForTarget(null)}
        staff={selectedStaffForTarget}
      />

      {/* Staff Form Modal */}
      <StaffFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        staffToEdit={editingStaff}
      />
    </div>
  );
}

