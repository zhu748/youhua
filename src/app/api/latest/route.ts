/**
 * Get latest run summary (no proxy list).
 * Used by the UI to display "last updated X minutes ago" and counts.
 */
import { NextResponse } from 'next/server'
import { getLatestRun, getScheduleConfig } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [latest, cfg] = await Promise.all([getLatestRun(), getScheduleConfig()])
  return NextResponse.json({
    schedule: cfg,
    latest,
  })
}
