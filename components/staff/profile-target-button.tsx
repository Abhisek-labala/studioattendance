'use client';

import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TargetModal } from './target-modal';

interface ProfileTargetButtonProps {
  staffId: string;
  fullName: string;
  staffCode: string;
  currentTarget: number;
  year?: number;
  month?: number;
  label?: string;
}

export function ProfileTargetButton({
  staffId,
  fullName,
  staffCode,
  currentTarget,
  year,
  month,
  label = 'Adjust Target',
}: ProfileTargetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-7 gap-1 text-[11px] text-slate-700 hover:text-amber-800 hover:border-amber-300 hover:bg-amber-50"
      >
        <Target className="h-3 w-3 text-amber-600" />
        <span>{label}</span>
      </Button>

      <TargetModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        staff={{
          id: staffId,
          full_name: fullName,
          staff_code: staffCode,
          current_target: currentTarget,
        }}
        currentYear={year}
        currentMonth={month}
      />
    </>
  );
}

