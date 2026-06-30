/**
 * Database initialization — creates all tables if they don't exist.
 *
 * This runs on every app startup (called from instrumentation.ts) and is the
 * primary mechanism for ensuring the SQLite schema exists. It does NOT depend
 * on `prisma db push` running in the CMD, which makes it robust against:
 *   - HuggingFace Spaces overriding CMD
 *   - prisma CLI not being in PATH
 *   - Users uploading old Dockerfiles
 *   - Database being wiped on container restart (HF free tier)
 *
 * The DDL must match prisma/schema.prisma exactly. If you update the schema,
 * update this file too (or run prisma db push to apply changes).
 */
import { db } from './db'

const DDL_STATEMENTS = [
  // ScheduleConfig (singleton, id="default")
  `CREATE TABLE IF NOT EXISTS "ScheduleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT 1,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "targetUrl" TEXT NOT NULL DEFAULT 'http://www.google.com/generate_204',
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRunAt" DATETIME,
    "lastRunAt" DATETIME,
    "lastRunStatus" TEXT NOT NULL DEFAULT 'pending'
  )`,

  // ScheduledRun (one row per test run)
  `CREATE TABLE IF NOT EXISTS "ScheduledRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL DEFAULT 'schedule',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "total" INTEGER NOT NULL DEFAULT 0,
    "working" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "error" TEXT
  )`,

  // WorkingProxy (one row per working proxy per run)
  `CREATE TABLE IF NOT EXISTS "WorkingProxy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "responseTime" INTEGER,
    "sourceUrl" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  // Indexes (must match schema.prisma @@index directives)
  `CREATE INDEX IF NOT EXISTS "WorkingProxy_runId_idx" ON "WorkingProxy"("runId")`,
  `CREATE INDEX IF NOT EXISTS "WorkingProxy_type_idx" ON "WorkingProxy"("type")`,
  `CREATE INDEX IF NOT EXISTS "WorkingProxy_address_idx" ON "WorkingProxy"("address")`,
]

let initPromise: Promise<void> | null = null
let initDone = false

/**
 * Initialize the database schema. Safe to call multiple times — uses
 * CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 *
 * The first call runs all DDL; subsequent calls are no-ops (memoized).
 */
export async function initDatabase(): Promise<void> {
  if (initDone) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const startedAt = Date.now()
    console.log('[db-init] Creating tables if not exist...')

    for (const sql of DDL_STATEMENTS) {
      try {
        await db.$executeRawUnsafe(sql)
      } catch (err: any) {
        // Log but don't crash — the app can still run with degraded functionality
        console.error('[db-init] DDL failed:', sql.slice(0, 80), '→', err?.message || err)
      }
    }

    // Verify by querying one of the tables
    try {
      await db.$queryRaw`SELECT COUNT(*) as n FROM ScheduleConfig`
      initDone = true
      console.log(`[db-init] ✅ Database ready (took ${Date.now() - startedAt}ms)`)
    } catch (err: any) {
      console.error('[db-init] ❌ Verification failed:', err?.message || err)
      throw err
    }
  })()

  return initPromise
}
