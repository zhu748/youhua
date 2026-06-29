'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Activity, CheckCircle2, XCircle, Loader2, Square, Ban, Gauge, Timer,
} from 'lucide-react'

export interface BatchStats {
  total: number
  tested: number
  working: number
  failed: number
  pending: number
}

export type BatchStatus = 'pending' | 'running' | 'completed' | 'stopped' | 'error'

interface Props {
  batchId: string | null
  status: BatchStatus | null
  stats: BatchStats | null
  elapsedMs: number
  onStop: () => void
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

function formatRate(tested: number, elapsedMs: number): string {
  if (elapsedMs < 1000) return '—'
  const perSec = (tested / (elapsedMs / 1000)).toFixed(1)
  return `${perSec}/s`
}

export function ProgressPanel({ batchId, status, stats, elapsedMs, onStop }: Props) {
  if (!batchId || !stats) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Activity className="h-5 w-5 text-emerald-400" />
            检测进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
            <Activity className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">点击"开始检测"启动测试</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const pct = stats.total > 0 ? (stats.tested / stats.total) * 100 : 0
  const workingPct = stats.tested > 0 ? (stats.working / stats.tested) * 100 : 0

  const isRunning = status === 'running'

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Activity className={`h-5 w-5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
            检测进度
          </CardTitle>
          <div className="flex items-center gap-2">
            {status === 'running' && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 运行中
              </Badge>
            )}
            {status === 'completed' && (
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> 已完成
              </Badge>
            )}
            {status === 'stopped' && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
                <Square className="h-3 w-3 mr-1" /> 已停止
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-300 border-rose-500/30">
                <XCircle className="h-3 w-3 mr-1" /> 出错
              </Badge>
            )}
            {isRunning && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 bg-rose-600 hover:bg-rose-500 text-xs"
                onClick={onStop}
              >
                <Square className="h-3 w-3 mr-1" /> 停止
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>进度</span>
            <span className="font-mono">
              {stats.tested.toLocaleString()} / {stats.total.toLocaleString()} ({pct.toFixed(1)}%)
            </span>
          </div>
          <Progress
            value={pct}
            className="h-2 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-400"
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard
            label="有效"
            value={stats.working}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            color="text-emerald-300"
            sub={stats.tested > 0 ? `${workingPct.toFixed(1)}%` : '—'}
          />
          <StatCard
            label="失败"
            value={stats.failed}
            icon={<XCircle className="h-4 w-4 text-rose-400" />}
            color="text-rose-300"
            sub={stats.tested > 0 ? `${(100 - workingPct).toFixed(1)}%` : '—'}
          />
          <StatCard
            label="队列中"
            value={stats.pending}
            icon={<Loader2 className={`h-4 w-4 text-amber-400 ${isRunning ? 'animate-spin' : ''}`} />}
            color="text-amber-300"
            sub="等待"
          />
          <StatCard
            label="用时"
            value={formatDuration(elapsedMs)}
            icon={<Timer className="h-4 w-4 text-cyan-400" />}
            color="text-cyan-300"
            sub={formatRate(stats.tested, elapsedMs)}
            isRaw
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  label, value, icon, color, sub, isRaw,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  sub?: string
  isRaw?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
        {icon}
      </div>
      <div className={`text-xl font-bold font-mono ${color}`}>
        {isRaw ? value : (typeof value === 'number' ? value.toLocaleString() : value)}
      </div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}
