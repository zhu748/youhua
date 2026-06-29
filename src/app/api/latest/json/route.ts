/**
 * JSON version: always returns JSON regardless of query.
 */
import { NextResponse } from 'next/server'
import { getLatestWorkingByType } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { run, proxies } = await getLatestWorkingByType('all')
  return NextResponse.json({
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
