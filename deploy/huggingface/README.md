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

# ProxyLab — HuggingFace Space

在线代理批量检测网站，支持 HTTP / HTTPS / SOCKS4 / SOCKS5 多协议检测，自动定时任务，输出与 proxyscrape 格式一致的稳定 TXT 链接。

## 部署到 HuggingFace Space

### 方法 1：通过 Docker SDK（推荐）

1. 在 [huggingface.co/new-space](https://huggingface.co/new-space) 创建新 Space
2. **SDK** 选择 **Docker**
3. **License** 选择 **MIT**（或其他）
4. **Hardware** 选择 **CPU basic (16 GB RAM)** 免费（足够使用）
5. **Storage** 选择 **20GB Small disk** 持久化存储（**必须**，否则定时任务数据会丢失）
6. 创建完成后，将本仓库所有文件上传到 Space（或在 Space Settings 中关联 GitHub 仓库自动同步）

### 必须的 Space 配置

在 Space 的 **Settings → Variables and secrets** 中添加：

| Variable | Value | 说明 |
|----------|-------|------|
| `DATABASE_URL` | `file:/data/proxies.db` | SQLite 数据库路径，必须使用 `/data` 目录（HuggingFace 持久化存储挂载点） |

⚠️ **必须购买/启用 Persistent Storage**，否则每次 Space 重启数据库都会丢失。

### HuggingFace 限制

- **CPU basic (16 GB RAM)**：免费，足够 50 并发检测
- **Persistent Storage 20GB**：约 $5/月，必须启用才能持久化数据
- **Sleep 机制**：免费 Space 48 小时无访问会自动 sleep，定时任务会停止；访问任意 URL 即可唤醒
- **只读文件系统**：除 `/data` 和 `/tmp` 外所有目录只读。本应用已配置为只在 `/data` 写入

### 自定义端口

HuggingFace Docker Space 默认监听 7860 端口，但可以通过 Space Metadata 中的 `app_port` 修改。本仓库的 `README.md` 元数据已设置为 `app_port: 3000`，与 Dockerfile 中 `EXPOSE 3000` 一致。

## 验证部署

部署完成后，访问：
- `https://<your-space-name>.hf.space/` — 主页
- `https://<your-space-name>.hf.space/api/latest/txt` — 稳定 TXT 链接（最近一次有效代理）
- `https://<your-space-name>.hf.space/api/latest` — 最近运行摘要（JSON）

## 自动同步 GitHub

如果你把代码推到 GitHub，可以在 HuggingFace Space Settings → **GitHub Action** 中开启自动同步：
- 每次 push 到 main 分支，自动同步到 HuggingFace Space
- 同步会在 Space 中触发重新构建

具体配置见 [HuggingFace 文档](https://huggingface.co/docs/hub/spaces-github-actions)。
