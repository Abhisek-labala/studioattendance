'use client';

import React from 'react';
import { Target, Award, Sparkles, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPoints } from '@/lib/utils';

interface StaffPersonalTargetCardProps {
  staffName: string;
  targetPoints: number;
  approvedPoints: number;
  pendingPoints: number;
  monthName: string;
}

export function StaffPersonalTargetCard({
  staffName,
  targetPoints,
  approvedPoints,
  pendingPoints,
  monthName,
}: StaffPersonalTargetCardProps) {
  const percent = targetPoints > 0 ? (approvedPoints / targetPoints) * 100 : 0;
  const isAchieved = percent >= 100;
  const remainingPoints = targetPoints - approvedPoints > 0 ? targetPoints - approvedPoints : 0;
  const visualProgress = Math.min(Math.max(percent, 0), 100);

  return (
    <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Target Title & Stats */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {monthName} Productivity Goal & Performance
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned by Studio Management &mdash; Keep up the great work, {staffName}!
                </p>
              </div>
            </div>
          </div>

          {/* Performance Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium block">Performance</span>
              <span
                className={`text-2xl font-black ${
                  isAchieved ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {percent.toFixed(1)}%
              </span>
            </div>
            <Badge
              variant={isAchieved ? 'default' : 'warning'}
              className="text-xs px-2.5 py-1 flex items-center gap-1 font-semibold"
            >
              {isAchieved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Target Achieved!
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  In Progress
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Progress Bar & Details */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Achieved: <span className="text-amber-700 font-bold">{formatPoints(approvedPoints)} pts</span> of{' '}
              <span className="font-bold text-slate-900">{formatPoints(targetPoints)} pts</span> target
            </span>
            <span className="text-slate-500 font-medium">
              {isAchieved ? (
                <span className="text-emerald-700 font-bold">
                  +{(approvedPoints - targetPoints).toFixed(1)} pts above target!
                </span>
              ) : (
                <span>{remainingPoints.toFixed(1)} pts remaining to reach target</span>
              )}
            </span>
          </div>

          {/* Animated Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                isAchieved
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-sm'
              }`}
              style={{ width: `${visualProgress}%` }}
            />
          </div>

          {pendingPoints > 0 && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>
                You also have <strong className="text-amber-700">{formatPoints(pendingPoints)} pts</strong> pending administrator approval.
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

