import fs from 'fs';
import path from 'path';
import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

// Automatically load .env if running standalone script outside Next.js
if (!process.env.DATABASE_URL) {
  try {
    if (typeof (process as any).loadEnvFile === 'function') {
      (process as any).loadEnvFile();
    }
  } catch (e) {
    // Ignore and fall back to manual parser
  }

  if (!process.env.DATABASE_URL) {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(__dirname, '..', '.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const fileContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of fileContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val.replace(/^["']|["']$/g, '');
            }
          }
        }
        break;
      }
    }
  }
}

// Parse SSL configuration based on environment and connection string
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || '';

function getSslConfig(): boolean | { rejectUnauthorized: boolean } | undefined {
  if (databaseUrl.includes('sslmode=disable') || databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
    return false;
  }
  if (isProduction || databaseUrl.includes('sslmode=require')) {
    // For cloud hosts or remote DBs with custom or self-signed certificates
    return { rejectUnauthorized: false };
  }
  return false;
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
  idleTimeoutMillis: process.env.DB_POOL_IDLE_TIMEOUT_MS ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10) : 30000,
  connectionTimeoutMillis: process.env.DB_POOL_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10) : 5000,
  ssl: getSslConfig(),
};

// Global pool singleton for Next.js hot-reloading preservation in development
declare global {
  // eslint-disable-next-line no-var
  var __studioGfxPool: Pool | undefined;
}

let pool: Pool;

if (!global.__studioGfxPool) {
  pool = new Pool(poolConfig);

  // Monitor idle client errors to prevent unexpected server termination
  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error] Unexpected idle client error:', err.message);
  });

  global.__studioGfxPool = pool;
} else {
  pool = global.__studioGfxPool;
}

// Graceful shutdown handling
const handleGracefulShutdown = async () => {
  if (pool) {
    console.log('[PostgreSQL Pool] Closing connection pool on shutdown signal...');
    try {
      await pool.end();
      console.log('[PostgreSQL Pool] All connections closed successfully.');
    } catch (err) {
      console.error('[PostgreSQL Pool Error] Error during pool termination:', err);
    }
  }
};

if (typeof process !== 'undefined') {
  process.once('SIGTERM', handleGracefulShutdown);
  process.once('SIGINT', handleGracefulShutdown);
}

/**
 * Execute a parameterized SQL query safely
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[Slow Query Alert] (${duration}ms): ${text.substring(0, 100)}...`);
    }
    return res;
  } catch (error: any) {
    console.error('[Database Query Execution Error]:', {
      query: text,
      params,
      errorMessage: error.message,
    });
    throw error;
  }
}

/**
 * Acquire a dedicated client from the pool for transactional operations
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Transaction helper that automatically handles BEGIN, COMMIT, and ROLLBACK
 */
export async function withTransaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

