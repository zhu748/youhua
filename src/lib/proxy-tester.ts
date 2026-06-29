/**
 * Proxy testing library
 * Supports HTTP, HTTPS, SOCKS4, SOCKS5 proxies
 */
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import net from 'node:net'
import { SocksClient } from 'socks'

export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5' | 'unknown'

export interface ProxyInfo {
  host: string
  port: number
  type: ProxyType
  sourceUrl?: string
}

export interface ProxyTestResult {
  proxy: ProxyInfo
  status: 'working' | 'failed'
  responseTime?: number // ms
  error?: string
  testedAt: number
  exitIp?: string
}

export interface TestOptions {
  timeoutMs: number
  targetUrl: string
}

const DEFAULT_TARGET = 'http://www.google.com/generate_204'
const DEFAULT_TIMEOUT = 5000

/**
 * Parse proxy list text content into structured proxies.
 * Each line can be:
 *  - ip:port
 *  - ip:port:type
 *  - protocol://ip:port
 */
export function parseProxyList(
  text: string,
  fallbackType: ProxyType = 'http',
  sourceUrl?: string,
): ProxyInfo[] {
  const lines = text.split(/\r?\n/)
  const proxies: ProxyInfo[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    // protocol://ip:port
    const protoMatch = line.match(/^(https?|socks[45]?):\/\/([^:\/]+):(\d+)$/i)
    if (protoMatch) {
      const proto = protoMatch[1].toLowerCase()
      const type: ProxyType =
        proto === 'socks' || proto === 'socks5'
          ? 'socks5'
          : proto === 'socks4'
            ? 'socks4'
            : (proto as ProxyType)
      proxies.push({
        host: protoMatch[2],
        port: parseInt(protoMatch[3], 10),
        type,
        sourceUrl,
      })
      continue
    }
    // ip:port or ip:port:type
    const parts = line.split(':')
    if (parts.length < 2) continue
    const host = parts[0].trim()
    const portStr = parts[1].trim()
    const port = parseInt(portStr, 10)
    if (!host || isNaN(port) || port < 1 || port > 65535) continue
    let type: ProxyType = fallbackType
    if (parts.length >= 3) {
      const t = parts[2].trim().toLowerCase()
      if (t === 'http' || t === 'https' || t === 'socks4' || t === 'socks5') {
        type = t
      }
    }
    proxies.push({ host, port, type, sourceUrl })
  }
  return proxies
}

/**
 * Try to detect proxy type from URL path
 */
export function detectTypeFromUrl(url: string): ProxyType {
  const u = url.toLowerCase()
  if (u.includes('/socks5')) return 'socks5'
  if (u.includes('/socks4')) return 'socks4'
  if (u.includes('/https')) return 'https'
  if (u.includes('/http')) return 'http'
  return 'unknown'
}

/**
 * Fetch & parse proxies from a remote URL.
 */
export async function fetchProxiesFromUrl(
  url: string,
): Promise<{ proxies: ProxyInfo[]; count: number; type: ProxyType }> {
  const detectedType = detectTypeFromUrl(url)
  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 ProxyChecker/1.0' },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch source: HTTP ${response.status}`)
  }
  const text = await response.text()
  const fallbackType: ProxyType =
    detectedType === 'unknown' ? 'http' : detectedType
  const proxies = parseProxyList(text, fallbackType, url)
  return { proxies, count: proxies.length, type: detectedType }
}

/**
 * Test a single HTTP proxy: send GET request with absolute URL through proxy.
 */
function testHttpProxy(
  host: string,
  port: number,
  targetUrl: string,
  timeoutMs: number,
): Promise<{ exitIp?: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl)
    const req = http.request({
      host,
      port,
      method: 'GET',
      path: targetUrl,
      headers: {
        Host: target.host,
        'User-Agent': 'Mozilla/5.0 ProxyChecker/1.0',
      },
      timeout: timeoutMs,
    })
    let settled = false
    const onData = (chunk: Buffer) => {
      // try to extract IP from response body if it's JSON like {"origin":"..."}
      // for httpbin.org/ip
    }
    req.on('response', (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        if (settled) return
        settled = true
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          const body = Buffer.concat(chunks).toString('utf8')
          let exitIp: string | undefined
          const m = body.match(/"origin"\s*:\s*"([^"]+)"/i)
          if (m) exitIp = m[1]
          resolve({ exitIp })
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
      res.on('error', () => {
        if (settled) return
        settled = true
        reject(new Error('response error'))
      })
    })
    req.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })
    req.on('timeout', () => {
      if (settled) return
      settled = true
      req.destroy(new Error('timeout'))
      reject(new Error('timeout'))
    })
    req.end()
  })
}

/**
 * Test an HTTPS proxy (i.e., proxy that supports CONNECT for HTTPS targets).
 * Actually "HTTPS proxy" in proxyscrape means it supports HTTPS traffic - we test via CONNECT.
 */
function testHttpsProxyViaConnect(
  host: string,
  port: number,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
): Promise<{ exitIp?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host,
      port,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      headers: { Host: `${targetHost}:${targetPort}` },
      timeout: timeoutMs,
    })
    let settled = false
    req.on('connect', (_res, socket) => {
      if (settled) return
      settled = true
      // CONNECT succeeded - close socket immediately, we don't need to do TLS handshake
      // (we just want to verify the proxy can establish the tunnel)
      socket.destroy()
      resolve({})
    })
    req.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })
    req.on('timeout', () => {
      if (settled) return
      settled = true
      req.destroy(new Error('timeout'))
      reject(new Error('timeout'))
    })
    req.end()
  })
}

/**
 * Test a SOCKS4/SOCKS5 proxy by establishing a connection to target through it.
 */
async function testSocksProxy(
  type: 'socks4' | 'socks5',
  host: string,
  port: number,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
): Promise<{ exitIp?: string }> {
  const info = await SocksClient.createConnection({
    proxy: {
      host,
      port,
      type: type === 'socks4' ? 4 : 5,
    },
    command: 'connect',
    destination: {
      host: targetHost,
      port: targetPort,
    },
    timeout: timeoutMs,
  })
  // Close the socket immediately - we just verified connectivity
  info.socket.destroy()
  return {}
}

/**
 * Main entry: test a single proxy.
 */
export async function testProxy(
  proxy: ProxyInfo,
  options: TestOptions,
): Promise<ProxyTestResult> {
  const target = new URL(options.targetUrl ?? DEFAULT_TARGET)
  const targetHost = target.hostname
  const targetPort = parseInt(target.port, 10) || (target.protocol === 'https:' ? 443 : 80)
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT
  const testedAt = Date.now()
  const start = Date.now()

  try {
    let result: { exitIp?: string }
    switch (proxy.type) {
      case 'http':
        // If target is HTTPS, we need CONNECT; otherwise plain HTTP GET
        if (target.protocol === 'https:') {
          result = await testHttpProxy(host, port, `http://httpbin.org/ip`, timeoutMs).catch(
            async () => {
              // fallback to CONNECT
              return await testHttpsProxyViaConnect(
                proxy.host,
                proxy.port,
                targetHost,
                targetPort,
                timeoutMs,
              )
            },
          )
        } else {
          result = await testHttpProxy(proxy.host, proxy.port, options.targetUrl, timeoutMs)
        }
        break
      case 'https':
        result = await testHttpsProxyViaConnect(
          proxy.host,
          proxy.port,
          targetHost,
          targetPort,
          timeoutMs,
        )
        break
      case 'socks4':
        result = await testSocksProxy(
          'socks4',
          proxy.host,
          proxy.port,
          targetHost,
          targetPort,
          timeoutMs,
        )
        break
      case 'socks5':
        result = await testSocksProxy(
          'socks5',
          proxy.host,
          proxy.port,
          targetHost,
          targetPort,
          timeoutMs,
        )
        break
      case 'unknown':
      default:
        // try http first, then socks5
        try {
          result = await testHttpProxy(proxy.host, proxy.port, options.targetUrl, timeoutMs)
        } catch {
          result = await testSocksProxy(
            'socks5',
            proxy.host,
            proxy.port,
            targetHost,
            targetPort,
            timeoutMs,
          )
        }
        break
    }
    return {
      proxy,
      status: 'working',
      responseTime: Date.now() - start,
      testedAt,
      exitIp: result.exitIp,
    }
  } catch (err: any) {
    return {
      proxy,
      status: 'failed',
      responseTime: Date.now() - start,
      error: err?.message || String(err),
      testedAt,
    }
  }
}

/**
 * Resolve a hostname to IP (no-op if already IP).
 */
export function isIpAddress(s: string): boolean {
  return net.isIPv4(s) || net.isIPv6(s)
}
