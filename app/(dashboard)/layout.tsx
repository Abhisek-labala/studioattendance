import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getUnreadNotificationCount, getUserNotifications } from '@/lib/notifications/notify';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Fetch notifications
  let unreadCount = 0;
  let notifications: any[] = [];
  try {
    unreadCount = await getUnreadNotificationCount(user.userId);
    notifications = await getUserNotifications(user.userId, 10);
  } catch (err) {
    // Graceful fallback if database notification query fails
  }

  return (
    <DashboardShell
      user={user}
      unreadCount={unreadCount}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}

