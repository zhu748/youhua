/**
 * Fetch and parse proxies from a single URL.
 * POST body: { url: string }
 * Returns: { url, count, type, sample: [{host, port, type}, ...max 10] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchProxiesFromUrl } from '@/lib/proxy-tester'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url: string = body?.url
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing "url" in body' }, { status: 400 })
    }
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    const { proxies, count, type } = await fetchProxiesFromUrl(url)
    return NextResponse.json({
      url,
      count,
      type,
      sample: proxies.slice(0, 10),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch source' },
      { status: 500 },
    )
  }
}
