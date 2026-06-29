/**
 * Curated list of free proxy sources.
 */
import { NextResponse } from 'next/server'

interface PresetSource {
  id: string
  label: string
  url: string
  type: 'http' | 'https' | 'socks4' | 'socks5' | 'unknown'
  description: string
}

const PRESETS: PresetSource[] = [
  {
    id: 'proxyscrape-all',
    label: 'ProxyScrape — All',
    url: 'https://cdn.jsdelivr.net/gh/proxyscrape/free-proxy-list@main/proxies/all/data.txt',
    type: 'unknown',
    description: 'All proxy types from ProxyScrape. Format: protocol://ip:port — types are auto-detected (HTTP/HTTPS/SOCKS4/SOCKS5).',
  },
  {
    id: 'TheSpeedX-http',
    label: 'TheSpeedX/PROXY-List — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/http.txt',
    type: 'http',
    description: 'HTTP proxies from TheSpeedX/PROXY-List (master branch).',
  },
  {
    id: 'TheSpeedX-socks4',
    label: 'TheSpeedX/PROXY-List — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks4.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from TheSpeedX/PROXY-List (master branch).',
  },
  {
    id: 'TheSpeedX-socks5',
    label: 'TheSpeedX/PROXY-List — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/TheSpeedX/PROXY-List@master/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from TheSpeedX/PROXY-List (master branch).',
  },
  {
    id: 'monosans-http',
    label: 'monosans/proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/http.txt',
    type: 'http',
    description: 'HTTP proxies from monosans/proxy-list.',
  },
  {
    id: 'monosans-socks4',
    label: 'monosans/proxy-list — SOCKS4',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks4.txt',
    type: 'socks4',
    description: 'SOCKS4 proxies from monosans/proxy-list.',
  },
  {
    id: 'monosans-socks5',
    label: 'monosans/proxy-list — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/monosans/proxy-list@main/proxies/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from monosans/proxy-list.',
  },
  {
    id: 'clarketm-http',
    label: 'clarketm/proxy-list — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/clarketm/proxy-list@master/proxy-list-raw.txt',
    type: 'http',
    description: 'Raw HTTP proxy list from clarketm. Format: ip:port (one per line).',
  },
  {
    id: 'roosterkid-https',
    label: 'roosterkid/openproxylist — HTTPS',
    url: 'https://cdn.jsdelivr.net/gh/roosterkid/openproxylist@main/HTTPS_RAW.txt',
    type: 'https',
    description: 'HTTPS proxies from roosterkid/openproxylist.',
  },
  {
    id: 'shiftyproxy-http',
    label: 'ShiftyTR/Proxy-List — HTTP',
    url: 'https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/http.txt',
    type: 'http',
    description: 'HTTP proxies from ShiftyTR/Proxy-List.',
  },
  {
    id: 'shiftyproxy-socks5',
    label: 'ShiftyTR/Proxy-List — SOCKS5',
    url: 'https://cdn.jsdelivr.net/gh/ShiftyTR/Proxy-List@master/socks5.txt',
    type: 'socks5',
    description: 'SOCKS5 proxies from ShiftyTR/Proxy-List.',
  },
]

export async function GET() {
  return NextResponse.json({ presets: PRESETS })
}
