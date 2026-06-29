/**
 * Manually trigger a scheduled run immediately.
 * POST: triggers a new run. Returns the run ID.
 */
import { NextResponse } from 'next/server'
import { runScheduledJobNow } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { runId } = await runScheduledJobNow()
    return NextResponse.json({ runId, ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Trigger failed' }, { status: 500 })
  }
}
