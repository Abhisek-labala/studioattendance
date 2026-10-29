'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  FolderKanban,
  CheckSquare,
  Award,
  CalendarDays,
  BarChart3,
  Settings,
  Camera,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthenticatedUser } from '@/lib/auth/session';

interface SidebarProps {
  user: AuthenticatedUser;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ user, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';

  // Navigation Items
  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      title: 'Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      adminOnly: false,
    },
    {
      title: 'Work Register',
      href: '/work-register',
      icon: FileSpreadsheet,
      adminOnly: false,
    },
    {
      title: 'Staff Management',
      href: '/staff',
      icon: Users,
      adminOnly: true,
    },
    {
      title: 'Projects',
      href: '/projects',
      icon: FolderKanban,
      adminOnly: false,
    },
    {
      title: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      adminOnly: false,
    },
    {
      title: 'Point Rules',
      href: '/point-rules',
      icon: Award,
      adminOnly: true,
    },
    {
      title: 'Leave Management',
      href: '/leave',
      icon: CalendarDays,
      adminOnly: false,
    },
    {
      title: 'Reports & Exports',
      href: '/reports',
      icon: BarChart3,
      adminOnly: false, // Staff can view their own monthly report; Admin views studio-wide
    },
    {
      title: 'Studio Settings',
      href: '/settings',
      icon: Settings,
      adminOnly: true,
    },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container — Static sticky on desktop, zero internal scrolling */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#121417] text-slate-300 border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0',
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header with Studio GFX Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-slate-900 border border-amber-500/30 shadow-md shadow-amber-500/10 group-hover:border-amber-400 transition-all shrink-0">
              <img
                src="/logo.svg"
                alt="Studio GFX Logo"
                className="h-full w-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                onError={(e) => {
                  // Fallback if custom SVG not found
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.fallback-icon');
                  if (fallback) (fallback as HTMLElement).style.display = 'block';
                }}
              />
              <Camera className="fallback-icon hidden h-5 w-5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wider text-white block group-hover:text-amber-400 transition-colors">
                STUDIO GFX
              </span>
              <span className="text-[10px] text-amber-500/90 uppercase tracking-[0.2em] block font-semibold">
                Photography
              </span>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links — Non-scrollable static menu */}
        <div className="flex-1 overflow-hidden px-3 py-4 space-y-1 select-none">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-amber-400' : 'text-slate-400')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

