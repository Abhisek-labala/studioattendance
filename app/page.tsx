import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';

export default async function HomePage() {
  try {
    // Check if initial setup is needed (no users created yet)
    const userCountResult = await query('SELECT COUNT(*) as count FROM users;');
    const totalUsers = parseInt(userCountResult.rows[0]?.count || '0', 10);

    if (totalUsers === 0) {
      redirect('/setup');
    }
  } catch (err) {
    // If database is not yet migrated or unreachable, redirect to login
  }

  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}

