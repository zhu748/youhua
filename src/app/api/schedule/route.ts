/**
 * Schedule config API.
 * GET:   Return current schedule config.
 * PATCH: Update schedule config (enabled / intervalMinutes / targetUrl / timeoutMs / sources).
 *        Body: any subset of these fields.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getScheduleConfig, updateScheduleConfig } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const cfg = await getScheduleConfig()
    return NextResponse.json(cfg)
  } catch (err: any) {
    console.error('[api/schedule] GET error:', err)
    return NextResponse.json(
      {
        error: 'Failed to load schedule config',
        detail: err?.message || String(err),
        hint: 'Database may not be initialized. Check container logs for prisma db push errors.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const patch: any = {}
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
    if (typeof body.intervalMinutes === 'number') patch.intervalMinutes = body.intervalMinutes
    if (typeof body.targetUrl === 'string' && body.targetUrl) patch.targetUrl = body.targetUrl
    if (typeof body.timeoutMs === 'number') patch.timeoutMs = body.timeoutMs
    if (Array.isArray(body.sources)) {
      patch.sources = body.sources
        .filter((s: any) => s && typeof s.url === 'string' && s.url)
        .map((s: any) => ({
          url: s.url,
          label: typeof s.label === 'string' ? s.label : s.url,
          type: ['http', 'https', 'socks4', 'socks5', 'unknown'].includes(s.type)
            ? s.type
            : 'unknown',
        }))
    }
    const updated = await updateScheduleConfig(patch)
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[api/schedule] PATCH error:', err)
    return NextResponse.json(
      { error: err?.message || 'Update failed', detail: String(err) },
      { status: 500 },
    )
  }
}
