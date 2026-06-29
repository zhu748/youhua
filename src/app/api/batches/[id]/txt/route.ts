/**
 * Plain-text output of working proxies, similar to the source format.
 * Query params:
 *  - format: 'txt' | 'json' (default 'txt')
 *  - type:   'http' | 'https' | 'socks4' | 'socks5' | 'all' (default 'all')
 *  - includeScheme: '1' to prepend type:// to each line
 *  - sort:   'responseTime' | 'recent' (default 'responseTime')
 */
import { NextRequest } from 'next/server'
import { getBatch } from '@/lib/batch-manager'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const batch = getBatch(id)
  if (!batch) {
    return new Response('Batch not found', { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const format = sp.get('format') || 'txt'
  const typeFilter = sp.get('type') || 'all'
  const includeScheme = sp.get('includeScheme') === '1'
  const sort = sp.get('sort') || 'responseTime'

  let results = batch.results.filter((r) => r.status === 'working')
  if (typeFilter !== 'all') results = results.filter((r) => r.proxy.type === typeFilter)

  if (sort === 'responseTime') {
    results.sort((a, b) => (a.responseTime ?? 999999) - (b.responseTime ?? 999999))
  } else {
    results.sort((a, b) => b.testedAt - a.testedAt)
  }

  if (format === 'json') {
    return Response.json(
      results.map((r) => ({
        host: r.proxy.host,
        port: r.proxy.port,
        type: r.proxy.type,
        responseTime: r.responseTime,
        source: r.proxy.sourceUrl,
      })),
    )
  }

  const lines = results.map((r) =>
    includeScheme
      ? `${r.proxy.type}://${r.proxy.host}:${r.proxy.port}`
      : `${r.proxy.host}:${r.proxy.port}`,
  )
  const body = lines.join('\n') + (lines.length > 0 ? '\n' : '')

  const now = new Date().toISOString()
  const header = [
    `# Proxy Check Results`,
    `# Batch ID: ${batch.id}`,
    `# Generated: ${now}`,
    `# Total working: ${results.length}`,
    `# Sources: ${batch.sources.map((s) => s.url).join(', ')}`,
    `# Format: ${includeScheme ? 'type://host:port' : 'host:port'}`,
    '',
  ].join('\n')

  return new Response(header + body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
