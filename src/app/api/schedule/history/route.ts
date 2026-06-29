/**
 * Get schedule run history (most recent first).
 * Query: limit (default 20, max 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRunHistory } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = parseInt(sp.get('limit') || '20', 10)
  const history = await getRunHistory(limit)
  return NextResponse.json({ history })
}
