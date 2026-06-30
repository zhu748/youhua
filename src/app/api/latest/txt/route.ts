/**
 * Stable TXT endpoint — always returns the latest working proxies.
 * URL: /api/latest/txt
 *
 * Query:
 *  - format: 'txt' (default) | 'json'
 *  - type:   'all' (default) | 'http' | 'https' | 'socks4' | 'socks5'
 *  - includeScheme: '1' (default) | '0' to control whether to prepend type://
 *    - Default is '1' (include scheme), matching proxyscrape/all/data.txt format
 *    - Use ?includeScheme=0 or ?plain=1 for plain ip:port output
 *  - plain: '1' shortcut for includeScheme=0
 *
 * Output format matches https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt
 * Default: each line is `type://ip:port` (e.g. `socks5://1.2.3.4:1080`)
 */
import { NextRequest } from 'next/server'
import { getLatestWorkingByType } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') || 'txt'
  const type = sp.get('type') || 'all'
  // Default to INCLUDING the scheme (matches proxyscrape format).
  // Set to '0' explicitly, or use ?plain=1, to get plain ip:port output.
  const plain = sp.get('plain') === '1'
  const includeSchemeParam = sp.get('includeScheme')
  const includeScheme = plain ? false : includeSchemeParam === null ? true : includeSchemeParam === '1'

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
        `# Format: ${includeScheme ? 'type://host:port (e.g. socks5://1.2.3.4:1080)' : 'host:port (e.g. 1.2.3.4:1080)'}`,
        `# Tip: add ?plain=1 for plain ip:port output, ?type=socks5 to filter by type`,
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
