'use client';

import React, { useState } from 'react';
import { Menu, Bell, Clock, LogOut } from 'lucide-react';
import { AuthenticatedUser } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { formatKolkataDate, formatKolkataTime } from '@/lib/utils';
import { logoutAction } from '@/app/actions/auth';

interface TopHeaderProps {
  user: AuthenticatedUser;
  onOpenMobileSidebar: () => void;
  unreadCount?: number;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    createdAt: string;
    isRead: boolean;
  }>;
}

export function TopHeader({
  user,
  onOpenMobileSidebar,
  unreadCount = 0,
  notifications = [],
}: TopHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const today = new Date();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 2xl:px-10 backdrop-blur">
      {/* Mobile Menu & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block font-semibold text-sm text-slate-800">
            Studio GFX
          </span>
          <span className="hidden sm:inline-block text-slate-400">/</span>
          <span className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span suppressHydrationWarning>
              {formatKolkataDate(today, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </span>
        </div>
      </div>

      {/* Right Controls: Notifications, User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-800">Notifications</span>
                <span className="text-[11px] text-slate-400">
                  {unreadCount} unread
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No new notifications
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatKolkataTime(n.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200" />

        {/* User Identity & Role */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-amber-400 ring-2 ring-amber-500/20 shadow-sm shrink-0">
            {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
              {user.fullName || user.email.split('@')[0]}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <form action={logoutAction} className="inline-flex">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
            title="Log out of Studio GFX"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </form>
      </div>
    </header>
  );
}

