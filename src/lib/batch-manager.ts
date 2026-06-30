/**
 * In-memory proxy test batch manager with concurrency control.
 * Batches are kept in memory; cleaned up after 30 minutes of inactivity.
 */
import { ProxyInfo, ProxyTestResult, TestOptions, testProxy } from './proxy-tester'

export type BatchStatus = 'pending' | 'running' | 'completed' | 'stopped' | 'error'

export interface BatchStats {
  total: number
  tested: number
  working: number
  failed: number
  pending: number
}

export interface Batch {
  id: string
  status: BatchStatus
  options: TestOptions
  sources: { url: string; label: string; count: number; type: string }[]
  proxies: ProxyInfo[]
  results: ProxyTestResult[]
  stats: BatchStats
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: string
  // dedup map
  seen: Set<string>
  // abort flag
  stopRequested: boolean
}

// Singleton in-memory store (resets on server restart)
// Use globalThis to persist across HMR in dev mode
declare global {
  var __proxyBatches: Map<string, Batch> | undefined
  var __proxyBatchesCleanup: NodeJS.Timeout | undefined
}

const batches: Map<string, Batch> = globalThis.__proxyBatches ?? new Map<string, Batch>()
if (!globalThis.__proxyBatches) {
  globalThis.__proxyBatches = batches
}

const BATCH_TTL = 30 * 60 * 1000 // 30 min

function cleanupOldBatches() {
  const now = Date.now()
  for (const [id, b] of batches) {
    if (now - b.updatedAt > BATCH_TTL) {
      batches.delete(id)
    }
  }
}

export function getBatch(id: string): Batch | undefined {
  cleanupOldBatches()
  return batches.get(id)
}

export function listBatches(): Batch[] {
  cleanupOldBatches()
  return Array.from(batches.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function createBatch(
  proxies: ProxyInfo[],
  sources: { url: string; label: string; count: number; type: string }[],
  options: TestOptions,
): Batch {
  const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  // Dedup by host:port:type
  const seen = new Set<string>()
  const unique: ProxyInfo[] = []
  for (const p of proxies) {
    const key = `${p.host}:${p.port}:${p.type}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(p)
  }
  const batch: Batch = {
    id,
    status: 'pending',
    options,
    sources,
    proxies: unique,
    results: [],
    stats: {
      total: unique.length,
      tested: 0,
      working: 0,
      failed: 0,
      pending: unique.length,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    seen: new Set(),
    stopRequested: false,
  }
  batches.set(id, batch)
  return batch
}

export function stopBatch(id: string): boolean {
  const b = batches.get(id)
  if (!b) return false
  b.stopRequested = true
  b.status = 'stopped'
  b.updatedAt = Date.now()
  return true
}

export function deleteBatch(id: string): boolean {
  return batches.delete(id)
}

// Completion callbacks — invoked when any batch finishes (completed/stopped/failed).
// Used by scheduler.ts to persist manual batch results to the database, so that
// /api/latest/txt returns the latest result regardless of whether it was a
// scheduled run or a manual "Start Test" click.
type BatchCompleteCallback = (batch: Batch) => void
const batchCompleteCallbacks: BatchCompleteCallback[] = []

/**
 * Register a callback invoked when any batch completes.
 * The callback runs asynchronously and errors are swallowed (logged) so a
 * failing callback can't break the batch runner.
 */
export function onBatchComplete(cb: BatchCompleteCallback): void {
  batchCompleteCallbacks.push(cb)
}

/**
 * Run a batch with concurrency control. Does not await - kicks off in background.
 */
export function runBatch(batchId: string): void {
  const batch = batches.get(batchId)
  if (!batch) return
  if (batch.status === 'running') return

  batch.status = 'running'
  batch.updatedAt = Date.now()

  const CONCURRENCY = 50
  const queue = [...batch.proxies]
  let activeWorkers = 0

  const maybeFinish = () => {
    if (queue.length === 0 && activeWorkers === 0) {
      batch.status = batch.stopRequested ? 'stopped' : 'completed'
      batch.completedAt = Date.now()
      batch.updatedAt = Date.now()
      batch.stats.pending = 0
      // Notify all registered callbacks (e.g., persist to DB)
      for (const cb of batchCompleteCallbacks) {
        try {
          Promise.resolve(cb(batch)).catch((e) =>
            console.error('[batch-manager] completion callback error:', e),
          )
        } catch (e) {
          console.error('[batch-manager] completion callback sync error:', e)
        }
      }
    }
  }

  const worker = async () => {
    while (queue.length > 0 && !batch.stopRequested) {
      const proxy = queue.shift()
      if (!proxy) break
      activeWorkers++
      try {
        const result = await testProxy(proxy, batch.options)
        batch.results.push(result)
        batch.stats.tested++
        if (result.status === 'working') batch.stats.working++
        else batch.stats.failed++
        batch.stats.pending = batch.stats.total - batch.stats.tested
        batch.updatedAt = Date.now()
      } catch (err) {
        // Should not happen since testProxy catches errors, but just in case
        batch.stats.tested++
        batch.stats.failed++
        batch.stats.pending = batch.stats.total - batch.stats.tested
        batch.results.push({
          proxy,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          testedAt: Date.now(),
        })
      } finally {
        activeWorkers--
      }
    }
    activeWorkers--
    maybeFinish()
  }

  // Start workers (note: activeWorkers++ before the loop)
  const numWorkers = Math.min(CONCURRENCY, batch.proxies.length)
  for (let i = 0; i < numWorkers; i++) {
    activeWorkers++
    worker().catch(() => {
      activeWorkers--
      maybeFinish()
    })
  }
}
