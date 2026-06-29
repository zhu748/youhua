# ProxyLab — Render 部署指南

## 部署步骤

### 方法 1：Blueprint（推荐）

1. 把代码推到 GitHub
2. 访问 [Render Dashboard → Blueprints](https://dashboard.render.com/blueprints)
3. 点击 **New Blueprint Instance**
4. 选择你的 GitHub 仓库
5. Render 会自动读取 `render.yaml` 并创建：
   - **Web Service**（Docker，Starter plan）
   - **Disk**（1GB 持久存储，挂载在 `/var/data`）
6. 等待 5-10 分钟构建完成
7. 访问 `https://<your-service-name>.onrender.com/`

### 方法 2：手动配置

1. 在 Render Dashboard 点击 **New → Web Service**
2. 连接 GitHub 仓库
3. 配置：
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Starter（推荐）或 Free（无持久存储）
   - **Health Check Path**: `/api/latest/txt`
4. 添加环境变量：
   - `DATABASE_URL` = `file:/var/data/proxies.db`
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
5. 在 **Disks** 标签页添加：
   - **Name**: `proxylab-data`
   - **Mount Path**: `/var/data`
   - **Size**: 1 GB
6. 点击 **Create Web Service**

## 必须的配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Runtime | Docker | 使用 Dockerfile 构建 |
| Plan | Starter ($7/mo) | Free plan 无持久存储，数据库会丢失 |
| Disk Mount Path | `/var/data` | SQLite 数据库写入位置 |
| Disk Size | 1 GB | 足够存储 10k+ 代理的检测结果 |
| DATABASE_URL | `file:/var/data/proxies.db` | 必须与 Disk Mount Path 一致 |
| Health Check | `/api/latest/txt` | Render 会定期检查此 URL |

## Render 的优势

- ✅ **不会自动 sleep**（Starter 及以上 plan）—— 定时任务 24/7 运行
- ✅ **Persistent Disk** —— 数据库跨部署持久化
- ✅ **自动 HTTPS** —— Render 自动签发证书
- ✅ **自动部署** —— push 到 GitHub 自动触发重建
- ✅ **PR 预览环境** —— 每个 PR 自动创建预览实例

## Render 的限制

- ⚠️ **Free plan 无持久存储**：定时任务数据会在重新部署时丢失。建议至少用 Starter
- ⚠️ **Free plan 15 分钟无访问会 sleep**：定时任务会停止
- ⚠️ **构建时间**：首次构建约 5-10 分钟（之后有缓存会更快）

## 验证部署

部署完成后：

```bash
# 测试主页
curl https://<your-service>.onrender.com/

# 测试稳定 TXT 链接
curl https://<your-service>.onrender.com/api/latest/txt

# 触发一次手动检测
curl -X POST https://<your-service>.onrender.com/api/schedule/run

# 查看定时任务状态
curl https://<your-service>.onrender.com/api/schedule
```

## 成本估算

| 项目 | 费用 |
|------|------|
| Web Service (Starter, 512MB) | $7/月 |
| Disk (1GB) | $0.25/月 |
| **总计** | **~$7.25/月** |

512MB RAM 足够支持 50 并发检测 + SQLite 数据库运行。

## 自定义域名

在 Render Dashboard → **Settings → Custom Domains** 中添加你的域名。Render 会自动签发 SSL 证书。

更新 DNS 记录指向 Render 提供的 CNAME，等待几分钟生效即可。
