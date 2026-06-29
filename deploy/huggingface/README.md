---
title: ProxyLab
emoji: 🛡️
colorFrom: emerald
colorTo: cyan
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: 在线代理批量检测 - HTTP/HTTPS/SOCKS4/SOCKS5
---

# ProxyLab — HuggingFace Space

在线代理批量检测网站，支持 HTTP / HTTPS / SOCKS4 / SOCKS5 多协议检测，自动定时任务，输出与 proxyscrape 格式一致的稳定 TXT 链接。

## 🚀 部署到 HuggingFace Space（拉取预构建镜像，超快）

本仓库使用 GitHub Actions 自动构建 Docker 镜像并推送到 GitHub Container Registry (GHCR)。HuggingFace 只需要拉取镜像即可，**无需构建**，部署只需几秒钟。

### 第 1 步：触发镜像构建（GitHub 自动完成）

每次 push 到 GitHub `main` 分支时，GitHub Actions 会自动：
1. 构建 Docker 镜像（约 5-10 分钟）
2. 推送到 `ghcr.io/zhu748/youhua:latest`
3. 镜像是公开的，HuggingFace 可以直接拉取

**验证镜像已构建**：访问 https://github.com/zhu748/youhua/pkgs/container/youhua
- 看到 `latest` tag 存在即可
- 也可以手动触发：GitHub 仓库 → Actions → "Build & Push Docker Image to GHCR" → Run workflow

### 第 2 步：在 HuggingFace 创建 Space

1. 访问 [huggingface.co/new-space](https://huggingface.co/new-space)
2. 填写：
   - **Space name**：`proxylab`
   - **License**：MIT
   - **SDK**：**Docker**
   - **Hardware**：**CPU basic (16 GB RAM)** 免费
   - **Persistent storage**：建议选 **20GB Small disk**（约 $5/月，用于持久化定时任务数据）
3. 点击 **Create Space**

### 第 3 步：上传 Dockerfile 到 Space

只需要上传**一个文件**到 Space！

1. 把本仓库的 [`deploy/huggingface/Dockerfile`](./Dockerfile) 下载到本地
2. 进入你的 HuggingFace Space → **Files** 标签
3. 点击 **Add file → Upload files**
4. 上传刚才下载的 `Dockerfile`
5. Space 会自动检测到 Dockerfile，开始拉取镜像并启动

**就这三步！** 不需要上传 src、package.json 等任何代码文件，全部都在镜像里了。

### 第 4 步：（可选）配置环境变量

Dockerfile 中已经默认设置了：
- `DATABASE_URL=file:/data/proxies.db`（写入 HuggingFace 持久卷）
- `PORT=7860`（HuggingFace 默认端口）

如果你想覆盖这些值，进入 Space → **Settings → Variables and secrets** 添加自定义环境变量即可。

### 第 5 步：验证部署

镜像拉取完成后（首次约 1-2 分钟，之后秒级），访问：

| URL | 用途 |
|-----|------|
| `https://<你的用户名>-proxylab.hf.space/` | 主页（Web UI） |
| `https://<你的用户名>-proxylab.hf.space/api/latest/txt` | 稳定 TXT 链接 |
| `https://<你的用户名>-proxylab.hf.space/api/latest` | 最近运行摘要（JSON） |

## 🔄 后续更新流程

代码更新后只需要：

1. **推送代码到 GitHub**：
   ```bash
   git push origin main
   ```
2. **等待 GitHub Actions 构建完成**（约 5-10 分钟）
3. **在 HuggingFace Space 中重启**：Settings → **Factory reboot**（或推送一次空 commit 到 HF Space 仓库触发重建）
   - HuggingFace 会重新拉取 `:latest` 镜像

> 💡 **小提示**：如果想自动触发 HF 重建，可以在 HF Space 也用 git 管理（先在 HF 创建 Space 时勾选 "Connect GitHub repo"），然后每次 GitHub Actions 构建完成后，用一个空 commit 推到 HF Space 触发重建。但目前手动 Factory reboot 已经足够简单。

## 🛠️ 本地拉取镜像测试

如果你想先在本地测试这个镜像：

```bash
# 拉取镜像
docker pull ghcr.io/zhu748/youhua:latest

# 运行
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=file:/data/proxies.db \
  -v proxylab-data:/data \
  --name proxylab \
  ghcr.io/zhu748/youhua:latest

# 访问 http://localhost:3000
```

## ❓ 常见问题

### Q: Space 构建日志显示 "pull access denied"？

A: 检查 GHCR 镜像是否构建成功。访问 https://github.com/zhu748/youhua/actions 查看最近的 "Build & Push Docker Image to GHCR" workflow 是否成功。如果失败，看日志修复后重新触发。

### Q: 想用特定版本的镜像而不是 latest？

A: 修改 Space 中的 Dockerfile，把 `:latest` 改成具体的 commit SHA：
```dockerfile
FROM ghcr.io/zhu748/youhua:sha-<7位commit短SHA>
```
SHA 可以在 https://github.com/zhu748/youhua/pkgs/container/youhua 找到。

### Q: Space 被自动 sleep 了？

A: 免费 Space 48 小时无访问会 sleep，定时任务停止。访问任意 URL 即可唤醒。建议用 [UptimeRobot](https://uptimerobot.com) 定期 ping 防止 sleep。

### Q: 数据库写不进去？

A: 检查 `DATABASE_URL` 是否指向 `/data/...`（启用了 Persistent Storage）或 `/tmp/...`（未启用）。其他路径在 HuggingFace 上是只读的。

### Q: 镜像太大了？

A: 当前镜像约 300MB（包含 Node.js + Next.js standalone + Prisma + 应用代码）。这是合理的，因为包含了所有运行时依赖。GHCR 拉取速度通常很快。

## 📋 完整流程对比

| 传统方式 | 本方案（推荐） |
|---------|--------------|
| 上传所有源码到 HF | 只上传 1 个 Dockerfile |
| HF 上构建 5-10 分钟 | HF 拉取镜像 1-2 分钟 |
| 每次更新都要重新上传源码 | push 到 GitHub，等 Actions 构建，HF Factory reboot |
| HF 构建失败要自己排查 | GitHub Actions 日志清晰可见 |
