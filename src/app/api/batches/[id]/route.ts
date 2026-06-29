/**
 * Single batch operations.
 * GET: Get batch status & stats.
 * DELETE: Stop (if running) and delete the batch.
 * PATCH: { action: 'stop' } to stop the batch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { deleteBatch, getBatch, stopBatch } from '@/lib/batch-manager'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const batch = getBatch(id)
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }
  return NextResponse.json({
    id: batch.id,
    status: batch.status,
    stats: batch.stats,
    options: batch.options,
    sources: batch.sources,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    completedAt: batch.completedAt,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ok = deleteBatch(id)
  if (!ok) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (body?.action === 'stop') {
    const ok = stopBatch(id)
    if (!ok) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
