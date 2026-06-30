/**
 * Persistent scheduler for automatic proxy testing.
 * Uses Prisma (SQLite) for state persistence — survives server restarts.
 *
 * Default behavior: runs every 60 minutes (configurable).
 * On startup: if a scheduled run is overdue, kicks it off immediately.
 */
import { db } from '@/lib/db'
import {
  createBatch,
  getBatch,
  runBatch,
  onBatchComplete,
  type Batch,
} from '@/lib/batch-manager'
import {
  fetchProxiesFromUrl,
  type ProxyInfo,
  type ProxyType,
} from '@/lib/proxy-tester'

export interface ScheduleSourcesEntry {
  url: string
  label: string
  type: ProxyType | 'unknown'
}

// Defaults applied on first creation (no row in DB yet)
export const DEFAULT_CONFIG = {
  enabled: true,
  intervalMinutes: 60,
  targetUrl: 'http://www.google.com/generate_204',
  timeoutMs: 5000,
  sources: [
    {
      url: 'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt',
      label: 'ProxyScrape — All',
      type: 'unknown' as const,
    },
  ] as ScheduleSourcesEntry[],
}

const KEEPLAST_RUNS = 10 // Keep last 10 runs' working proxies in DB

// Use globalThis to persist the timer across HMR
declare global {
  var __proxyScheduler: { timer: NodeJS.Timeout | null; isRunning: boolean } | undefined
}

const schedulerState =
  globalThis.__proxyScheduler ?? { timer: null, isRunning: false }
if (!globalThis.__proxyScheduler) {
  globalThis.__proxyScheduler = schedulerState
}

/** Ensure the ScheduleConfig row exists. Returns the current config. */
async function ensureConfig() {
  try {
    let cfg = await db.scheduleConfig.findUnique({ where: { id: 'default' } })
    if (!cfg) {
      cfg = await db.scheduleConfig.create({
        data: {
          id: 'default',
          enabled: DEFAULT_CONFIG.enabled,
          intervalMinutes: DEFAULT_CONFIG.intervalMinutes,
          targetUrl: DEFAULT_CONFIG.targetUrl,
          timeoutMs: DEFAULT_CONFIG.timeoutMs,
          sourcesJson: JSON.stringify(DEFAULT_CONFIG.sources),
          nextRunAt: new Date(Date.now() + DEFAULT_CONFIG.intervalMinutes * 60 * 1000),
        },
      })
    }
    return cfg
  } catch (err: any) {
    // Table might not exist yet — try initializing schema then retry once
    const msg = String(err?.message || err)
    if (msg.includes('does not exist') || msg.includes('no such table')) {
      console.warn('[scheduler] Table missing, attempting DB init...')
      const { initDatabase } = await import('./db-init')
      await initDatabase()
      // Retry the query
      let cfg = await db.scheduleConfig.findUnique({ where: { id: 'default' } })
      if (!cfg) {
        cfg = await db.scheduleConfig.create({
          data: {
            id: 'default',
            enabled: DEFAULT_CONFIG.enabled,
            intervalMinutes: DEFAULT_CONFIG.intervalMinutes,
            targetUrl: DEFAULT_CONFIG.targetUrl,
            timeoutMs: DEFAULT_CONFIG.timeoutMs,
            sourcesJson: JSON.stringify(DEFAULT_CONFIG.sources),
            nextRunAt: new Date(Date.now() + DEFAULT_CONFIG.intervalMinutes * 60 * 1000),
          },
        })
      }
      return cfg
    }
    throw err
  }
}

export interface ScheduleConfigView {
  enabled: boolean
  intervalMinutes: number
  targetUrl: string
  timeoutMs: number
  sources: ScheduleSourcesEntry[]
  nextRunAt: number | null
  lastRunAt: number | null
  lastRunStatus: string
  updatedAt: number
}

export async function getScheduleConfig(): Promise<ScheduleConfigView> {
  const cfg = await ensureConfig()
  return {
    enabled: cfg.enabled,
    intervalMinutes: cfg.intervalMinutes,
    targetUrl: cfg.targetUrl,
    timeoutMs: cfg.timeoutMs,
    sources: JSON.parse(cfg.sourcesJson || '[]'),
    nextRunAt: cfg.nextRunAt?.getTime() ?? null,
    lastRunAt: cfg.lastRunAt?.getTime() ?? null,
    lastRunStatus: cfg.lastRunStatus,
    updatedAt: cfg.updatedAt.getTime(),
  }
}

export async function updateScheduleConfig(patch: {
  enabled?: boolean
  intervalMinutes?: number
  targetUrl?: string
  timeoutMs?: number
  sources?: ScheduleSourcesEntry[]
}): Promise<ScheduleConfigView> {
  const cfg = await ensureConfig()
  const data: any = {}
  if (patch.enabled !== undefined) data.enabled = patch.enabled
  if (patch.intervalMinutes !== undefined) {
    data.intervalMinutes = Math.min(Math.max(patch.intervalMinutes, 5), 24 * 60)
  }
  if (patch.targetUrl !== undefined) data.targetUrl = patch.targetUrl
  if (patch.timeoutMs !== undefined) {
    data.timeoutMs = Math.min(Math.max(patch.timeoutMs, 1000), 30000)
  }
  if (patch.sources !== undefined) data.sourcesJson = JSON.stringify(patch.sources)

  // If interval changed or was re-enabled, recompute nextRunAt
  if (
    patch.intervalMinutes !== undefined ||
    patch.enabled !== undefined ||
    patch.targetUrl !== undefined ||
    patch.timeoutMs !== undefined ||
    patch.sources !== undefined
  ) {
    if (data.enabled === false || cfg.enabled === false) {
      // Don't reschedule if disabled; clear nextRunAt
      if (data.enabled === false) data.nextRunAt = null
    } else {
      const interval = (data.intervalMinutes ?? cfg.intervalMinutes) * 60 * 1000
      data.nextRunAt = new Date(Date.now() + interval)
    }
  }

  const updated = await db.scheduleConfig.update({
    where: { id: 'default' },
    data,
  })

  // Restart the timer with new config
  restartTimer()

  return {
    enabled: updated.enabled,
    intervalMinutes: updated.intervalMinutes,
    targetUrl: updated.targetUrl,
    timeoutMs: updated.timeoutMs,
    sources: JSON.parse(updated.sourcesJson || '[]'),
    nextRunAt: updated.nextRunAt?.getTime() ?? null,
    lastRunAt: updated.lastRunAt?.getTime() ?? null,
    lastRunStatus: updated.lastRunStatus,
    updatedAt: updated.updatedAt.getTime(),
  }
}

/**
 * Run the scheduled job immediately (manual trigger).
 * Returns the run ID.
 */
export async function runScheduledJobNow(): Promise<{ runId: string }> {
  const cfg = await ensureConfig()
  const sources: ScheduleSourcesEntry[] = JSON.parse(cfg.sourcesJson || '[]')
  return await executeScheduledRun(cfg, sources, 'manual')
}

/**
 * Execute one scheduled run: fetch all sources, create a batch, run it,
 * and persist working proxies to the DB.
 */
async function executeScheduledRun(
  cfg: Awaited<ReturnType<typeof ensureConfig>>,
  sources: ScheduleSourcesEntry[],
  trigger: 'schedule' | 'manual',
): Promise<{ runId: string }> {
  // Create a ScheduledRun record
  const run = await db.scheduledRun.create({
    data: {
      trigger,
      status: 'running',
      startedAt: new Date(),
      sourcesJson: JSON.stringify(sources),
    },
  })

  // Update ScheduleConfig: lastRunAt, lastRunStatus, nextRunAt
  const nextRunAt = new Date(Date.now() + cfg.intervalMinutes * 60 * 1000)
  await db.scheduleConfig.update({
    where: { id: 'default' },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: 'running',
      nextRunAt,
    },
  })

  // Fetch all sources in parallel
  const fetchResults = await Promise.allSettled(
    sources.map((s) => fetchProxiesFromUrl(s.url)),
  )
  const allProxies: ProxyInfo[] = []
  const sourceInfos: { url: string; label: string; count: number; type: string; error?: string }[] = []

  sources.forEach((s, i) => {
    const r = fetchResults[i]
    if (r.status === 'fulfilled') {
      allProxies.push(...r.value.proxies)
      sourceInfos.push({
        url: s.url,
        label: s.label,
        count: r.value.count,
        type: r.value.type,
      })
    } else {
      sourceInfos.push({
        url: s.url,
        label: s.label,
        count: 0,
        type: s.type,
        error: r.reason?.message || 'fetch failed',
      })
    }
  })

  if (allProxies.length === 0) {
    await db.scheduledRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: 'No proxies fetched from any source',
        sourcesJson: JSON.stringify(sourceInfos),
      },
    })
    await db.scheduleConfig.update({
      where: { id: 'default' },
      data: { lastRunStatus: 'failed' },
    })
    return { runId: run.id }
  }

  // Create an in-memory batch (reuses the existing concurrency engine)
  const batch = createBatch(allProxies, sourceInfos, {
    timeoutMs: cfg.timeoutMs,
    targetUrl: cfg.targetUrl,
  })

  // Mark this batch id so the manual-completion callback skips it
  // (we persist it ourselves via the async waiter below)
  knownScheduledBatchIds.add(batch.id)

  // Start running it in background
  runBatch(batch.id)

  // Asynchronously wait for the batch to complete, then persist results
  ;(async () => {
    const startedAt = Date.now()
    const maxWaitMs = 60 * 60 * 1000 // 1 hour max
    while (Date.now() - startedAt < maxWaitMs) {
      const b = getBatch(batch.id)
      if (!b) break
      if (b.status === 'completed' || b.status === 'stopped' || b.status === 'error') {
        await persistBatchResults(run.id, b)
        return
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    // Timeout: mark as failed
    await db.scheduledRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: 'Timeout waiting for batch to complete',
      },
    })
    await db.scheduleConfig.update({
      where: { id: 'default' },
      data: { lastRunStatus: 'failed' },
    })
  })()

  return { runId: run.id }
}

/** Persist working proxies from a completed batch to the DB. */
export async function persistBatchResults(runId: string, batch: Batch) {
  try {
    const working = batch.results.filter((r) => r.status === 'working')
    const failed = batch.results.filter((r) => r.status === 'failed').length

    // Insert working proxies (batch insert)
    if (working.length > 0) {
      // SQLite has a limit on variables per query (~999), so chunk it
      // Note: Prisma 6 SQLite doesn't support skipDuplicates in createMany,
      // so we deduplicate in memory first (by host:port:type within this run)
      const seen = new Set<string>()
      const deduped = working.filter((r) => {
        const key = `${r.proxy.host}:${r.proxy.port}:${r.proxy.type}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      const CHUNK = 400
      for (let i = 0; i < deduped.length; i += CHUNK) {
        const slice = deduped.slice(i, i + CHUNK)
        await db.workingProxy.createMany({
          data: slice.map((r) => ({
            runId,
            address: `${r.proxy.host}:${r.proxy.port}`,
            host: r.proxy.host,
            port: r.proxy.port,
            type: r.proxy.type,
            responseTime: r.responseTime ?? null,
            sourceUrl: r.proxy.sourceUrl ?? null,
          })),
        })
      }
    }

    // Update the run record
    await db.scheduledRun.update({
      where: { id: runId },
      data: {
        status: batch.status === 'stopped' ? 'stopped' : 'completed',
        completedAt: new Date(),
        total: batch.stats.total,
        working: working.length,
        failed,
        sourcesJson: JSON.stringify(batch.sources),
      },
    })

    // Update ScheduleConfig status
    await db.scheduleConfig.update({
      where: { id: 'default' },
      data: { lastRunStatus: batch.status === 'stopped' ? 'stopped' : 'completed' },
    })

    // Prune old runs: keep only the last KEEPLAST_RUNS
    const oldRuns = await db.scheduledRun.findMany({
      orderBy: { startedAt: 'desc' },
      skip: KEEPLAST_RUNS,
      select: { id: true },
    })
    if (oldRuns.length > 0) {
      const oldIds = oldRuns.map((r) => r.id)
      // Delete working proxies for old runs first
      await db.workingProxy.deleteMany({
        where: { runId: { in: oldIds } },
      })
      await db.scheduledRun.deleteMany({
        where: { id: { in: oldIds } },
      })
    }
  } catch (err) {
    console.error('[scheduler] persistBatchResults error:', err)
    try {
      await db.scheduledRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      })
      await db.scheduleConfig.update({
        where: { id: 'default' },
        data: { lastRunStatus: 'failed' },
      })
    } catch {}
  }
}

/**
 * (Re)start the scheduler timer based on the current config.
 * Called on server startup and after every config update.
 */
export async function restartTimer() {
  // Clear existing timer
  if (schedulerState.timer) {
    clearTimeout(schedulerState.timer)
    schedulerState.timer = null
  }

  const cfg = await ensureConfig()
  if (!cfg.enabled) return

  const now = Date.now()
  const nextRunAt = cfg.nextRunAt?.getTime() ?? 0
  let delay: number
  if (nextRunAt > now) {
    delay = nextRunAt - now
  } else {
    // Overdue — run immediately (after a short grace period to let server finish booting)
    delay = 5_000
  }
  // Cap delay at 24h to avoid overflow concerns
  delay = Math.min(delay, 24 * 60 * 60 * 1000)

  schedulerState.timer = setTimeout(async () => {
    schedulerState.timer = null
    if (schedulerState.isRunning) return
    schedulerState.isRunning = true
    try {
      const c = await ensureConfig()
      if (!c.enabled) return
      const sources: ScheduleSourcesEntry[] = JSON.parse(c.sourcesJson || '[]')
      if (sources.length === 0) {
        // No sources configured — reschedule
        await restartTimer()
        return
      }
      await executeScheduledRun(c, sources, 'schedule')
    } catch (err) {
      console.error('[scheduler] run error:', err)
    } finally {
      schedulerState.isRunning = false
      // Schedule the next run
      restartTimer()
    }
  }, delay)

  // Don't keep the process alive forever just for the timer
  if (schedulerState.timer.unref) {
    schedulerState.timer.unref()
  }
}

/**
 * Get the latest run with its working proxies count.
 */
export async function getLatestRun() {
  const latest = await db.scheduledRun.findFirst({
    orderBy: { startedAt: 'desc' },
  })
  if (!latest) return null
  return {
    id: latest.id,
    trigger: latest.trigger,
    startedAt: latest.startedAt.getTime(),
    completedAt: latest.completedAt?.getTime() ?? null,
    status: latest.status,
    total: latest.total,
    working: latest.working,
    failed: latest.failed,
    sources: JSON.parse(latest.sourcesJson || '[]'),
    error: latest.error,
  }
}

/**
 * Get run history (most recent first).
 */
export async function getRunHistory(limit = 20) {
  const runs = await db.scheduledRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  })
  return runs.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    startedAt: r.startedAt.getTime(),
    completedAt: r.completedAt?.getTime() ?? null,
    status: r.status,
    total: r.total,
    working: r.working,
    failed: r.failed,
    error: r.error,
  }))
}

/**
 * Get all working proxies from the latest completed run.
 * Returns them in the order: fastest first.
 */
export async function getLatestWorkingProxies() {
  const latest = await db.scheduledRun.findFirst({
    where: { status: { in: ['completed', 'stopped'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (!latest) return { run: null, proxies: [] as any[] }

  const proxies = await db.workingProxy.findMany({
    where: { runId: latest.id },
    orderBy: [{ responseTime: 'asc' }],
  })

  return {
    run: {
      id: latest.id,
      trigger: latest.trigger,
      startedAt: latest.startedAt.getTime(),
      completedAt: latest.completedAt?.getTime() ?? null,
      status: latest.status,
      total: latest.total,
      working: latest.working,
      failed: latest.failed,
      sources: JSON.parse(latest.sourcesJson || '[]'),
    },
    proxies: proxies.map((p) => ({
      host: p.host,
      port: p.port,
      type: p.type,
      responseTime: p.responseTime,
      sourceUrl: p.sourceUrl,
      address: p.address,
    })),
  }
}

/**
 * Get working proxies from the latest run, optionally filtered by type.
 */
export async function getLatestWorkingByType(type?: string) {
  const latest = await db.scheduledRun.findFirst({
    where: { status: { in: ['completed', 'stopped'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (!latest) return { run: null, proxies: [] as any[] }

  const where: any = { runId: latest.id }
  if (type && type !== 'all') where.type = type

  const proxies = await db.workingProxy.findMany({
    where,
    orderBy: [{ responseTime: 'asc' }],
  })

  return {
    run: {
      id: latest.id,
      trigger: latest.trigger,
      startedAt: latest.startedAt.getTime(),
      completedAt: latest.completedAt?.getTime() ?? null,
      status: latest.status,
      total: latest.total,
      working: latest.working,
      failed: latest.failed,
      sources: JSON.parse(latest.sourcesJson || '[]'),
    },
    proxies: proxies.map((p) => ({
      host: p.host,
      port: p.port,
      type: p.type,
      responseTime: p.responseTime,
      sourceUrl: p.sourceUrl,
      address: p.address,
    })),
  }
}

// ─── Manual batch persistence ───────────────────────────────────────────────
//
// When a user clicks "Start Test" on the main page, a batch is created via
// /api/batches (NOT /api/schedule/run). That batch lives only in memory.
// To make /api/latest/txt reflect the latest test regardless of trigger
// source, we register a completion callback that persists any completed
// batch to the database as a "manual" ScheduledRun.

let manualCallbackRegistered = false
const knownScheduledBatchIds = new Set<string>()

function ensureManualBatchCallback() {
  if (manualCallbackRegistered) return
  manualCallbackRegistered = true

  onBatchComplete(async (batch) => {
    // Only persist batches that have completed/stopped with results.
    if (batch.status !== 'completed' && batch.status !== 'stopped') return
    if (batch.results.length === 0) return

    // Skip batches created by executeScheduledRun (already persisted there)
    if (knownScheduledBatchIds.has(batch.id)) return

    try {
      const run = await db.scheduledRun.create({
        data: {
          trigger: 'manual',
          status: batch.status === 'stopped' ? 'stopped' : 'completed',
          startedAt: new Date(batch.createdAt),
          completedAt: batch.completedAt ? new Date(batch.completedAt) : new Date(),
          total: batch.stats.total,
          working: batch.stats.working,
          failed: batch.stats.failed,
          sourcesJson: JSON.stringify(batch.sources),
        },
      })
      await persistBatchResults(run.id, batch)
      console.log(
        `[scheduler] Manual batch ${batch.id} persisted to DB as run ${run.id} ` +
          `(${batch.stats.working} working / ${batch.stats.total} total)`,
      )
    } catch (err) {
      console.error('[scheduler] Failed to persist manual batch:', err)
    }
  })
}

// Register on first import (server-side)
ensureManualBatchCallback()
