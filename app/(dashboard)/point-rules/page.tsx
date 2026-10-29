import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { query } from '@/db/pool';
import { PointRulesManager } from '@/components/point-rules/point-rules-manager';
import { PointRuleConfig } from '@/lib/points/engine';

export const metadata = {
  title: 'Point Rules Configuration — Studio GFX Photography',
};

export default async function PointRulesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard');

  const rulesRes = await query(`
    SELECT 
      id,
      rule_version,
      work_type,
      rate_unit,
      base_points_per_unit,
      late_night_eligible,
      late_night_bonus_points,
      out_of_station_eligible,
      out_of_station_bonus_points,
      effective_from::text,
      is_active,
      created_at::text
    FROM point_rules
    ORDER BY created_at ASC;
  `);

  const rules: PointRuleConfig[] = rulesRes.rows.map((r) => ({
    id: r.id,
    rule_version: r.rule_version,
    work_type: r.work_type,
    rate_unit: r.rate_unit,
    base_points_per_unit: parseFloat(r.base_points_per_unit),
    late_night_eligible: r.late_night_eligible,
    late_night_bonus_points: parseFloat(r.late_night_bonus_points),
    out_of_station_eligible: r.out_of_station_eligible,
    out_of_station_bonus_points: parseFloat(r.out_of_station_bonus_points),
    is_active: r.is_active,
  }));

  return <PointRulesManager initialRules={rules} isAdmin={session.role === 'admin'} />;
}
