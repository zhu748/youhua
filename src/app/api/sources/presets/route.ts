/**
 * Curated list of free proxy sources.
 *
 * Verified 2026-06-29 via commit history:
 * - Active sources: proxyscrape, TheSpeedX, proxifly, monosans, hookzof, roosterkid
 * - DEAD sources removed: MuRongPIG (last commit 2025-08), clarketm (last commit 2023-03),
 *   ShiftyTR (last commit 2023-08)
 *
 * Update frequencies are based on actual commit timestamps, not README claims.
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
  // === ProxyScrape — server-side cron, every 5 min (verified via commit timestamps) ===
  {
    id: 'proxyscrape-all',
    label: 'ProxyScrape — All',
    url: 'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt',
    type: 'unknown',
    description: 'All proxy types from ProxyScrape. Format: protocol://ip:port — types are auto-detected (HTTP/HTTPS/SOCKS4/SOCKS5).',
    updateFreq: '每 5 分钟',
    approxCount: 2000,
  },
  // === TheSpeedX — GitHub Actions cron, every 3 hours (workflow file confirms cron: '0 */3 * * *') ===
  {
    id: 'TheSpeedX-http',
    label: 'TheSpeedX/PROXY-List — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/http.txt',
    type: 'http',
    description: 'HTTP proxies from TheSpeedX/PROXY-List.',
    updateFreq: '每 3 小时',
    approxCount: 2300,
  },
  {
    id: 'TheSpeedX-socks4',
    label: 'TheSpeedX/PROXY-List — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks4.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from TheSpeedX/PROXY-List.',
    updateFreq: '每 3 小时',
    approxCount: 2400,
  },
  {
    id: 'TheSpeedX-socks5',
    label: 'TheSpeedX/PROXY-List — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from TheSpeedX/PROXY-List.',
    updateFreq: '每 3 小时',
    approxCount: 1900,
  },
  // === proxifly — verified active, commits every ~1 hour (README claims 5 min but commit history shows ~1h) ===
  {
    id: 'proxifly-http',
    label: 'proxifly/free-proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.txt',
    type: 'http',
    description: 'HTTP proxies from proxifly/free-proxy-list. Format: protocol://ip:port.',
    updateFreq: '约每小时',
    approxCount: 1100,
  },
  {
    id: 'proxifly-https',
    label: 'proxifly/free-proxy-list — HTTPS',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/https/data.txt',
    type: 'https',
    description: 'HTTPS proxies from proxifly/free-proxy-list.',
    updateFreq: '约每小时',
    approxCount: 1300,
  },
  {
    id: 'proxifly-socks4',
    label: 'proxifly/free-proxy-list — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks4/data.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from proxifly/free-proxy-list.',
    updateFreq: '约每小时',
    approxCount: 700,
  },
  {
    id: 'proxifly-socks5',
    label: 'proxifly/free-proxy-list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from proxifly/free-proxy-list.',
    updateFreq: '约每小时',
    approxCount: 350,
  },
  // === monosans — README says "checked every hour"; uses force-push so only 2 commits visible ===
  {
    id: 'monosans-http',
    label: 'monosans/proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/http.txt',
    type: 'http',
    description: 'Verified HTTP proxies from monosans/proxy-list (high quality, checked hourly).',
    updateFreq: '每小时',
    approxCount: 8,
  },
  {
    id: 'monosans-socks4',
    label: 'monosans/proxy-list — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks4.txt',
    type: 'socks4',
    description: 'Verified SOCKS4 proxies from monosans/proxy-list.',
    updateFreq: '每小时',
    approxCount: 28,
  },
  {
    id: 'monosans-socks5',
    label: 'monosans/proxy-list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks5.txt',
    type: 'socks5',
    description: 'Verified SOCKS5 proxies from monosans/proxy-list.',
    updateFreq: '每小时',
    approxCount: 40,
  },
  // === hookzof — verified active, commits every ~1 hour ===
  {
    id: 'hookzof-socks5',
    label: 'hookzof/socks5_list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/hookzof/socks5_list@master/proxy.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from hookzof/socks5_list. Format: ip:port.',
    updateFreq: '约每小时',
    approxCount: 390,
  },
  // === roosterkid — verified active, batch commits daily at 18:00 UTC ===
  {
    id: 'roosterkid-https',
    label: 'roosterkid/openproxylist — HTTPS',
    url: 'https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/HTTPS_RAW.txt',
    type: 'https',
    description: 'HTTPS proxies from roosterkid/openproxylist. README claims "every minute" but actual commits are daily batches.',
    updateFreq: '每天',
    approxCount: 77,
  },
]

export async function GET() {
  return NextResponse.json({ presets: PRESETS })
}
