'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings2, Clock, Target } from 'lucide-react'

export interface TestConfigType {
  timeoutMs: number
  targetUrl: string
}

interface Props {
  config: TestConfigType
  onChange: (next: TestConfigType) => void
  disabled?: boolean
}

const TARGET_PRESETS = [
  { url: 'http://www.google.com/generate_204', label: 'Google 204 (HTTP)' },
  { url: 'http://httpbin.org/ip', label: 'httpbin.org/ip (HTTP)' },
  { url: 'http://www.example.com', label: 'example.com (HTTP)' },
  { url: 'http://detectportal.firefox.com/success.txt', label: 'Firefox Captive Portal (HTTP)' },
]

export function TestConfig({ config, onChange, disabled }: Props) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <Settings2 className="h-5 w-5 text-emerald-400" />
          检测参数
        </CardTitle>
        <CardDescription className="text-zinc-400">
          调整超时时间和测试目标 URL，影响检测速度和准确度。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Timeout slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" /> 超时时间
            </Label>
            <span className="text-sm font-mono text-emerald-400">{config.timeoutMs}ms</span>
          </div>
          <Slider
            value={[config.timeoutMs]}
            min={1000}
            max={15000}
            step={500}
            disabled={disabled}
            onValueChange={(v) => onChange({ ...config, timeoutMs: v[0] })}
            className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>1s (严格)</span>
            <span>15s (宽松)</span>
          </div>
        </div>

        {/* Target URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Target className="h-3.5 w-3.5" /> 测试目标 URL
          </Label>
          <Input
            value={config.targetUrl}
            onChange={(e) => onChange({ ...config, targetUrl: e.target.value })}
            disabled={disabled}
            className="bg-zinc-950/60 border-zinc-800 text-zinc-200 font-mono text-xs"
            placeholder="http://www.google.com/generate_204"
          />
          <div className="flex flex-wrap gap-1.5">
            {TARGET_PRESETS.map((p) => (
              <button
                key={p.url}
                onClick={() => onChange({ ...config, targetUrl: p.url })}
                disabled={disabled}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  config.targetUrl === p.url
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            目标 URL 用于验证代理是否可用。HTTP 目标兼容性最好（HTTPS 代理将通过 CONNECT 隧道测试）。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
