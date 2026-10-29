import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/db/pool';

export async function GET(_req: NextRequest) {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  try {
    // Simple database health check
    const res = await query('SELECT 1 AS alive;');
    if (res.rows[0]?.alive === 1) {
      return NextResponse.json(
        {
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers }
      );
    }

    return NextResponse.json(
      { status: 'degraded', database: 'unexpected response' },
      { status: 503, headers }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers }
    );
  }
}

