/**
 * Batch management.
 * POST: Create and start a new test batch.
 *   body: {
 *     sources: [{ url, label?, type? }],
 *     options: { timeoutMs, targetUrl, concurrency? }
 *   }
 *   returns: { id, stats, options, sources }
 *
 * GET: List all batches (most recent first).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  createBatch,
  listBatches,
  runBatch,
} from '@/lib/batch-manager'
import { fetchProxiesFromUrl, ProxyInfo, ProxyType } from '@/lib/proxy-tester'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sources: { url: string; label?: string; type?: ProxyType }[] = body?.sources
    const options = body?.options || {}

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: 'Missing "sources" array' }, { status: 400 })
    }

    const timeoutMs = Math.min(Math.max(parseInt(options.timeoutMs, 10) || 5000, 1000), 30000)
    const targetUrl = options.targetUrl || 'http://www.google.com/generate_204'

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
          label: s.label || s.url,
          count: r.value.count,
          type: r.value.type,
        })
      } else {
        sourceInfos.push({
          url: s.url,
          label: s.label || s.url,
          count: 0,
          type: s.type || 'unknown',
          error: r.reason?.message || 'fetch failed',
        })
      }
    })

    if (allProxies.length === 0) {
      return NextResponse.json(
        { error: 'No proxies fetched from any source', sources: sourceInfos },
        { status: 400 },
      )
    }

    const batch = createBatch(allProxies, sourceInfos, { timeoutMs, targetUrl })
    // Kick off in background
    runBatch(batch.id)

    return NextResponse.json({
      id: batch.id,
      status: batch.status,
      stats: batch.stats,
      options: batch.options,
      sources: batch.sources,
      createdAt: batch.createdAt,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create batch' },
      { status: 500 },
    )
  }
}

export async function GET() {
  const batches = listBatches()
  return NextResponse.json({
    batches: batches.map((b) => ({
      id: b.id,
      status: b.status,
      stats: b.stats,
      sources: b.sources,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      completedAt: b.completedAt,
    })),
  })
}
