/**
 * Get test results for a batch.
 * Query params:
 *  - filter: 'working' | 'failed' | 'all' (default 'all')
 *  - type:   'http' | 'https' | 'socks4' | 'socks5' | 'all' (default 'all')
 *  - sort:   'responseTime' | 'recent' (default 'responseTime')
 *  - limit:  number (default 1000)
 *  - offset: number (default 0)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBatch } from '@/lib/batch-manager'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const batch = getBatch(id)
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const filter = sp.get('filter') || 'all'
  const typeFilter = sp.get('type') || 'all'
  const sort = sp.get('sort') || 'responseTime'
  const limit = Math.min(parseInt(sp.get('limit') || '1000', 10), 5000)
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10), 0)

  let results = batch.results.slice()
  if (filter === 'working') results = results.filter((r) => r.status === 'working')
  else if (filter === 'failed') results = results.filter((r) => r.status === 'failed')
  if (typeFilter !== 'all') results = results.filter((r) => r.proxy.type === typeFilter)

  if (sort === 'responseTime') {
    results.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'working' ? -1 : 1
      return (a.responseTime ?? 999999) - (b.responseTime ?? 999999)
    })
  } else {
    results.sort((a, b) => b.testedAt - a.testedAt)
  }

  const total = results.length
  const slice = results.slice(offset, offset + limit)

  return NextResponse.json({
    id: batch.id,
    status: batch.status,
    stats: batch.stats,
    total,
    offset,
    limit,
    results: slice,
  })
}
