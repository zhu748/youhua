'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RefreshCw, FileText, Copy, ExternalLink, Check } from 'lucide-react'

interface Props {
  batchId: string | null
  workingCount: number
  isRunning: boolean
}

export function TxtViewer({ batchId, workingCount, isRunning }: Props) {
  const [content, setContent] = useState('')
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null)
  const [fetchedWorkingCount, setFetchedWorkingCount] = useState<number>(-1)
  const [includeScheme, setIncludeScheme] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [copied, setCopied] = useState(false)
  const [manualRefresh, setManualRefresh] = useState(0)
  const lastFetchRef = useRef<number>(0)

  const txtUrl = useMemo(() => {
    if (!batchId) return null
    const params = new URLSearchParams()
    params.set('format', 'txt')
    if (includeScheme) params.set('includeScheme', '1')
    if (typeFilter !== 'all') params.set('type', typeFilter)
    return `/api/batches/${batchId}/txt?${params.toString()}`
  }, [batchId, includeScheme, typeFilter])

  // Refetch when:
  //  - URL changes
  //  - workingCount changes (results updated)
  //  - batch stops running (final fetch)
  //  - manual refresh triggered
  // Throttled to at most once per 1.5s
  useEffect(() => {
    if (!txtUrl) return
    const now = Date.now()
    if (now - lastFetchRef.current < 1500 && fetchedWorkingCount === workingCount) {
      return
    }
    lastFetchRef.current = now
    let cancelled = false
    fetch(txtUrl)
      .then((r) => r.text())
      .then((t) => {
        if (cancelled) return
        setContent(t)
        setFetchedUrl(txtUrl)
        setFetchedWorkingCount(workingCount)
      })
      .catch((e) => {
        if (cancelled) return
        setContent(`# Error: ${e.message}`)
        setFetchedUrl(txtUrl)
        setFetchedWorkingCount(workingCount)
      })
    return () => {
      cancelled = true
    }
  }, [txtUrl, workingCount, isRunning, manualRefresh])

  const isLoading = !!txtUrl && fetchedUrl !== txtUrl
  const displayContent = !txtUrl
    ? (batchId ? '暂无有效代理' : '尚未开始检测')
    : fetchedUrl === txtUrl
      ? content
      : '加载中...'

  const handleCopy = async () => {
    const text = fetchedUrl === txtUrl ? content : ''
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleOpenInNewTab = () => {
    if (txtUrl) window.open(txtUrl, '_blank')
  }

  const handleRefresh = () => setManualRefresh((n) => n + 1)

  const lineCount = useMemo(() => {
    if (fetchedUrl !== txtUrl) return 0
    return content.split('\n').filter((l) => l && !l.startsWith('#')).length
  }, [content, fetchedUrl, txtUrl])

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <FileText className="h-5 w-5 text-emerald-400" />
            TXT 输出
            <Badge variant="outline" className="ml-1 bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              {lineCount} 行
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-2">
              <Switch
                id="scheme"
                checked={includeScheme}
                onCheckedChange={setIncludeScheme}
              />
              <Label htmlFor="scheme" className="text-xs text-zinc-400 cursor-pointer">
                含协议
              </Label>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-28 h-8 bg-zinc-950/60 border-zinc-800 text-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
                <SelectItem value="socks4">SOCKS4</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleRefresh}
              disabled={!batchId}
              title="刷新"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleCopy}
              disabled={!content || fetchedUrl !== txtUrl}
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleOpenInNewTab}
              disabled={!batchId}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> 新标签页
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/40">
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {txtUrl || '—'}
            </span>
            {isLoading && <span className="text-[10px] text-zinc-500">加载中...</span>}
          </div>
          <ScrollArea className="h-[300px]">
            <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
              {displayContent}
            </pre>
          </ScrollArea>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600 leading-relaxed">
          点击"新标签页"可在浏览器中查看纯文本页面，与原始代理列表格式一致。也可右键该链接直接保存为 .txt 文件。
        </p>
      </CardContent>
    </Card>
  )
}
