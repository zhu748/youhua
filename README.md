# ProxyLab 🛡️

> 在线代理批量检测网站 — HTTP / HTTPS / SOCKS4 / SOCKS5 多协议支持，自动定时检测，输出与 proxyscrape 格式一致的稳定 TXT 链接。

![ProxyLab](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-SQLite-teal) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 核心功能

- **多源批量检测**：内置 13 个免费代理源（ProxyScrape、TheSpeedX、proxifly、monosans、hookzof、roosterkid），可多选混合检测
- **全协议支持**：HTTP（GET 请求）、HTTPS（CONNECT 隧道）、SOCKS4 / SOCKS5（原生协议握手）
- **并发检测引擎**：50 并发量后台测试，可调超时（1-15s）和测试目标 URL
- **实时进度面板**：进度条 + 有效/失败/队列/用时四项统计，每秒刷新
- **结果表格**：状态、代理地址、类型、响应时间（带颜色）、出口 IP、来源、错误信息
- **TXT 输出**：与原始 `data.txt` 一致的 `ip:port` 格式
- **定时任务**：默认每小时自动检测一次（可调 5min - 6h），结果持久化到 SQLite
- **稳定 TXT 链接**：`/api/latest/txt` 永远返回最近一次有效代理，与 proxyscrape 列表用法一致

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
bun install  # 或 npm install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

访问 http://localhost:3000

### 生产构建

```bash
bun run build
bun run start
```

## 📦 部署

本项目支持多种部署方式。详见 [部署文档](./deploy/)。

### HuggingFace Spaces（免费 + 持久存储）

详见 [`deploy/huggingface/README.md`](./deploy/huggingface/README.md)

要点：
1. 创建 Docker SDK Space
2. 启用 Persistent Storage（约 $5/月）
3. 设置环境变量 `DATABASE_URL=file:/data/proxies.db`

### Render（推荐生产环境）

详见 [`deploy/render/README.md`](./deploy/render/README.md)

要点：
1. 使用 `render.yaml` 作为 Blueprint 一键部署
2. 选择 Starter plan ($7/月) + 1GB Disk
3. 设置环境变量 `DATABASE_URL=file:/var/data/proxies.db`

### Docker（任意主机）

```bash
# 构建
docker build -t proxylab .

# 运行（挂载持久卷）
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=file:/data/proxies.db \
  -v proxylab-data:/data \
  --name proxylab \
  proxylab
```

### Vercel ⚠️ 不支持

Vercel 的 Serverless Functions 无法使用 SQLite（文件系统只读且无持久化），也不支持长时间运行的并发检测任务。请使用上述 Docker 方案。

## 🔗 API 文档

### 核心 API

| URL | 方法 | 用途 |
|-----|------|------|
| `/` | GET | 主页（Web UI） |
| `/api/latest/txt` | GET | **稳定 TXT 链接**（最近一次有效代理） |
| `/api/latest/txt?type=socks5` | GET | 按类型过滤（http/https/socks4/socks5） |
| `/api/latest/txt?includeScheme=1` | GET | 含协议前缀（`socks5://1.2.3.4:1080`） |
| `/api/latest/json` | GET | JSON 格式输出 |
| `/api/latest` | GET | 最近运行摘要 |
| `/api/schedule` | GET/PATCH | 查看或修改定时任务配置 |
| `/api/schedule/run` | POST | 立即触发一次检测 |
| `/api/schedule/history` | GET | 运行历史 |
| `/api/sources/presets` | GET | 内置代理源列表 |
| `/api/sources/fetch` | POST | 抓取自定义 URL 的代理列表 |
| `/api/batches` | POST | 创建一次性检测批次 |
| `/api/batches/[id]` | GET/DELETE | 查询/删除批次 |
| `/api/batches/[id]/results` | GET | 批次结果（支持筛选/排序） |
| `/api/batches/[id]/txt` | GET | 批次结果 TXT 格式 |

### 稳定 TXT 链接用法

部署后，`https://your-domain.com/api/latest/txt` 的用法与 proxyscrape 完全一致：

```bash
# 在脚本中直接使用
curl https://your-domain.com/api/latest/txt > proxies.txt

# 配置代理软件订阅
# 在 v2ray / shadowsocks / clash 等软件中，把这个 URL 配置为订阅地址

# 按类型获取
curl https://your-domain.com/api/latest/txt?type=socks5
```

## 📊 内置代理源

| 源 | 类型 | 数量 | 更新频率 | 验证日期 |
|----|------|------|----------|---------|
| ProxyScrape — All | Mixed | ~2000 | 每 5 分钟 | 2026-06-29 |
| TheSpeedX/PROXY-List — HTTP/socks4/socks5 | 各类型 | ~1900-2400 | 每 3 小时 | 2026-06-29 |
| proxifly/free-proxy-list — HTTP/HTTPS/SOCKS4/SOCKS5 | 各类型 | ~350-1300 | 约每小时 | 2026-06-29 |
| monosans/proxy-list — HTTP/socks4/socks5 | 各类型 | 8-40 | 每小时 | 2026-06-29 |
| hookzof/socks5_list — SOCKS5 | socks5 | ~390 | 约每小时 | 2026-06-29 |
| roosterkid/openproxylist — HTTPS | https | ~77 | 每天 | 2026-06-29 |

所有源都通过 commit 历史验证活跃（2026-06-29 检查）。

## 🛠️ 技术栈

- **Framework**: Next.js 16 (App Router, standalone output)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM + SQLite
- **Proxy Testing**: Node.js 原生 `http`/`https` + `socks` 库
- **Runtime**: Node.js 20+（也兼容 Bun）

## 📁 项目结构

```
.
├── prisma/schema.prisma              # 数据模型：ScheduleConfig, ScheduledRun, WorkingProxy
├── instrumentation.ts                # Next.js 启动钩子（初始化定时器）
├── Dockerfile                        # Docker 镜像构建（HuggingFace + Render 通用）
├── render.yaml                       # Render Blueprint 配置
├── deploy/                           # 各平台详细部署文档
│   ├── huggingface/
│   └── render/
├── scripts/                          # 工具脚本
│   ├── verify-sources.py             # 验证所有代理源
│   └── check-update-freq.py          # 检查上游仓库更新频率
└── src/
    ├── app/
    │   ├── page.tsx                  # 主页 UI
    │   └── api/                      # API 路由
    ├── components/proxy-checker/     # UI 组件
    └── lib/
        ├── proxy-tester.ts           # 代理测试核心
        ├── batch-manager.ts          # 一次性批次管理
        └── scheduler.ts              # 定时任务管理器
```

## ⚠️ 注意事项

- **免费代理质量参差不齐**：请勿用于关键场景。代理可能慢、不稳定或被封锁
- **检测目标 URL**：默认使用 `http://www.google.com/generate_204`，可根据网络环境调整
- **并发量**：默认 50，可根据服务器性能调整（修改 `src/lib/batch-manager.ts` 中的 `CONCURRENCY`）
- **数据库大小**：保留最近 10 次运行的数据，旧数据自动清理。10k+ 代理约占 5MB

## 📝 License

MIT
