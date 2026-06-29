'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { SourceSelector, SelectedSource } from '@/components/proxy-checker/SourceSelector'
import { TestConfig, TestConfigType } from '@/components/proxy-checker/TestConfig'
import { ProgressPanel, BatchStats, BatchStatus } from '@/components/proxy-checker/ProgressPanel'
import { ResultsTable, ResultItem } from '@/components/proxy-checker/ResultsTable'
import { TxtViewer } from '@/components/proxy-checker/TxtViewer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ShieldCheck, Play, Zap, Github, ArrowRight, Sparkles } from 'lucide-react'

export default function Home() {
  const [sources, setSources] = useState<SelectedSource[]>([
    {
      url: 'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt',
      label: 'ProxyScrape — All',
      type: 'unknown',
    },
  ])
  const [config, setConfig] = useState<TestConfigType>({
    timeoutMs: 5000,
    targetUrl: 'http://www.google.com/generate_204',
  })

  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [stats, setStats] = useState<BatchStats | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [results, setResults] = useState<ResultItem[]>([])
  const [resultsTotal, setResultsTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'failed'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [starting, setStarting] = useState(false)

  const { toast } = useToast()
  const startTimeRef = useRef<number>(0)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Restore active batch from localStorage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('proxylab:activeBatch')
      if (saved) {
        const { id, startedAt } = JSON.parse(saved)
        if (id && startedAt) {
          setBatchId(id)
          startTimeRef.current = startedAt
          // We'll let the normal poll effect pick it up
        }
      }
    } catch {}
  }, [])

  // Persist batchId to localStorage when it changes
  useEffect(() => {
    if (batchId && startTimeRef.current) {
      localStorage.setItem(
        'proxylab:activeBatch',
        JSON.stringify({ id: batchId, startedAt: startTimeRef.current }),
      )
    }
    // Clear when batch is completed/stopped/error
    if (
      batchId &&
      (batchStatus === 'completed' || batchStatus === 'stopped' || batchStatus === 'error')
    ) {
      // Keep it for 60 seconds so user can see final state on refresh, then clear
      const t = setTimeout(() => {
        localStorage.removeItem('proxylab:activeBatch')
      }, 60000)
      return () => clearTimeout(t)
    }
  }, [batchId, batchStatus])

  // Pre-fetch source counts (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const updated = await Promise.all(
        sources.map(async (s) => {
          if (s.count !== undefined || s.error) return s
          try {
            const r = await fetch('/api/sources/fetch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: s.url }),
            })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'failed')
            return { ...s, count: d.count, type: d.type || s.type }
          } catch (e: any) {
            return { ...s, error: e.message || 'failed' }
          }
        }),
      )
      // Only update if the source list hasn't changed
      setSources((curr) => {
        if (curr.length !== updated.length) return curr
        const sameUrls = curr.every((c, i) => c.url === updated[i].url)
        if (!sameUrls) return curr
        return updated
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [sources.map((s) => s.url).join('|')])

  // Elapsed timer
  useEffect(() => {
    if (batchStatus === 'running' && startTimeRef.current) {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 200)
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current)
        elapsedTimerRef.current = null
      }
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    }
  }, [batchStatus])

  // Poll for batch status & results
  const pollBatch = useCallback(async () => {
    if (!batchId) return
    try {
      const statusRes = await fetch(`/api/batches/${batchId}`)
      if (statusRes.status === 404) {
        // Batch was lost (server restart / cleanup) - stop polling
        setBatchStatus('error')
        setStats((curr) => curr || { total: 0, tested: 0, working: 0, failed: 0, pending: 0 })
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
        toast({
          title: '检测任务已失效',
          description: '服务已重启或任务已过期，请重新开始检测。',
          variant: 'destructive',
        })
        return
      }
      const statusData = await statusRes.json()
      const resultsRes = await fetch(
        `/api/batches/${batchId}/results?filter=${statusFilter}&type=${typeFilter}&limit=500&sort=responseTime`,
      )
      const resultsData = await resultsRes.json()
      setBatchStatus(statusData.status)
      setStats(statusData.stats)
      setResults(resultsData.results || [])
      setResultsTotal(resultsData.total || 0)

      // Sync elapsed time from server (handles restored batches correctly)
      if (statusData.createdAt) {
        startTimeRef.current = statusData.createdAt
        const endTime = statusData.completedAt || Date.now()
        setElapsedMs(Math.max(0, endTime - statusData.createdAt))
      }

      if (
        statusData.status === 'completed' ||
        statusData.status === 'stopped' ||
        statusData.status === 'error'
      ) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }
    } catch (e) {
      console.error('poll error', e)
    }
  }, [batchId, statusFilter, typeFilter, toast])

  // Re-poll when filter changes (one-shot)
  useEffect(() => {
    if (batchId) pollBatch()
  }, [statusFilter, typeFilter])

  // Start polling when batch starts
  useEffect(() => {
    if (!batchId) return
    pollBatch() // immediate
    pollTimerRef.current = setInterval(pollBatch, 1000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [batchId, pollBatch])

  const handleStart = async () => {
    if (sources.length === 0) {
      toast({ title: '请至少选择一个代理来源', variant: 'destructive' })
      return
    }
    setStarting(true)
    try {
      const r = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: sources.map((s) => ({ url: s.url, label: s.label, type: s.type })),
          options: { timeoutMs: config.timeoutMs, targetUrl: config.targetUrl },
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'failed')
      setBatchId(d.id)
      setBatchStatus(d.status)
      setStats(d.stats)
      setResults([])
      setResultsTotal(0)
      setElapsedMs(0)
      startTimeRef.current = Date.now()
      toast({
        title: '检测已启动',
        description: `共 ${d.stats.total} 个代理，正在并发检测中...`,
      })
    } catch (e: any) {
      toast({ title: '启动失败', description: e.message, variant: 'destructive' })
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    if (!batchId) return
    try {
      await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })
      toast({ title: '已请求停止' })
      pollBatch()
    } catch (e: any) {
      toast({ title: '停止失败', description: e.message, variant: 'destructive' })
    }
  }

  const totalProxies = sources.reduce((acc, s) => acc + (s.count || 0), 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Animated background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-md opacity-50" />
              <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                ProxyLab
              </h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">
                在线代理批量检测 · HTTP/HTTPS/SOCKS4/SOCKS5
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden md:flex bg-zinc-900/60 text-zinc-400 border-zinc-800">
              <Sparkles className="h-3 w-3 mr-1 text-emerald-400" />
              实时并发 50
            </Badge>
            <a
              href="https://github.com/proxyscrape/free-proxy-list"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs mb-4">
          <Zap className="h-3 w-3" />
          支持多源混合检测 · 一键导出
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
          批量检测免费代理，找到真正可用的那批
        </h2>
        <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          勾选多个代理列表来源（ProxyScrape / TheSpeedX / monosans 等），系统会自动抓取、去重、并发检测，
          最终为你输出一个干净的 <code className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">ip:port</code> 列表，
          与原始格式一致，可直接复制使用。
        </p>
      </section>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-6 pb-10 flex-1 space-y-5">
        {/* Top: sources + config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SourceSelector selected={sources} onChange={setSources} />
          </div>
          <div className="space-y-5">
            <TestConfig config={config} onChange={setConfig} disabled={starting} />
            <Button
              size="lg"
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-emerald-500/20"
              onClick={handleStart}
              disabled={starting || sources.length === 0 || batchStatus === 'running'}
            >
              {starting ? (
                <>启动中...</>
              ) : batchStatus === 'running' ? (
                <>检测中...</>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  开始检测 {totalProxies > 0 ? `(${totalProxies.toLocaleString()} 个代理)` : ''}
                </>
              )}
            </Button>
            {batchStatus === 'running' && (
              <p className="text-center text-xs text-zinc-500">
                可继续浏览页面，结果会自动刷新
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <ProgressPanel
          batchId={batchId}
          status={batchStatus}
          stats={stats}
          elapsedMs={elapsedMs}
          onStop={handleStop}
        />

        {/* Results */}
        <ResultsTable
          results={results}
          total={resultsTotal}
          batchId={batchId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />

        {/* TXT viewer */}
        <TxtViewer
          batchId={batchId}
          workingCount={stats?.working || 0}
          isRunning={batchStatus === 'running'}
        />

        {/* How it works */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <HowItWorks
            step={1}
            title="选择来源"
            desc="从 10+ 内置免费代理列表中勾选，或粘贴自定义 URL。系统会自动识别类型（HTTP/SOCKS4/SOCKS5）。"
          />
          <HowItWorks
            step={2}
            title="并发检测"
            desc="后端使用 50 并发量同时测试所有代理。HTTP 走 GET 请求，HTTPS 走 CONNECT 隧道，SOCKS 用原生协议握手。"
          />
          <HowItWorks
            step={3}
            title="导出结果"
            desc="实时查看响应时间、出口 IP，一键复制或在新标签页打开纯文本格式，与原始 data.txt 一致。"
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 text-center text-xs text-zinc-600">
          <p>
            数据来源：公开的免费代理仓库（proxyscrape / TheSpeedX / monosans / clarketm 等）。
            免费代理质量参差不齐，请勿用于关键场景。
          </p>
          <p className="mt-1">
            所有检测在服务端完成 · 浏览器仅用于展示结果 · 代理数据不会持久化存储
          </p>
        </div>
      </footer>
    </div>
  )
}

function HowItWorks({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center">
          {step}
        </div>
        <ArrowRight className="h-3 w-3 text-zinc-700" />
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  )
}
