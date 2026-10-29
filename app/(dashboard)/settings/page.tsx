import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Studio Settings — Studio GFX Photography',
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const settingsRes = await query('SELECT * FROM studio_settings WHERE id = $1;', ['default']);
  const settings = settingsRes.rows[0] || null;

  return <SettingsView settings={settings} />;
}

