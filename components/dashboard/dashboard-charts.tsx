'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ChartDataPoint {
  month: string;
  Shoot: number;
  Album: number;
  Video: number;
  Total: number;
}

interface DashboardChartsProps {
  chartData: ChartDataPoint[];
  title?: string;
  description?: string;
}

export function DashboardCharts({
  chartData,
  title = 'Monthly Productivity Points',
  description = 'Approved points breakdown by work type — last 6 months',
}: DashboardChartsProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100">
        <TrendingUp className="h-4 w-4 text-amber-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-4">
        {!isMounted ? (
          <div className="flex items-center justify-center h-[260px] bg-slate-50/50 rounded-lg animate-pulse text-xs text-slate-400">
            Loading charts...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-xs text-slate-400">
            No approved work entries recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1c1f24',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#f8fafc',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#f59e0b' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="Shoot" name="Shoot Events" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Album" name="Album Editing" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Video" name="Video Editing" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

