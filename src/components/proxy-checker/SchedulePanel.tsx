'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Clock, Calendar, Play, Loader2, CheckCircle2, XCircle, ExternalLink,
  Copy, Check, RefreshCw, History, Zap, FileText, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface ScheduleConfig {
  enabled: boolean
  intervalMinutes: number
  targetUrl: string
  timeoutMs: number
  sources: { url: string; label: string; type: string }[]
  nextRunAt: number | null
  lastRunAt: number | null
  lastRunStatus: string
  updatedAt: number
}

export interface LatestRun {
  id: string
  trigger: string
  startedAt: number
  completedAt: number | null
  status: string
  total: number
  working: number
  failed: number
  sources: { url: string; label: string; count: number; type: string; error?: string }[]
  error?: string | null
}

export interface HistoryItem {
  id: string
  trigger: string
  startedAt: number
  completedAt: number | null
  status: string
  total: number
  working: number
  failed: number
  error?: string | null
}

interface Props {
  /** Reflect current selected sources from main page (so user can sync to schedule). */
  currentSources: { url: string; label: string; type: string }[]
}

function formatRelative(ts: number | null): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < 0) {
    // future
    const s = Math.floor(-diff / 1000)
    if (s < 60) return `${s}s 后`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m 后`
    const h = Math.floor(m / 60)
    return `${h}h 后`
  }
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s 前`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m 前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h 前`
  const d = Math.floor(h / 24)
  return `${d}d 前`
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

const STATUS_COLOR: Record<string, string> = {
  running: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  completed: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  failed: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  stopped: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  pending: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
}

export function SchedulePanel({ currentSources }: Props) {
  const [config, setConfig] = useState<ScheduleConfig | null>(null)
  const [latest, setLatest] = useState<LatestRun | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const { toast } = useToast()

  // Initial fetch
  const refresh = useCallback(async () => {
    try {
      const [cfgRes, latestRes, histRes] = await Promise.all([
        fetch('/api/schedule').then((r) => r.json()),
        fetch('/api/latest').then((r) => r.json()),
        fetch('/api/schedule/history?limit=10').then((r) => r.json()),
      ])
      setConfig(cfgRes)
      setLatest(latestRes.latest)
      setHistory(histRes.history || [])
    } catch (err) {
      console.error('schedule fetch error', err)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Poll every 10s for live updates (especially when a run is in progress)
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  }, [refresh])

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!config) return
    setSaving(true)
    try {
      const r = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setConfig(d)
      toast({
        title: enabled ? '定时任务已启用' : '定时任务已禁用',
        description: enabled
          ? `每 ${d.intervalMinutes} 分钟自动检测一次`
          : '已停止自动检测',
      })
    } catch (e: any) {
      toast({ title: '操作失败', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) return
    setSaving(true)
    try {
      const r = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMinutes: minutes }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setConfig(d)
    } catch (e: any) {
      toast({ title: '保存失败', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncSources = async () => {
    if (currentSources.length === 0) {
      toast({ title: '请先在上方选择代理来源', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: currentSources }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setConfig(d)
      toast({
        title: '已同步当前来源到定时任务',
        description: `${currentSources.length} 个来源已设为定时检测目标`,
      })
    } catch (e: any) {
      toast({ title: '同步失败', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTriggerNow = async () => {
    setTriggering(true)
    try {
      const r = await fetch('/api/schedule/run', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast({
        title: '已触发立即检测',
        description: `任务 ID: ${d.runId.slice(0, 12)}...`,
      })
      // Refresh after a short delay
      setTimeout(refresh, 1000)
    } catch (e: any) {
      toast({ title: '触发失败', description: e.message, variant: 'destructive' })
    } finally {
      setTriggering(false)
    }
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/api/latest/txt`,
    )
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1500)
  }

  if (!config) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className="h-5 w-5 text-emerald-400" />
            定时任务
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isRunningNow = latest?.status === 'running'
  const txtUrl = '/api/latest/txt'

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Clock className={`h-5 w-5 ${isRunningNow ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
            定时任务
            {isRunningNow && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 运行中
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving}
            />
            <Label className="text-xs text-zinc-400">
              {config.enabled ? '已启用' : '已禁用'}
            </Label>
          </div>
        </div>
        <CardDescription className="text-zinc-400">
          自动定时检测代理并输出到稳定 URL，可像 proxyscrape 列表一样直接引用。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatBox
            label="上次结果"
            value={latest?.working ?? '—'}
            sub={latest ? `有效 / ${latest.total}` : '尚未运行'}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            color="text-emerald-300"
          />
          <StatBox
            label="上次运行"
            value={formatRelative(latest?.completedAt ?? latest?.startedAt ?? null)}
            sub={latest ? `${latest.trigger === 'manual' ? '手动' : '自动'}` : '—'}
            icon={<History className="h-4 w-4 text-cyan-400" />}
            color="text-cyan-300"
            isRaw
          />
          <StatBox
            label="下次运行"
            value={formatRelative(config.nextRunAt)}
            sub={config.enabled ? '计划中' : '已禁用'}
            icon={<Calendar className="h-4 w-4 text-fuchsia-400" />}
            color="text-fuchsia-300"
            isRaw
          />
          <StatBox
            label="检测间隔"
            value={`${config.intervalMinutes}m`}
            sub={`超时 ${config.timeoutMs}ms`}
            icon={<Zap className="h-4 w-4 text-amber-400" />}
            color="text-amber-300"
            isRaw
          />
        </div>

        {/* Interval slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" /> 检测间隔
            </Label>
            <span className="text-sm font-mono text-emerald-400">
              每 {config.intervalMinutes} 分钟
            </span>
          </div>
          <Slider
            value={[config.intervalMinutes]}
            min={5}
            max={360}
            step={5}
            disabled={saving}
            onValueChange={(v) => {
              // Update locally first for responsiveness
              setConfig({ ...config, intervalMinutes: v[0] })
            }}
            onPointerUp={() => handleIntervalChange(config.intervalMinutes)}
            className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>5min</span>
            <span>1h</span>
            <span>3h</span>
            <span>6h</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleTriggerNow}
            disabled={triggering || isRunningNow}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {triggering || isRunningNow ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1" />
            )}
            {isRunningNow ? '运行中...' : '立即检测'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncSources}
            disabled={saving}
            className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${saving ? 'animate-spin' : ''}`} />
            同步当前来源 ({currentSources.length})
          </Button>
        </div>

        {/* Configured sources */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-zinc-500">
            定时检测来源 ({config.sources.length})
          </Label>
          {config.sources.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
              尚未配置 — 点击"同步当前来源"将上方的勾选应用到定时任务
            </div>
          ) : (
            <div className="space-y-1">
              {config.sources.map((s, i) => (
                <div
                  key={`${s.url}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-1.5"
                >
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase shrink-0 bg-zinc-800/60 text-zinc-400 border-zinc-700"
                  >
                    {s.type}
                  </Badge>
                  <span className="flex-1 text-xs text-zinc-400 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stable TXT URL */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            <FileText className="h-3 w-3" /> 稳定 TXT 链接（与 proxyscrape 格式一致）
          </Label>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-emerald-300 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/latest/txt` : '/api/latest/txt'}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-300"
                onClick={handleCopyUrl}
                title="复制链接"
              >
                {copiedUrl ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-300"
                onClick={() => window.open(txtUrl, '_blank')}
                title="在新标签页打开"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              此 URL 永远返回最近一次检测的有效代理列表（<code className="text-emerald-400/80">ip:port</code> 格式，每行一个）。
              可在脚本、爬虫或代理软件中直接引用，与 <code className="text-emerald-400/80">proxyscrape/all/data.txt</code> 用法一致。
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => window.open('/api/latest/txt?type=http', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                ?type=http
              </button>
              <button
                onClick={() => window.open('/api/latest/txt?type=https', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                ?type=https
              </button>
              <button
                onClick={() => window.open('/api/latest/txt?type=socks4', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                ?type=socks4
              </button>
              <button
                onClick={() => window.open('/api/latest/txt?type=socks5', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                ?type=socks5
              </button>
              <button
                onClick={() => window.open('/api/latest/txt?includeScheme=1', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                ?includeScheme=1
              </button>
              <button
                onClick={() => window.open('/api/latest/json', '_blank')}
                className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/30"
              >
                JSON 格式
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            >
              {showHistory ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
              <History className="h-3.5 w-3.5 mr-1" />
              运行历史 ({history.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/40 max-h-72 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center text-xs text-zinc-600 py-6">暂无历史记录</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 px-3 py-2 text-xs"
                    >
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${STATUS_COLOR[h.status] || STATUS_COLOR.pending}`}
                      >
                        {h.status}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300">
                          <span className="text-emerald-400">{h.working}</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-zinc-400">{h.total}</span>
                          <span className="text-zinc-600"> 有效</span>
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          {h.trigger === 'manual' ? '手动' : '自动'} · {formatRelative(h.startedAt)}
                          {h.completedAt && h.startedAt
                            ? ` · 用时 ${formatDuration(h.completedAt - h.startedAt)}`
                            : ''}
                        </div>
                      </div>
                      {h.status === 'running' && (
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" />
                      )}
                      {h.status === 'completed' && (
                        <CheckCircle2 className="h-3 w-3 text-cyan-400 shrink-0" />
                      )}
                      {h.status === 'failed' && (
                        <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

function StatBox({
  label, value, sub, icon, color, isRaw,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  color: string
  isRaw?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
        {icon}
      </div>
      <div className={`text-lg font-bold font-mono ${color}`}>
        {isRaw ? value : (typeof value === 'number' ? value.toLocaleString() : value)}
      </div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}
