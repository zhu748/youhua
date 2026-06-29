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

## 部署到 HuggingFace Space（手动方式，推荐）

### 第 1 步：在 HuggingFace 创建 Space

1. 访问 [huggingface.co/new-space](https://huggingface.co/new-space)
2. 填写基本信息：
   - **Space name**：`proxylab`（或你喜欢的名字）
   - **License**：MIT
   - **SDK**：选择 **Docker**
   - **Hardware**：**CPU basic (16 GB RAM)** 免费（足够使用）
   - **Persistent storage**：建议选 **20GB Small disk**（约 $5/月，必须启用才能持久化定时任务数据）
3. 点击 **Create Space**

### 第 2 步：在 Space Settings 中添加环境变量

进入你刚创建的 Space → 顶部 **Settings** 标签页 → 滚动到 **Variables and secrets** 区域 → 添加：

| Variable | Value | 说明 |
|----------|-------|------|
| `DATABASE_URL` | `file:/data/proxies.db` | SQLite 数据库路径，必须使用 `/data` 目录 |

⚠️ 如果你**没启用** Persistent Storage，请改为 `file:/tmp/proxies.db`（数据会在 Space 重启时丢失，但应用仍能运行）。

### 第 3 步：上传代码到 Space

有两种方式，任选其一：

#### 方式 A：通过 HuggingFace Web UI 上传（最简单）

1. 在你本地电脑，先把代码打包成 zip（排除 `node_modules`、`.next`、`db/*.db` 等）
2. 进入 Space 主页 → 点击 **Files** 标签
3. 点击 **Add file → Upload files**
4. 上传以下核心文件（**必须**的）：
   - `Dockerfile`
   - `.dockerignore`
   - `package.json`
   - `bun.lock`（如有）
   - `next.config.ts`
   - `tsconfig.json`
   - `postcss.config.mjs`
   - `tailwind.config.ts`
   - `eslint.config.mjs`
   - `components.json`
   - `instrumentation.ts`
   - `render.yaml`（可选，仅 Render 用，HF 会忽略）
5. 上传以下目录（**整个文件夹**）：
   - `src/`
   - `prisma/`
   - `public/`
6. 等待几秒，Space 会自动开始构建

#### 方式 B：通过 Git 命令推送（推荐熟悉 git 的用户）

```bash
# 在你本地仓库目录执行
# 1. 在 HuggingFace 创建 Access Token
#    访问 https://huggingface.co/settings/tokens → 创建 token（Read/Write 权限）

# 2. 添加 HuggingFace 为远程仓库
git remote add hf https://huggingface.co/spaces/<你的HF用户名>/proxylab

# 3. 推送代码（首次会要求输入用户名和密码，用户名填你的 HF 用户名，密码填 token）
git push hf main

# 4. 如果 README.md 不含 HuggingFace 的 YAML 元数据，HF 不会识别为 Docker Space
#    解决：推送前先执行
cp deploy/huggingface/HF_SPACE_README.md README.md
git add README.md
git commit -m "chore: use HF Space README metadata"
git push hf main
```

### 第 4 步：等待构建完成

- Space 构建大约需要 **5-10 分钟**（首次）
- 在 Space 主页可以看到实时构建日志
- 构建状态变为 **Running** 表示已完成
- 如果失败，日志会显示具体错误

### 第 5 步：验证部署

部署完成后，访问：

| URL | 用途 |
|-----|------|
| `https://<你的用户名>-proxylab.hf.space/` | 主页（Web UI） |
| `https://<你的用户名>-proxylab.hf.space/api/latest/txt` | 稳定 TXT 链接 |
| `https://<你的用户名>-proxylab.hf.space/api/latest` | 最近运行摘要（JSON） |

在主页点击"开始检测"，等待 2-3 分钟后访问 `/api/latest/txt`，应该能看到有效代理列表。

## 更新代码

后续每次你想更新 Space 里的代码：

**方式 A（Web UI）**：直接在 Files 页面拖拽新文件覆盖

**方式 B（Git）**：
```bash
git push hf main
```
（HuggingFace 会自动重建）

## HuggingFace 限制须知

- **CPU basic (16 GB RAM)**：免费，足够 50 并发检测
- **Persistent Storage**：约 $5/月，**强烈建议启用**（否则数据库每次重启都丢失）
- **Sleep 机制**：免费 Space 48 小时无访问会自动 sleep，定时任务停止；访问任意 URL 即可唤醒
  - 如果你希望定时任务 24/7 运行，建议升级到 **CPU upgraded** 或使用 Render 部署
- **只读文件系统**：除 `/data` 和 `/tmp` 外所有目录只读，本应用已配置为只在 `/data` 写入

## 常见问题

### Q: 构建失败提示 `Cannot find module '@prisma/client'`？

A: Dockerfile 中的 `postinstall` 钩子会自动运行 `prisma generate`，但如果 HuggingFace 跳过了 postinstall，可以手动在 Space Settings 中添加环境变量：
```
NPM_CONFIG_IGNORE_SCRIPTS=false
```

### Q: Space 一直显示 "Building" 但很久了？

A: 首次构建需要拉取 `node:20-slim` 镜像 + 安装 npm 依赖，正常需要 5-10 分钟。超过 20 分钟请查看构建日志。

### Q: 数据库写不进去？

A: 检查 `DATABASE_URL` 是否指向 `/data/...` 或 `/tmp/...`。其他路径在 HuggingFace 上是只读的。

### Q: Space 被自动 sleep 了怎么办？

A: 访问 Space 主页任意 URL 即可唤醒。或者用外部监控服务（如 UptimeRobot）定期 ping 你的 Space。
