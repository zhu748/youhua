/**
 * Lightweight health check endpoint.
 *
 * Returns 200 OK if the process is alive and the database connection works.
 * Suitable for Docker HEALTHCHECK, Render health checks, Kubernetes liveness probes,
 * HuggingFace Spaces, UptimeRobot, etc.
 *
 * URL: /api/healthz
 * Response: { "status": "ok", "uptime_s": 123, "db": "ok"|"error", "ts": 1700000000000 }
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Track process start time (module-level, survives across requests)
const START_TIME = Date.now()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  let dbStatus: 'ok' | 'error' = 'ok'
  try {
    // Run a trivial query to verify DB connectivity
    await db.$queryRaw`SELECT 1`
  } catch (err) {
    dbStatus = 'error'
    // Still return 200 so the container isn't killed — DB might be initializing
    // on first boot (prisma db push running). Return 503 only if DB has been
    // unreachable for a while (handled by caller via retries).
  }

  const uptime_s = Math.floor((Date.now() - START_TIME) / 1000)

  // Return 503 only if DB is broken — most platforms treat 503 as "unhealthy"
  const httpStatus = dbStatus === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      uptime_s,
      db: dbStatus,
      ts: Date.now(),
    },
    { status: httpStatus },
  )
}
