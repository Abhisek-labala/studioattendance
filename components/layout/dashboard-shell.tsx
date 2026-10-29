'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { AuthenticatedUser } from '@/lib/auth/session';

interface DashboardShellProps {
  user: AuthenticatedUser;
  unreadCount?: number;
  notifications?: any[];
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  unreadCount = 0,
  notifications = [],
  children,
}: DashboardShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopHeader
          user={user}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          unreadCount={unreadCount}
          notifications={notifications}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10 w-full max-w-[2000px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

