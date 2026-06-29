/**
 * Stable TXT endpoint — always returns the latest working proxies.
 * URL: /api/latest/txt
 *
 * Query:
 *  - format: 'txt' (default) | 'json'
 *  - type:   'all' (default) | 'http' | 'https' | 'socks4' | 'socks5'
 *  - includeScheme: '1' to prepend type:// to each line
 *
 * Output format identical to https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt
 * Each line: ip:port (default) or type://ip:port (with includeScheme=1)
 */
import { NextRequest } from 'next/server'
import { getLatestWorkingByType } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') || 'txt'
  const type = sp.get('type') || 'all'
  const includeScheme = sp.get('includeScheme') === '1'

  const { run, proxies } = await getLatestWorkingByType(
    ['http', 'https', 'socks4', 'socks5', 'all'].includes(type as any) ? (type as any) : 'all',
  )

  if (format === 'json') {
    return Response.json({
      run: run
        ? {
            id: run.id,
            trigger: run.trigger,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            status: run.status,
            total: run.total,
            working: run.working,
            failed: run.failed,
            sources: run.sources,
          }
        : null,
      count: proxies.length,
      proxies,
    })
  }

  const lines = proxies.map((p: any) =>
    includeScheme ? `${p.type}://${p.host}:${p.port}` : p.address,
  )
  const body = lines.join('\n') + (lines.length > 0 ? '\n' : '')

  const now = new Date().toISOString()
  const header = run
    ? [
        `# Proxy Check Results — Latest Working Proxies`,
        `# Run ID: ${run.id}`,
        `# Trigger: ${run.trigger}`,
        `# Started: ${new Date(run.startedAt).toISOString()}`,
        ...(run.completedAt ? [`# Completed: ${new Date(run.completedAt).toISOString()}`] : []),
        `# Total tested: ${run.total}`,
        `# Working: ${run.working}`,
        `# Failed: ${run.failed}`,
        `# Sources: ${Array.isArray(run.sources) ? run.sources.map((s: any) => s.url).join(', ') : ''}`,
        `# Format: ${includeScheme ? 'type://host:port' : 'host:port'}`,
        `# Generated: ${now}`,
        '',
      ].join('\n')
    : [
        `# Proxy Check Results — Latest Working Proxies`,
        `# No completed runs yet. Trigger a run via the web UI.`,
        `# Generated: ${now}`,
        '',
      ].join('\n')

  return new Response(header + body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
