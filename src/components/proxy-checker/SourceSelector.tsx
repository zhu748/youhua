'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export interface PresetSource {
  id: string
  label: string
  url: string
  type: 'http' | 'https' | 'socks4' | 'socks5' | 'unknown'
  description: string
}

export interface SelectedSource {
  url: string
  label: string
  type: string
  count?: number
  error?: string
  loading?: boolean
}

interface Props {
  selected: SelectedSource[]
  onChange: (next: SelectedSource[]) => void
}

const TYPE_COLOR: Record<string, string> = {
  http: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  https: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  socks4: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  socks5: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  unknown: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
}

export function SourceSelector({ selected, onChange }: Props) {
  const [presets, setPresets] = useState<PresetSource[]>([])
  const [loadingPresets, setLoadingPresets] = useState(true)
  const [customUrl, setCustomUrl] = useState('')
  const [customType, setCustomType] = useState<'http' | 'https' | 'socks4' | 'socks5' | 'unknown'>('http')

  useEffect(() => {
    fetch('/api/sources/presets')
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .finally(() => setLoadingPresets(false))
  }, [])

  const togglePreset = useCallback(
    (preset: PresetSource) => {
      const exists = selected.find((s) => s.url === preset.url)
      if (exists) {
        onChange(selected.filter((s) => s.url !== preset.url))
      } else {
        onChange([
          ...selected,
          { url: preset.url, label: preset.label, type: preset.type },
        ])
      }
    },
    [selected, onChange],
  )

  const addCustom = useCallback(() => {
    const url = customUrl.trim()
    if (!url) return
    try {
      new URL(url)
    } catch {
      return
    }
    if (selected.find((s) => s.url === url)) return
    onChange([
      ...selected,
      { url, label: url.split('/').slice(-2).join('/') || url, type: customType },
    ])
    setCustomUrl('')
  }, [customUrl, customType, selected, onChange])

  const removeSource = useCallback(
    (url: string) => {
      onChange(selected.filter((s) => s.url !== url))
    },
    [selected, onChange],
  )

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Globe className="h-5 w-5 text-emerald-400" />
          代理来源
        </CardTitle>
        <CardDescription className="text-zinc-400">
          勾选下面的预设源，或添加自定义代理列表 URL（每行一个 <code className="text-emerald-300">ip:port</code>）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Presets grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-zinc-500">
              预设源 ({presets.length})
            </Label>
            {loadingPresets && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
          </div>
          <ScrollArea className="h-72 rounded-md border border-zinc-800 bg-zinc-950/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
              {presets.map((p) => {
                const checked = !!selected.find((s) => s.url === p.url)
                const sel = selected.find((s) => s.url === p.url)
                return (
                  <label
                    key={p.id}
                    className={`group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      checked
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePreset(p)}
                      className="mt-1 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {p.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase ${TYPE_COLOR[p.type]}`}
                        >
                          {p.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                        {p.description}
                      </p>
                      <code className="mt-1 block text-[10px] text-zinc-600 truncate">
                        {p.url}
                      </code>
                      {sel?.loading && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                          <Loader2 className="h-3 w-3 animate-spin" /> 加载中...
                        </div>
                      )}
                      {sel?.count !== undefined && !sel.error && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> {sel.count} 个代理
                        </div>
                      )}
                      {sel?.error && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400">
                          <AlertCircle className="h-3 w-3" /> {sel.error}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Custom URL */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-zinc-500">
            添加自定义 URL
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/proxies.txt"
              className="flex-1 bg-zinc-950/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustom()
              }}
            />
            <Select value={customType} onValueChange={(v: any) => setCustomType(v)}>
              <SelectTrigger className="w-full sm:w-32 bg-zinc-950/60 border-zinc-800 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="https">HTTPS</SelectItem>
                <SelectItem value="socks4">SOCKS4</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
                <SelectItem value="unknown">Auto</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={addCustom}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> 添加
            </Button>
          </div>
        </div>

        {/* Selected sources list */}
        {selected.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-zinc-500">
              已选来源 ({selected.length})
            </Label>
            <div className="space-y-1.5">
              {selected.map((s) => (
                <div
                  key={s.url}
                  className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                >
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase shrink-0 ${TYPE_COLOR[s.type] || TYPE_COLOR.unknown}`}
                  >
                    {s.type}
                  </Badge>
                  <span className="flex-1 text-xs text-zinc-300 truncate">{s.label}</span>
                  {s.count !== undefined && (
                    <span className="text-xs text-emerald-400 shrink-0">{s.count}</span>
                  )}
                  {s.loading && (
                    <Loader2 className="h-3 w-3 animate-spin text-zinc-500 shrink-0" />
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                    onClick={() => removeSource(s.url)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
