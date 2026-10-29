import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';

export default async function HomePage() {
  let totalUsers = -1;
  try {
    // Check if initial setup is needed (no users created yet)
    const userCountResult = await query('SELECT COUNT(*) as count FROM users;');
    totalUsers = parseInt(userCountResult.rows[0]?.count || '0', 10);
  } catch (err) {
    // If database is not yet migrated or unreachable
    console.error('Error querying users count:', err);
  }

  if (totalUsers === 0) {
    redirect('/setup');
  }

  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}

