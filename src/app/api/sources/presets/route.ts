/**
 * Curated list of free proxy sources.
 * Update freq info is based on each repo's GitHub Actions schedule (where applicable).
 */
import { NextResponse } from 'next/server'

interface PresetSource {
  id: string
  label: string
  url: string
  type: 'http' | 'https' | 'socks4' | 'socks5' | 'unknown'
  description: string
  updateFreq: string
  approxCount?: number
}

const PRESETS: PresetSource[] = [
  // === ProxyScrape ===
  {
    id: 'proxyscrape-all',
    label: 'ProxyScrape — All',
    url: 'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt',
    type: 'unknown',
    description: 'All proxy types from ProxyScrape. Format: protocol://ip:port — types are auto-detected (HTTP/HTTPS/SOCKS4/SOCKS5).',
    updateFreq: '每 1 分钟',
    approxCount: 2000,
  },
  // === TheSpeedX (updates every 6h) ===
  {
    id: 'TheSpeedX-http',
    label: 'TheSpeedX/PROXY-List — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/http.txt',
    type: 'http',
    description: 'HTTP proxies from TheSpeedX/PROXY-List (master branch).',
    updateFreq: '每 6 小时',
    approxCount: 2300,
  },
  {
    id: 'TheSpeedX-socks4',
    label: 'TheSpeedX/PROXY-List — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks4.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from TheSpeedX/PROXY-List (master branch).',
    updateFreq: '每 6 小时',
    approxCount: 2400,
  },
  {
    id: 'TheSpeedX-socks5',
    label: 'TheSpeedX/PROXY-List — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from TheSpeedX/PROXY-List (master branch).',
    updateFreq: '每 6 小时',
    approxCount: 1900,
  },
  // === proxifly (updates hourly) ===
  {
    id: 'proxifly-http',
    label: 'proxifly/free-proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.txt',
    type: 'http',
    description: 'HTTP proxies from proxifly/free-proxy-list. Format: protocol://ip:port.',
    updateFreq: '每 1 小时',
    approxCount: 1100,
  },
  {
    id: 'proxifly-https',
    label: 'proxifly/free-proxy-list — HTTPS',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/https/data.txt',
    type: 'https',
    description: 'HTTPS proxies from proxifly/free-proxy-list.',
    updateFreq: '每 1 小时',
    approxCount: 1300,
  },
  {
    id: 'proxifly-socks4',
    label: 'proxifly/free-proxy-list — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks4/data.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from proxifly/free-proxy-list.',
    updateFreq: '每 1 小时',
    approxCount: 700,
  },
  {
    id: 'proxifly-socks5',
    label: 'proxifly/free-proxy-list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from proxifly/free-proxy-list.',
    updateFreq: '每 1 小时',
    approxCount: 350,
  },
  // === monosans (updates every 10min) ===
  {
    id: 'monosans-http',
    label: 'monosans/proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/http.txt',
    type: 'http',
    description: 'HTTP proxies from monosans/proxy-list (high-quality, regularly verified).',
    updateFreq: '每 10 分钟',
    approxCount: 7,
  },
  {
    id: 'monosans-socks4',
    label: 'monosans/proxy-list — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks4.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from monosans/proxy-list.',
    updateFreq: '每 10 分钟',
    approxCount: 27,
  },
  {
    id: 'monosans-socks5',
    label: 'monosans/proxy-list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from monosans/proxy-list.',
    updateFreq: '每 10 分钟',
    approxCount: 7,
  },
  // === MuRongPIG (updates daily, very large lists) ===
  {
    id: 'MuRongPIG-http',
    label: 'MuRongPIG/Proxy-master — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/http.txt',
    type: 'http',
    description: 'Large HTTP proxy list from MuRongPIG/Proxy-master. ⚠️ 10万+ 条，检测耗时较长。',
    updateFreq: '每天',
    approxCount: 100000,
  },
  {
    id: 'MuRongPIG-socks4',
    label: 'MuRongPIG/Proxy-master — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/socks4.txt',
    type: 'socks4',
    description: 'Large SOCKS4 list from MuRongPIG/Proxy-master. ⚠️ 9万+ 条，检测耗时较长。',
    updateFreq: '每天',
    approxCount: 89000,
  },
  {
    id: 'MuRongPIG-socks5',
    label: 'MuRongPIG/Proxy-master — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/MuRongPIG/Proxy-master@main/socks5.txt',
    type: 'socks5',
    description: 'Large SOCKS5 list from MuRongPIG/Proxy-master. ⚠️ 10万+ 条，检测耗时较长。',
    updateFreq: '每天',
    approxCount: 100000,
  },
  // === hookzof (socks5 only, updates hourly) ===
  {
    id: 'hookzof-socks5',
    label: 'hookzof/socks5_list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/hookzof/socks5_list@master/proxy.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from hookzof/socks5_list. Format: ip:port.',
    updateFreq: '每 1 小时',
    approxCount: 390,
  },
  // === clarketm (updates daily) ===
  {
    id: 'clarketm-http',
    label: 'clarketm/proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/clarketm/proxy-list@master/proxy-list-raw.txt',
    type: 'http',
    description: 'Raw HTTP proxy list from clarketm. Format: ip:port (one per line).',
    updateFreq: '每天',
    approxCount: 400,
  },
  // === roosterkid (updates daily) ===
  {
    id: 'roosterkid-https',
    label: 'roosterkid/openproxylist — HTTPS',
    url: 'https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/HTTPS_RAW.txt',
    type: 'https',
    description: 'HTTPS proxies from roosterkid/openproxylist.',
    updateFreq: '每天',
    approxCount: 76,
  },
  // === ShiftyTR (updates occasionally) ===
  {
    id: 'shiftyproxy-http',
    label: 'ShiftyTR/Proxy-List — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/http.txt',
    type: 'http',
    description: 'HTTP proxies from ShiftyTR/Proxy-List.',
    updateFreq: '不定期',
    approxCount: 40,
  },
  {
    id: 'shiftyproxy-socks5',
    label: 'ShiftyTR/Proxy-List — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from ShiftyTR/Proxy-List.',
    updateFreq: '不定期',
    approxCount: 280,
  },
]

export async function GET() {
  return NextResponse.json({ presets: PRESETS })
}
