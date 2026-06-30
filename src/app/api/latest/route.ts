/**
 * Get latest run summary (no proxy list).
 * Used by the UI to display "last updated X minutes ago" and counts.
 */
import { NextResponse } from 'next/server'
import { getLatestRun, getScheduleConfig } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const [latest, cfg] = await Promise.all([getLatestRun(), getScheduleConfig()])
    return NextResponse.json({ schedule: cfg, latest })
  } catch (err: any) {
    console.error('[api/latest] GET error:', err)
    return NextResponse.json(
      {
        error: 'Failed to load latest run',
        detail: err?.message || String(err),
        schedule: null,
        latest: null,
      },
      { status: 500 },
    )
  }
}
