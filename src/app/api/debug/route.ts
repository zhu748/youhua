/**
 * Debug endpoint — outputs environment info and DB status.
 * Useful for diagnosing HuggingFace / Render deployment issues.
 *
 * URL: /api/debug
 *
 * WARNING: This endpoint exposes some internal info. Disable in production if needed.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const info: any = {
    timestamp: new Date().toISOString(),
    runtime: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime_s: Math.floor(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    env: {
      DATABASE_URL: process.env.DATABASE_URL || '(not set)',
      PORT: process.env.PORT || '(not set)',
      HOSTNAME: process.env.HOSTNAME || '(not set)',
      NODE_ENV: process.env.NODE_ENV || '(not set)',
    },
    db: {
      status: 'checking',
    },
  }

  // Check DB connection
  try {
    await db.$queryRaw`SELECT 1`
    info.db.status = 'ok'
    info.db.error = null

    // Count rows in each table
    try {
      info.db.tables = {
        scheduleConfig: await db.scheduleConfig.count(),
        scheduledRun: await db.scheduledRun.count(),
        workingProxy: await db.workingProxy.count(),
      }
    } catch (e: any) {
      info.db.tables_error = e.message
    }
  } catch (err: any) {
    info.db.status = 'error'
    info.db.error = err?.message || String(err)
    info.db.hint =
      'DB query failed. The schema may not be initialized. ' +
      'Check that "prisma db push" ran successfully during container startup.'
  }

  // Check if DATABASE_URL points to a writable location
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('file:')) {
    const dbPath = dbUrl.slice(5)
    info.db.path = dbPath
    info.db.dir_exists = fs.existsSync(path.dirname(dbPath))
    try {
      // Try to write a test file in the same dir
      const testFile = path.join(path.dirname(dbPath), '.proxylab-write-test')
      fs.writeFileSync(testFile, 'ok', { flag: 'w' })
      fs.unlinkSync(testFile)
      info.db.dir_writable = true
    } catch (e: any) {
      info.db.dir_writable = false
      info.db.write_error = e.message
      info.db.hint =
        'The database directory is not writable. ' +
        'On HuggingFace, set DATABASE_URL=file:/tmp/proxies.db if you do not have persistent storage. ' +
        'With persistent storage, use file:/data/proxies.db.'
    }
    info.db.file_exists = fs.existsSync(dbPath)
    if (info.db.file_exists) {
      info.db.file_size_bytes = fs.statSync(dbPath).size
    }
  }

  return NextResponse.json(info, { status: info.db.status === 'ok' ? 200 : 500 })
}
