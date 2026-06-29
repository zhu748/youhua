---
title: ProxyLab
emoji: 🛡️
colorFrom: emerald
colorTo: cyan
sdk: docker
app_port: 3000
pinned: false
license: mit
short_description: 在线代理批量检测 - HTTP/HTTPS/SOCKS4/SOCKS5
---

# ProxyLab — 在线代理批量检测

一个完整的代理批量检测网站，支持从多个免费代理列表源抓取、去重、并发检测，并输出与原始格式一致的纯文本有效代理列表。

## ✨ 核心功能

- **多源批量检测**：内置 13 个免费代理源（ProxyScrape、TheSpeedX、proxifly、monosans、hookzof、roosterkid），可多选混合检测
- **全协议支持**：HTTP / HTTPS / SOCKS4 / SOCKS5
- **并发检测引擎**：50 并发量后台测试，可调超时（1-15s）和测试目标 URL
- **实时进度面板**：进度条 + 有效/失败/队列/用时四项统计，每秒刷新
- **结果表格**：状态、代理地址、类型、响应时间（带颜色）、出口 IP、来源、错误信息
- **TXT 输出**：与原始 data.txt 一致的 `ip:port` 格式
- **定时任务**：默认每小时自动检测一次（可调 5min - 6h），结果持久化到 SQLite
- **稳定 TXT 链接**：`/api/latest/txt` 永远返回最近一次有效代理，与 proxyscrape 列表用法一致

## 🔗 核心 API

| URL | 用途 |
|-----|------|
| `/` | 主页（Web UI） |
| `/api/latest/txt` | **稳定 TXT 链接**（核心功能） |
| `/api/latest/txt?type=socks5` | 按类型过滤 |
| `/api/latest/txt?includeScheme=1` | 含协议前缀 |
| `/api/latest/json` | JSON 格式输出 |
| `/api/schedule` | 定时任务配置 |
| `/api/schedule/run` | 手动触发一次检测（POST） |

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `file:/data/proxies.db` | SQLite 数据库路径 |

⚠️ HuggingFace 部署**必须启用 Persistent Storage**（挂载在 `/data`），否则数据库会在 Space 重启时丢失。

## 📖 使用方法

1. 在主页勾选想要的代理源（默认已勾选 ProxyScrape All）
2. 调整超时和目标 URL（可选）
3. 点击"开始检测"
4. 实时查看进度
5. 检测完成后，复制 `/api/latest/txt` 链接在你的脚本中使用

## 🛠️ 技术栈

- Next.js 16 + TypeScript + App Router
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + SQLite
- Node.js 原生 http/https + socks 库测试代理

## 📝 License

MIT
