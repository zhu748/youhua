'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2, XCircle, Search, Copy, Download, ListFilter,
} from 'lucide-react'

export interface ResultItem {
  proxy: { host: string; port: number; type: string; sourceUrl?: string }
  status: 'working' | 'failed'
  responseTime?: number
  error?: string
  testedAt: number
  exitIp?: string
}

interface Props {
  results: ResultItem[]
  total: number
  batchId: string | null
  statusFilter: 'all' | 'working' | 'failed'
  onStatusFilterChange: (v: 'all' | 'working' | 'failed') => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
}

const TYPE_COLOR: Record<string, string> = {
  http: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  https: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  socks4: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  socks5: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  unknown: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
}

function formatTime(ms?: number) {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function timeColor(ms?: number) {
  if (ms === undefined) return 'text-zinc-600'
  if (ms < 1000) return 'text-emerald-400'
  if (ms < 3000) return 'text-cyan-300'
  if (ms < 5000) return 'text-amber-300'
  return 'text-rose-400'
}

export function ResultsTable({
  results, total, batchId,
  statusFilter, onStatusFilterChange,
  typeFilter, onTypeFilterChange,
}: Props) {
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return results
    return results.filter((r) =>
      r.proxy.host.includes(q) ||
      String(r.proxy.port).includes(q) ||
      r.proxy.type.toLowerCase().includes(q) ||
      (r.exitIp || '').includes(q),
    )
  }, [results, search])

  const handleCopyAll = async () => {
    const lines = results
      .filter((r) => r.status === 'working')
      .map((r) => `${r.proxy.host}:${r.proxy.port}`)
      .join('\n')
    await navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownloadTxt = () => {
    if (!batchId) return
    window.open(`/api/batches/${batchId}/txt?format=txt&includeScheme=0`, '_blank')
  }

  const handleDownloadJson = () => {
    if (!batchId) return
    window.open(`/api/batches/${batchId}/txt?format=json`, '_blank')
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <ListFilter className="h-5 w-5 text-emerald-400" />
            检测结果
            <Badge variant="outline" className="ml-1 bg-zinc-800/60 text-zinc-400 border-zinc-700">
              {filtered.length} / {total}
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleCopyAll}
              disabled={!results.some((r) => r.status === 'working')}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              {copied ? '已复制!' : '复制有效'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleDownloadTxt}
              disabled={!batchId}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> TXT
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-emerald-300"
              onClick={handleDownloadJson}
              disabled={!batchId}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2">
          <Select value={statusFilter} onValueChange={(v: any) => onStatusFilterChange(v)}>
            <SelectTrigger className="w-full md:w-36 h-9 bg-zinc-950/60 border-zinc-800 text-zinc-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="working">仅有效</SelectItem>
              <SelectItem value="failed">仅失败</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger className="w-full md:w-36 h-9 bg-zinc-950/60 border-zinc-800 text-zinc-200 text-xs">
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
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 IP / 端口 / 类型..."
              className="pl-8 h-9 bg-zinc-950/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40">
          <ScrollArea className="h-[420px]">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs h-9">状态</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">代理地址</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">类型</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">响应时间</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">出口 IP</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">来源</TableHead>
                  <TableHead className="text-zinc-500 text-xs h-9">错误</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow className="border-zinc-800">
                    <TableCell colSpan={7} className="text-center text-zinc-600 py-12">
                      暂无结果
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r, i) => (
                  <TableRow
                    key={`${r.proxy.host}:${r.proxy.port}:${r.proxy.type}:${i}`}
                    className="border-zinc-800/60 hover:bg-zinc-900/50"
                  >
                    <TableCell>
                      {r.status === 'working' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-200">
                      {r.proxy.host}:{r.proxy.port}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${TYPE_COLOR[r.proxy.type] || TYPE_COLOR.unknown}`}
                      >
                        {r.proxy.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-mono text-xs ${timeColor(r.responseTime)}`}>
                      {formatTime(r.responseTime)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {r.exitIp || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600 max-w-[160px] truncate" title={r.proxy.sourceUrl}>
                      {r.proxy.sourceUrl
                        ? r.proxy.sourceUrl.split('/').slice(-2).join('/')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-rose-400/80 max-w-[200px] truncate" title={r.error}>
                      {r.error || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
