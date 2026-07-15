🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

# <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/logo.png?raw=true" alt="HolyClaude" width="39" valign="bottom"> <a name="top"></a>HolyClaude

<div align="center">
  <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/hero.png?raw=true" alt="HolyClaude Banner" width="100%" />
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Pulls](https://badgen.net/docker/pulls/coderluii/holyclaude?icon=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Full Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/latest?label=full&color=blue&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Slim Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/slim?label=slim&color=green&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
<br>
[![GitHub Stars](https://img.shields.io/github/stars/CoderLuii/HolyClaude?style=social)](https://github.com/CoderLuii/HolyClaude)
[![Twitter Follow](https://img.shields.io/twitter/follow/CoderLuii?style=social)](https://x.com/CoderLuii)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)
[![Website](https://img.shields.io/badge/website-holyclaude.coderluii.dev-orange?logo=astro)](https://holyclaude.coderluii.dev)
[![GitHub Release](https://img.shields.io/github/v/release/CoderLuii/HolyClaude?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/CoderLuii/HolyClaude/releases)
[![Issues](https://img.shields.io/github/issues/CoderLuii/HolyClaude?color=ff80eb&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/issues)
[![Contributors](https://img.shields.io/github/contributors/CoderLuii/HolyClaude?color=c4f042&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/graphs/contributors)

### 告别配置，专注构建。

一条命令，完整的 AI 开发工作站。Claude Code、Web UI、无头浏览器、8 个 AI CLI、50+ 开发工具，全部容器化，开箱即用。

**你本来要花 2 个小时手动搭建这一切。或者，你只需要 `docker compose up`。**

**与你现有的 Claude Code 订阅无缝兼容。** Max/Pro 计划、API 密钥，无论你用哪种，都能直接运行。

---

## 这是什么？

你知道那种感觉。你想要 Claude Code，但同时还想要一个浏览器界面，想要用于截图和测试的无头浏览器，想要配置好的 Playwright，想要所有 AI CLI，想要 TypeScript、Python、部署工具、数据库客户端、GitHub CLI。

于是你开始一个个安装。然后 Chromium 因为 Docker 共享内存只有 64MB 而无法启动。然后 Xvfb 没有配置。然后容器内的 UID 与宿主机不匹配，一切都报权限拒绝。然后你发现 Claude Code 的安装程序在 WORKDIR 被 root 拥有时会挂起。然后 SQLite 在 NAS 挂载上锁定。然后——

**HolyClaude 就是我在解决以上每一个问题之后构建的容器。**

我已经在自己的服务器上每天运行了好几周。每一个 bug 都被发现、诊断并修复。每一个边缘情况都已处理。每一个"为什么在 Docker 里跑不起来"都有了答案。

你拉取它，运行它，打开浏览器，开始构建。

### :credit_card: 使用你现有的订阅

**这里运行的是真正的 Claude Code CLI。** 不是封装器，不是代理，不是仿制品。

你现有的 Anthropic 账户可以直接使用：
- **Claude Max/Pro 计划** — 通过 Web UI 进行认证（OAuth），与桌面版 Claude Code 完全相同
- **Anthropic API 密钥** — 通过 Web UI 设置，计费方式与以往相同
- **无额外费用** — HolyClaude 是免费开源的。你只需为 Anthropic 的使用量付费，和以前一样。

> HolyClaude 不会接触你的凭证。它们以本地绑定挂载的方式存储在 `./data/claude/` 中，与在裸机上完全相同。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## 目录

| | 章节 |
|---|---|
| :zap: | [快速开始](#zap-quick-start) |
| :computer: | [平台支持](#computer-platform-support) |
| :star2: | [为什么选择 HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [订阅与认证](#credit_card-subscription--authentication) |
| :package: | [镜像版本](#package-image-variants) |
| :whale: | [Docker Compose — 快速版](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — 完整版](#whale2-docker-compose--full) |
| :wrench: | [环境变量](#wrench-environment-variables) |
| :rocket: | [内置内容](#rocket-whats-inside) |
| :robot: | [AI CLI 提供商](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [使用 Ollama](#llama-using-ollama) |
| :building_construction: | [架构](#building_construction-architecture) |
| :file_folder: | [项目结构](#file_folder-project-structure) |
| :floppy_disk: | [数据与持久化](#floppy_disk-data--persistence) |
| :lock: | [权限](#lock-permissions) |
| :shield: | [远程访问与安全](#shield-remote-access--exposure) |
| :bell: | [通知](#bell-notifications) |
| :arrows_counterclockwise: | [升级](#arrows_counterclockwise-upgrading) |
| :construction: | [故障排查](#construction-troubleshooting) |
| :warning: | [已知问题](#warning-known-issues) |
| :hammer_and_wrench: | [本地构建](#hammer_and_wrench-building-locally) |
| :bar_chart: | [同类方案对比](#bar_chart-alternatives) |
| :rocket: | [路线图](#rocket-roadmap) |
| :trophy: | [基于 HolyClaude 的项目](#trophy-built-with-holyclaude) |
| :handshake: | [贡献](#handshake-contributing) |
| :heart: | [支持](#heart-support) |
| :scroll: | [第三方软件](#scroll-third-party-software) |
| :page_facing_up: | [许可证](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :zap: Quick Start

**1.** 为 HolyClaude 创建一个文件夹：

```bash
mkdir holyclaude && cd holyclaude
```

**2.** 创建 `docker-compose.yaml` 文件，复制以下任一模板：
- [快速模板](#whale-docker-compose--quick) — 最简配置，零设置，直接可用
- [完整模板](#whale2-docker-compose--full) — 所有选项，含完整注释

**3.** 拉取并启动：

```bash
docker compose up -d
```

**4.** 打开 Web UI：

```
http://localhost:3001
```

**5.** 创建一个 CloudCLI 账户（10 秒搞定），用你的 Anthropic 账户登录，然后开始使用。

> 无需 `.env` 文件，无需预配置，无需读完 40 页文档才能启动。直接运行。

> **想从外部网络访问？** 别做端口转发。查看[远程访问与安全](#shield-remote-access--exposure) — 用 Tailscale 或 Cloudflare Tunnel 代替。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :computer: Platform Support

| 平台 | 状态 | 说明 |
|----------|--------|-------|
| Linux (amd64) | ✅ 完全支持 | 原生性能，推荐 |
| Linux (arm64) | ✅ 完全支持 | Raspberry Pi 4+、Oracle Cloud、AWS Graviton |
| macOS (Docker Desktop) | ✅ 完全支持 | Apple Silicon 和 Intel，通过 Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ 完全支持 | 需要 WSL2 后端 |
| Synology / QNAP NAS | ✅ 完全支持 | SMB 挂载请使用 `CHOKIDAR_USEPOLLING=true` |
| Kubernetes | 🔜 即将支持 | Helm chart 规划中 |

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :star2: Why HolyClaude

我构建这个是因为我厌倦了每次都重复相同的配置流程。安装 Claude Code，接入 Web UI，在 Docker 中配置 Chromium，修复权限问题，调试进程监督。每次都是这样。

于是我做了一个能处理所有这些的容器。然后我把每一个可能的 bug 都踩了一遍，这样你就不必再踩了。

| | HolyClaude | 自己动手 |
|---|---|---|
| **配置** | 30 秒 | 1-2 小时（如果顺利的话） |
| **Claude Code** | 预装、预配置、即用 | 安装、配置、调试安装程序挂起、修复 WORKDIR |
| **Web UI** | 含插件的 CloudCLI | 找一个 Web UI，安装它，配置它，接入 Claude |
| **无头浏览器** | Chromium + Xvfb + Playwright，已配置 | 安装 Chromium，安装 Xvfb，配置 display :99，修复 shm，修复 sandbox，修复 seccomp... |
| **AI CLI** | 8 个提供商，一个容器 | 跨 3 个包管理器逐一安装 |
| **开发工具** | 50+ 工具，即用 | 接下来一个小时 `apt-get install` / `npm i -g` / `pip install` |
| **进程管理** | s6-overlay（自动重启、优雅关闭） | 自己写 supervisord 配置，或祈祷 Docker restart 能用 |
| **持久化** | 绑定挂载，凭证永久保留 | 搞清楚 Docker volumes，调试"为什么这是个目录而不是文件" |
| **更新** | `docker pull && docker compose up -d` | 手动更新 50 个工具，祈祷不出问题 |
| **多架构** | AMD64 + ARM64 | 祈祷你的 Dockerfile 能在 ARM 上构建 |

**每次手动配置的最后一行都是"在我机器上能跑"。** HolyClaude 在每台机器上都能跑。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude 运行的是 Anthropic 官方的 **Claude Code CLI**。你现有的账户开箱即用。

### 支持的方式：

| 认证方式 | 如何操作 | 费用 |
|----------------------|-----|------|
| **Claude Max/Pro 计划**（订阅） | 通过 CloudCLI Web UI 登录，与桌面端的 OAuth 流程相同 | 使用现有订阅，无额外费用 |
| **Anthropic API 密钥** | 在 Web UI 中粘贴你的 API 密钥 | 按量计费，与 Anthropic 的计费方式相同 |

### 不支持的方式：

| | 原因 |
|---|---|
| 用 OpenAI API 密钥访问 Claude | 不同公司，不同 API。OpenAI 密钥可用于 **Codex CLI**（也已预装） |

> **ChatGPT Plus/Pro 订阅用户：** 你的订阅可用于 **Codex CLI**。在容器内运行 `codex login --device-auth` 以使用你的 ChatGPT 账户登录。

### 其他已包含的 AI CLI：

| CLI | 所需条件 |
|-----|--------------|
| Gemini CLI | Google AI API 密钥（`GEMINI_API_KEY`） |
| OpenAI Codex | OpenAI API 密钥（`OPENAI_API_KEY`）或 ChatGPT Plus/Pro 订阅（`codex login --device-auth`） |
| Cursor | Cursor API 密钥（`CURSOR_API_KEY`） |
| TaskMaster AI | 使用你已有的 AI 提供商密钥（Anthropic、OpenAI 等） |
| Junie | JetBrains 账户（JetBrains AI 订阅） |
| OpenCode | 通过 `opencode` TUI 配置（支持 OpenRouter 和多个提供商） |
| Pi Coding Agent | 通过 `pi` 配置（支持多个提供商） |

> **HolyClaude 是免费开源的。** 你只需为 AI 提供商的使用量付费，和以前一样。我们不代理、不拦截、不接触你的凭证。它们存储在你的本地绑定挂载中。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :package: Image Variants

两个版本，相同质量，选择你的体量。

| 标签 | 包含内容 | 适合场景 |
|-----|-------------|----------|
| **`latest`** | 一切预装，每个工具、每个库、每个 CLI | 大多数用户。零等待时间。Claude 永远不需要暂停去安装东西。 |
| **`slim`** | 仅核心工具，Claude 按需安装额外内容 | 较小的 VPS、磁盘受限、计量带宽 |
| `X.Y.Z` | 完整镜像，固定版本 | 生产稳定性，你掌控更新时机 |
| `X.Y.Z-slim` | Slim 镜像，固定版本 | 生产环境 + 小体积 |

```bash
# 完整版 — 开箱即用（推荐）
docker pull coderluii/holyclaude

# Slim 版 — 精简轻量
docker pull coderluii/holyclaude:slim
```

> **`latest` 始终是完整镜像。** Slim 用户请放心，当你让 Claude 做某件需要缺失工具的事情时，它会在几秒内完成安装。你获得的能力完全相同，只是初始下载体积更小。
>
> Docker Hub 显示的是压缩传输大小：`latest` 约 4.1 GB，`slim` 约 2.4 GB。Docker、Synology Container Manager 和 NAS 文件系统在镜像层解压后可能显示更大的占用。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :whale: Docker Compose — Quick

"我只想让它跑起来"的模板。将整个代码块复制到 `docker-compose.yaml` 文件中：

```yaml
# ==============================================================================
# HolyClaude — Quick Start
# Just run: docker compose up -d
# Then open: http://localhost:3001
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Retained browser default for this release
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      - "127.0.0.1:3001:3001"              # CloudCLI web UI, localhost only
    volumes:
      #
      # ./data/claude — Your settings, credentials, API keys, and Claude's memory.
      #                  This is what survives container rebuilds.
      #                  NEVER delete this folder — your auth lives here.
      #
      - ./data/claude:/home/claude/.claude
      #
      # ./workspace — Your code. All projects go here.
      #               Bind-mounted so you can access files from your host.
      #
      - ./workspace:/workspace
    environment:
      - TZ=UTC                             # Your timezone (e.g., America/New_York, Europe/London)
```

然后执行：

```bash
docker compose up -d
```

打开 `http://localhost:3001`，创建一个 CloudCLI 账户，用你的 Anthropic 账户登录，然后开始构建。

**配置到此结束，你已经准备好了。**

> **为什么是这些浏览器权限？** 这个版本保留了 HolyClaude 当前的浏览器配置。`SYS_ADMIN` 和 `seccomp=unconfined` 会扩大进程权限并降低隔离；`SYS_PTRACE` 用于调试。v1.5.0 请保持这个配置不变，把加固当成单独的改动。

> **为什么是 `shm_size: 2g`？** Docker 默认只给容器 64MB 共享内存。HolyClaude 把 2GB 保留为本版本的默认值，因为 Chromium 在标签页渲染时会大量使用 `/dev/shm`。64MB 会让标签页崩掉；浏览器用得多就升到 4GB。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :whale2: Docker Compose — Full

相同的镜像，所有参数均已暴露。将整个代码块复制到 `docker-compose.yaml` 文件中：

```yaml
# ==============================================================================
# HolyClaude — Full Configuration
# All options documented inline.
# Detailed docs: https://github.com/CoderLuii/HolyClaude/blob/master/docs/configuration.md
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Chromium shared memory — increase to 4g for heavy browser use
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability (strace, lsof)
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      #
      # CloudCLI web UI — this is the only port you need.
      # Override the host-side port from `.env` if 3001 is already in use.
      #
      - "127.0.0.1:${HOLYCLAUDE_HOST_PORT:-3001}:3001"
      #
      # Dev server ports — uncomment as needed.
      # These let you access dev servers running inside the container from your host browser.
      #
      # - "127.0.0.1:3000:3000"            # Next.js / Express
      # - "127.0.0.1:4321:4321"            # Astro
      # - "127.0.0.1:5173:5173"            # Vite
      # - "127.0.0.1:8787:8787"            # Wrangler (Cloudflare Workers)
      # - "127.0.0.1:9229:9229"            # Node.js debugger
    volumes:
      #
      # PERSISTENT DATA
      #
      # ./data/claude — Settings, credentials, API keys, Claude's memory file.
      #                  Survives container rebuilds. NEVER delete this folder.
      #                  Override the host path from `.env` if you want it elsewhere.
      #
      - ${HOLYCLAUDE_HOST_CLAUDE_DIR:-./data/claude}:/home/claude/.claude
      #
      # ./workspace — Your code and projects. Everything you build goes here.
      #               Accessible from your host machine.
      #               Override the host path from `.env` if you want a different root.
      #
      - ${HOLYCLAUDE_HOST_WORKSPACE_DIR:-./workspace}:/workspace
    environment:
      #
      # TIMEZONE
      # Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      #
      - TZ=UTC
      #
      # PERFORMANCE
      # Node.js heap memory limit in MB. Increase if you work on large monorepos
      # and hit out-of-memory errors. 4096 (4GB) is a solid default.
      #
      - NODE_OPTIONS=--max-old-space-size=4096
      #
      # USER MAPPING
      # Match these to your host user so files created inside the container
      # have the right ownership on your host. Run `id -u` and `id -g` on your host.
      #
      - PUID=1000
      - PGID=1000
      #
      # SMB/CIFS NETWORK MOUNTS
      # Only enable these if your volumes are on a NAS, Samba share, or CIFS mount.
      # They enable polling-based file watching since network mounts don't support inotify.
      # Leave commented out for local storage — polling uses more CPU.
      #
      # - CHOKIDAR_USEPOLLING=1
      # - WATCHFILES_FORCE_POLLING=true
      #
      # NOTIFICATIONS (optional)
      # Get notified when Claude finishes a task or hits an error.
      # Uses Apprise — supports 100+ services. Also requires creating a flag file
      # inside the container: touch ~/.claude/notify-on
      #
      # - NOTIFY_DISCORD=discord://webhook_id/webhook_token
      # - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
      # - NOTIFY_PUSHOVER=pover://user_key@app_token
      # - NOTIFY_SLACK=slack://token_a/token_b/token_c
      # - NOTIFY_EMAIL=mailto://user:pass@gmail.com?to=you@gmail.com
      # - NOTIFY_GOTIFY=gotify://hostname/token
      # - NOTIFY_URLS=                                   # catch-all: comma-separated Apprise URLs
      #
      # AI PROVIDER KEYS (optional)
      # Claude Code can authenticate via web UI (OAuth) or ANTHROPIC_API_KEY.
      # Set these if you want to use additional AI CLIs or API-based auth.
      #
      # - GEMINI_API_KEY=your_key
      # - OPENAI_API_KEY=your_key
      # - CURSOR_API_KEY=your_key
```

然后执行：

```bash
docker compose up -d
```

如果你想在不编辑 compose 文件的情况下更改宿主机端口或绑定挂载路径，将 `.env.example` 复制为 `.env` 并设置：

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

这些值由宿主机上的 Docker Compose 读取，不是容器环境变量。

### 各配置项说明：

| 配置项 | 作用 | 何时修改 |
|---------|-------------|-------------------|
| **Timezone** | 容器时钟 | 始终需要，设置为你的本地时区 |
| **Performance** | Node.js 内存上限 | 仅在大型项目遇到 OOM 错误时 |
| **User mapping** | 容器与宿主机之间的文件权限 | 遇到"权限拒绝"时（在宿主机运行 `id -u` 和 `id -g`） |
| **SMB/CIFS** | 文件监视器轮询模式 | 仅当卷存储在 NAS 或网络共享上时 |
| **Notifications** | 通过 Apprise 推送告警（Discord、Telegram、Slack、Email、100+ 服务） | 当你想离开电脑并在 Claude 完成后收到通知时 |
| **AI providers** | Gemini、Codex、Cursor、Junie、OpenCode, Pi Coding Agent 的 API 密钥 | 当你想使用 Claude 之外的 AI CLI 时 |

> **每一个环境变量都是可选的。** 容器只用 `TZ=UTC` 也能完美运行。其他所有配置都有合理默认值，或通过 Web UI 处理。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :wrench: Environment Variables

完整参考，每个变量、默认值和功能说明。

| 变量 | 默认值 | 功能 |
|----------|---------|--------------|
| `TZ` | `UTC` | 容器时区 |
| `PUID` | `1000` | Docker 式容器用户 ID；rootless Podman 使用 `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | Docker 式容器用户组 ID；rootless Podman 使用 `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js 堆内存上限（MB） |
| `GIT_USER_NAME` | `HolyClaude User` | Git 提交作者（首次启动时设置一次） |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git 提交邮箱（首次启动时设置一次） |
| `CHOKIDAR_USEPOLLING` | *(未设置)* | 设置为 `1` 以启用 SMB/CIFS 轮询文件监视器 |
| `WATCHFILES_FORCE_POLLING` | *(未设置)* | 设置为 `true` 以启用 Python 轮询 |
| `NOTIFY_DISCORD` | *(未设置)* | Discord webhook URL 用于通知 |
| `NOTIFY_TELEGRAM` | *(未设置)* | Telegram bot URL 用于通知 |
| `NOTIFY_PUSHOVER` | *(未设置)* | Pushover URL 用于通知 |
| `NOTIFY_SLACK` | *(未设置)* | Slack webhook URL 用于通知 |
| `NOTIFY_EMAIL` | *(未设置)* | 邮件（SMTP）URL 用于通知 |
| `NOTIFY_GOTIFY` | *(未设置)* | Gotify URL 用于通知 |
| `NOTIFY_URLS` | *(未设置)* | 通用，逗号分隔的 [Apprise URLs](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(未设置)* | Anthropic API 密钥（Web UI OAuth 的替代方案） |
| `ANTHROPIC_AUTH_TOKEN` | *(未设置)* | Anthropic 认证令牌（API 密钥的替代方案） |
| `ANTHROPIC_BASE_URL` | *(未设置)* | 自定义 Anthropic API 端点（代理、私有部署） |
| `CLAUDE_CODE_USE_BEDROCK` | *(未设置)* | 设置为 `1` 以使用 Amazon Bedrock 后端 |
| `CLAUDE_CODE_USE_VERTEX` | *(未设置)* | 设置为 `1` 以使用 Google Vertex AI 后端 |
| `GEMINI_API_KEY` | *(未设置)* | Google Gemini API 密钥 |
| `OPENAI_API_KEY` | *(未设置)* | OpenAI API 密钥（用于 Codex CLI，或使用 `codex login --device-auth` 进行 ChatGPT 订阅认证） |
| `CURSOR_API_KEY` | *(未设置)* | Cursor API 密钥 |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | 可选的 Desloppify 全局 skill 设置。有效值: `off`, `all`, `claude`, `codex`, `gemini`, `opencode`，或逗号分隔组合 |
| `OLLAMA_HOST` | *(未设置)* | Ollama 端点 URL（例如 `http://host.docker.internal:11434`） |

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :rocket: What's Inside

这不是一个最小化容器，这是一个完整的开发工作站。

### 两个版本均包含（完整版 + Slim 版）

<details>
<summary><strong>Node.js 26 + npm 全局包</strong></summary>

| 包 | 用途 |
|---------|---------------|
| `typescript`, `tsx` | TypeScript 编译与执行 |
| `pnpm` | 快速、节省磁盘的包管理器 |
| `vite`, `esbuild` | 极速构建工具 |
| `eslint`, `prettier` | 代码质量与格式化 |
| `serve`, `nodemon` | 静态文件服务器，自动重启开发服务器 |
| `concurrently` | 并行运行多个脚本 |
| `dotenv-cli` | 从 `.env` 文件加载环境变量 |

</details>

<details>
<summary><strong>Python 3 包</strong></summary>

| 包 | 用途 |
|---------|---------------|
| `requests`, `httpx` | HTTP 客户端 |
| `beautifulsoup4`, `lxml` | Web 爬取与 HTML 解析 |
| `Pillow` | 图像处理（预编译，无需等待） |
| `pandas`, `numpy` | 数据处理（预编译，你真的不想在运行时 pip install 这些） |
| `openpyxl` | 读写 Excel 文件 |
| `python-docx` | 读写 Word 文档 |
| `jinja2`, `markdown` | 模板与 Markdown 渲染 |
| `pyyaml`, `python-dotenv` | 配置文件解析 |
| `rich`, `click`, `tqdm` | 美观的 CLI 和进度条 |
| `desloppify`, `bandit`, `tree-sitter` | 代码质量扫描、Python 安全检查、基于 parser 的代码分析 |
| `playwright` | 浏览器自动化（Chromium 已配置就绪） |

</details>

<details>
<summary><strong>系统工具</strong></summary>

| 工具 | 用途 |
|------|---------------|
| `git`, `gh` | 版本控制 + GitHub CLI（从终端管理 PR、Issue、Release） |
| `ripgrep` (`rg`), `fd`, `fzf` | 极速搜索，Claude 频繁使用这些 |
| `bat`, `tree`, `jq` | 更好的 cat（语法高亮）、目录树、JSON 处理 |
| `curl`, `wget` | HTTP 下载 |
| `tmux` | 终端复用器，在后台运行任务 |
| `htop`, `lsof`, `strace` | 进程监控与调试 |
| `imagemagick` | 图像转换（`convert`、`identify`、`mogrify`） |
| `chromium` | 无头浏览器，用于截图、Playwright、Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | 直接与数据库交互 |
| `openssh-client`, `openssh-server`, `mosh` | 向外 SSH，以及可选的 SSH/Mosh 容器访问 |

</details>

<details>
<summary><strong>AI CLI，覆盖所有主要提供商</strong></summary>

| CLI | 命令 | 用途 |
|-----|---------|---------------|
| **Claude Code** | `claude` | 核心工具，你就运行在这里 |
| **Gemini CLI** | `gemini` | Google 的 AI 编码代理 |
| **OpenAI Codex** | `codex` | OpenAI 的编码代理 |
| **Cursor** | `cursor` | Cursor 的 AI 代理 |
| **TaskMaster AI** | `task-master` | 任务规划与编排 |
| **Junie** | `junie` | JetBrains 的 AI 编码代理 |
| **OpenCode** | `opencode` | 开源 AI 代理（支持 OpenRouter 和多个提供商） |
| **Pi Coding Agent** | `pi` | 最小化代理框架（支持多个提供商） |

八个 AI CLI，一个容器，瞬间切换。没有其他 Docker 镜像能做到这一点。

</details>

### 仅完整版包含（额外包）

完整版包含以上所有内容，外加：

<details>
<summary><strong>额外 npm 包，部署、ORM、性能工具</strong></summary>

| 包 | 用途 |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers 部署 |
| `vercel` | Vercel 部署 |
| `netlify-cli` | Netlify 部署 |
| `az` | Azure CLI，用于云部署和管理 |
| `prisma`, `drizzle-kit` | 两个最流行的 Node.js ORM |
| `pm2` | 生产环境进程管理器 |
| `eas-cli` | Expo / React Native 构建 |
| `lighthouse`, `@lhci/cli` | 性能审计（Chromium 已就绪） |
| `sharp-cli` | 图像处理 CLI |
| `json-server`, `http-server` | 模拟 REST API，静态文件服务 |
| `@marp-team/marp-cli` | Markdown 转演示文稿 |

</details>

<details>
<summary><strong>额外 Python 包，PDF、数据可视化、Web 框架</strong></summary>

| 包 | 用途 |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | 每一个主流 PDF 库。生成、读取、转换、合并，全都有。 |
| `xlsxwriter`, `xlrd` | openpyxl 之外的 Excel 格式支持 |
| `matplotlib`, `seaborn` | 数据可视化与图表 |
| `python-pptx` | PowerPoint 生成 |
| `fastapi`, `uvicorn` | Python Web 框架 |

</details>

<details>
<summary><strong>额外系统包，媒体与文档处理</strong></summary>

| 包 | 用途 |
|---------|---------------|
| `pandoc` | 任意文档格式互转（markdown、HTML、PDF、docx、epub...） |
| `ffmpeg` | 视频与音频处理（提取、转换、转码） |
| `libvips-dev` | 高性能图像处理库 |

</details>

> **Slim 用户：** 缺少某个包？让 Claude 来装。npm/pip 包只需几秒钟。系统包（pandoc、ffmpeg）需要 1-2 分钟。你获得的能力完全相同，完整版只是省去了等待时间。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :robot: AI CLI Providers

八个 AI CLI，一个容器，没有其他 Docker 镜像能给你这些。

| 提供商 | 命令 | 认证方式 | 支持订阅？ |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI Web UI（OAuth） | **是** — Max/Pro 计划或 API 密钥 |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY` 环境变量 | API 密钥（按量计费） |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` 或 `codex login --device-auth` | **是** — ChatGPT Plus/Pro/Team/Enterprise 或 API 密钥 |
| **Cursor** | `cursor` | `CURSOR_API_KEY` 环境变量 | API 密钥 |
| **TaskMaster AI** | `task-master` | 使用已有的 AI 提供商密钥 | 使用已配置的密钥 |
| **Junie** | `junie` | JetBrains AI 订阅 | 需要 JetBrains 账户 |
| **OpenCode** | `opencode` | 通过 TUI 配置 | 支持 OpenRouter 和多个提供商；仅 full image |
| **Pi Coding Agent** | `pi` | 通过 Pi 配置 | 支持多个提供商 |

> Claude Code 是主要 CLI。其他 CLI 的存在是因为有时你需要第二意见，或某个特定模型的优势，或者想比较不同的输出。让它们都在一个 `Tab` 的距离内，这就是重点所在。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :mag: Desloppify

Desloppify 在两个 image 中都作为 `desloppify` 命令提供。默认是 passive：除非你自己运行 Desloppify，否则 HolyClaude 不会运行 scan，不会创建 `.desloppify/`，不会编辑 `.gitignore`，也不会修改 mounted workspace。

```bash
desloppify scan --path .
desloppify next
```

扫描某个项目后，把 `.desloppify/` 加到该项目的 `.gitignore`。

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` 只关闭自动全局 skill 设置；CLI 仍然安装。`all` 表示 `claude,codex,gemini`。`opencode` 仅 full image 可用，并且不包含在 `all` 中。不要在自动设置中同时使用 `claude` 和 `opencode`，因为 OpenCode 也能从 `~/.claude/skills` 发现 Claude-compatible skills。

手动 upstream targets: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ 返回顶部</a>
</p>

---

## :llama: Using Ollama

HolyClaude 支持使用 [Ollama](https://ollama.com) 作为 Anthropic 订阅的替代方案。设置两个环境变量即可使用本地或云端模型。

查看完整配置指南：**[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :building_construction: Architecture

```mermaid
graph TB
    subgraph Docker Container
        EP["entrypoint.sh"] --> BS["bootstrap.sh\n(first boot only)"]
        EP --> S6["s6-overlay\n(PID 1)"]
        S6 --> CC["CloudCLI\n(:3001)"]
        S6 --> XV["Xvfb\n(:99)"]
        CC --> CLAUDE["Claude Code CLI"]
        CLAUDE --> TOOLS["Dev Tools\n(Node, Python, Git...)"]
        CLAUDE --> CHROME["Chromium\n(headless)"]
        XV -.-> CHROME
    end

    subgraph Host
        DATA["./data/claude"] -.->|bind mount| HOME["~/.claude"]
        WS["./workspace"] -.->|bind mount| WORK["/workspace"]
    end

    USER["Browser"] -->|":3001"| CC

    style S6 fill:#2d3748,color:#fff
    style CC fill:#6366f1,color:#fff
    style CLAUDE fill:#f59e0b,color:#000
```

### 各组件如何协同工作

1. **容器启动** — `entrypoint.sh` 以 root 运行。重新映射 UID/GID 以匹配宿主机用户，在 bootstrap 接触它之前恢复已保存的 Claude Code 会话，并检查是否为首次启动。

2. **仅首次启动** — `bootstrap.sh` 运行一次。复制默认配置、memory 模板，配置 git 身份。创建哨兵文件（`.holyclaude-bootstrapped`）确保不再重复运行。从此你的自定义配置是安全的。

3. **s6-overlay 接管成为 PID 1** — 这不是 supervisord。这是 [s6-overlay](https://github.com/just-containers/s6-overlay)，专为 Docker 构建。监督 CloudCLI、Xvfb 和 Claude 会话同步，崩溃后自动重启，转发信号，回收僵尸进程，优雅关闭。

4. **CloudCLI 提供 Web UI** — 端口 3001。基于浏览器的 Claude Code 界面，支持项目管理、多会话和插件（项目统计 + Web 终端均已预装）。

5. **Xvfb 提供兼容显示器** — Xvfb 继续在 `:99` 为使用可见显示器的工具提供兼容环境。现代无头 Chromium、Playwright 和 Lighthouse 并不总是需要 Xvfb。

查看 [docs/architecture.md](docs/architecture.md) 获取完整技术深入说明，包括我们为何选择 s6 而非 supervisord、为何将插件内置到镜像中，以及为何使用 `runuser` 而非 `su`。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :file_folder: Project Structure

```
holyclaude/
├── .github/                 # CI/CD workflows, issue & PR templates
│   ├── FUNDING.yml          # Sponsor/donation links
│   ├── ISSUE_TEMPLATE/      # Bug report, feature request, package request
│   ├── pull_request_template.md
│   ├── SECURITY.md          # Security policy
│   └── workflows/           # Docker build & push automation
├── assets/                  # Logo and banner images
├── config/                  # Claude Code configuration
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # Extended documentation
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # Container lifecycle scripts
│   ├── bootstrap.sh         # First-run setup
│   ├── entrypoint.sh        # Container entrypoint
│   └── notify.py            # Notification helper (Apprise)
├── s6-overlay/              # Process supervision (s6-rc services)
├── Dockerfile               # Single-stage build
├── docker-compose.yaml      # Quick start (minimal config)
├── docker-compose.full.yaml # Full config (all options)
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :floppy_disk: Data & Persistence

| 内容 | 容器内路径 | 宿主机路径 | 重建后是否保留？ |
|------|-------------------|-------------|-------------------|
| 配置、凭证、API 密钥 | `/home/claude/.claude` | `./data/claude` | **是** |
| Claude Code 会话（OAuth、引导） | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **是** |
| 你的代码和项目 | `/workspace` | `./workspace` | **是** |
| CloudCLI 账户 | `/home/claude/.cloudcli` | *(默认仅容器内 — 见下文)* | 否（可选持久化） |

HolyClaude 会在启动创建新的默认文件之前恢复已保存的 Claude Code 会话。这样 rebuild 和 recreate 不会用 onboarding 状态替换真实的 OAuth/API 会话。

### 执行 `docker compose down && docker compose up` 后保留的内容：
- 你的 Anthropic 认证和 API 密钥
- Claude Code 配置、memory（`CLAUDE.md`）和 OAuth 会话（无需重新登录）
- `./workspace` 中的所有代码
- Git 配置
- Codex、Gemini 和 Cursor CLI 认证（自 v1.1.7 起）

### 需要重新完成的操作（10 秒）：
- CloudCLI Web 账户，快速注册即可（除非你启用下方的持久化）

### 重新触发首次启动配置：
```bash
# Delete the sentinel file — NOT the whole folder
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **永远不要删除 `./data/claude/` 整个目录。** 你的凭证就存储在那里。如果想重新引导，删除哨兵文件。如果想重置配置，删除特定的配置文件。但绝对不要删除整个目录。

### 持久化 CloudCLI 账户（可选，仅本地存储）

默认情况下，CloudCLI 账户数据库（`~/.cloudcli`）是容器本地的，重建时会被清除。重新创建账户只需 10 秒，所以大多数人直接跳过。

如果你想让它在重建后保留，在 compose 文件中添加一个 **named Docker volume**：

```yaml
services:
  holyclaude:
    volumes:
      - ./data/claude:/home/claude/.claude
      - ./workspace:/workspace
      - cloudcli-data:/home/claude/.cloudcli   # add this line

volumes:
  cloudcli-data:                                # and this block
```

> **不要将 `./data/cloudcli` bind-mount 到网络共享（NAS、SMB/CIFS、NFS）上。** CloudCLI 将账户存储在 SQLite 中，而 SQLite 的文件锁在网络挂载上会失效。你会不断遇到 `database is locked` 错误。Named volume 存储在 Docker 引擎的本地文件系统上，这就是为什么它能正常工作 — 指向 NAS 的 bind mount 不会生效。

bind mount 到本地 SSD 路径也可以，只要不挂载到任何网络共享上就行。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :lock: Permissions

Claude Code 默认在 **`acceptEdits`** 模式下运行。这是随镜像发布的设置：

| 操作 | 是否允许？ |
|--------|----------|
| 读取文件 | 是 |
| 编辑/创建文件 | 是 |
| 运行 shell 命令 | **会先询问你** |
| 安装包 | **会先询问你** |

### 想要完全绕过？（高级用户）

这是我个人的运行方式。在宿主机上编辑 `./data/claude/settings.json`：

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **绕过模式意味着 Claude 无需确认即可执行命令。** 它很强大，但也会很快执行破坏性命令。除非你信任工作区和每个提示，否则请保留随镜像发布的 `acceptEdits` 默认值。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :shield: 远程访问与安全

HolyClaude 将 CloudCLI 绑定到端口 `3001`。默认情况下这只是本地访问 — 在你的笔记本或通过 SSH 访问的家庭服务器上运行完全没问题。

**一旦你想从外部网络访问，请阅读本节。**

### 不要将其端口转发到公共互联网

直说了：不要在路由器上打洞，把 `3001` 暴露到开放互联网上。哪怕加了密码也不行。原因如下：

- CloudCLI 通过 web terminal 插件暴露了完整的 shell
- 它可以执行任意代码、安装软件包，并读写你整个 `/workspace`
- 它存储着你的 Anthropic OAuth token 和 API 密钥
- 基础认证密码会被暴力破解、凭证填充，并从日志中提取
- 一个泄露的密码 = 别人用你的钱在你的机器上运行付费的 Claude Code 实例

密码是减速带，不是门。把 HolyClaude 当 SSH 会话对待：没有合适的隧道，绝不暴露在开放互联网上。

### 用合适的隧道代替

这是我真正推荐的两个选项：

| 选项 | 适合谁 | 原因 |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | 个人使用、小团队 | WireGuard mesh VPN。在服务器和笔记本/手机上安装 Tailscale，就能从任何地方访问 `http://holyclaude:3001`，就像在局域网一样。无需开放端口、DNS 或证书。个人使用免费。 |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | 与他人共享、公共域名 | Cloudflare 代理连接，端口 `3001` 保持关闭。你获得带 HTTPS 的真实域名，还可以在前面加上 Cloudflare Access（Google/GitHub SSO）。免费套餐覆盖大多数个人使用场景。 |

两者都能提供：
- 路由器上零开放端口
- 端到端加密传输
- 真正基于身份的认证（不是共享密码）
- 审计日志

### 如果你坚持直接暴露（请不要这样做）

如果你绝对必须跳过隧道（自托管教程、隔离实验室网络等），至少做到：

1. **在前面放一个反向代理**（Caddy、nginx、Traefik）并配置真实 TLS
2. **在防火墙或代理层添加 IP 白名单** — 只允许你的已知 IP
3. **保留随镜像发布的 `acceptEdits` 默认值**，除非你明确需要 `bypassPermissions`
4. **如果发现异常，轮换你的 Anthropic 凭证**
5. **在 Cloudflare Access 或类似 SSO 后面运行**，而不是基础认证

即便如此，风险面依然很大。用 Tailscale 或 Cloudflare Tunnel。它们免费，五分钟就能配好，也是我个人在用的方案。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :bell: Notifications

离开电脑后，在 Claude 完成任务时收到通知。使用 [Apprise](https://github.com/caronc/apprise) 发送通知，支持 100+ 服务，包括 Discord、Telegram、Slack、Email、Pushover、Gotify 等。

**启用方式：**

1. 在 compose 的 `environment` 中添加一个或多个 `NOTIFY_*` 变量：
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. 在容器内执行：`touch ~/.claude/notify-on`

查看[配置文档](docs/configuration.md#notifications-apprise)获取所有支持的变量和 URL 格式。

**禁用方式：** `rm ~/.claude/notify-on`

**触发通知的事件：**
| 事件 | 说明 |
|-------|--------------|
| `stop` | Claude 完成了当前任务 |
| `error` | 发生了工具调用失败 |

> 未配置时完全静默。没有设置 `NOTIFY_*` 变量？没有标志文件？零网络调用，零日志垃圾，零开销。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d
```

你的数据保留在 `./data/claude` 和 `./workspace` 中，升级只会替换容器，不会影响你的文件。

不要在容器内运行 `cloudcli update` 或 `npm install -g @cloudcli-ai/cloudcli@latest`。HolyClaude 随附已打补丁的 CloudCLI 运行时；请使用 `docker compose pull && docker compose up -d` 更新。

如果想固定到特定版本而非 `latest`：

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI 显示错误的默认目录</strong></summary>

CloudCLI 打开到 `/home/claude` 而非 `/workspace`。

**原因：** 自定义或修改过的 CloudCLI 服务脚本在启动 CloudCLI 前没有设置 `WORKSPACES_ROOT=/workspace`。

**解决方案：** HolyClaude 已处理此问题。s6 run 脚本直接在进程环境中设置 `WORKSPACES_ROOT=/workspace`。
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**原因：** SQLite 数据库存储在 SMB/CIFS 网络挂载上。CIFS 不支持 SQLite 所需的文件级锁定。

**解决方案：** 不要将 SQLite 数据库存储在网络共享上。HolyClaude 将 `.cloudcli` 保存在容器本地存储中正是出于这个原因。如果你在 NAS 上的 `/workspace` 中有自己的 SQLite 数据库，请将它们迁移到本地路径。
</details>

<details>
<summary><strong>Chromium 崩溃 / 空白页面 / 标签页失败</strong></summary>

**原因：** 共享内存不足。Docker 默认只有 64MB。

**解决方案：** 确保 compose 文件中有 `shm_size: 2g`。对于重度浏览器使用（多标签页、复杂页面），增加到 `4g`。
</details>

<details>
<summary><strong>文件监视器未检测到变更（热重载失效）</strong></summary>

**原因：** SMB/CIFS 网络挂载不支持 `inotify`。

**解决方案：** 在 compose 环境中启用轮询：
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
注意：轮询比 inotify 消耗更多 CPU。仅在网络挂载上启用。
</details>

<details>
<summary><strong>权限拒绝错误</strong></summary>

**原因：** 容器 UID/GID 与宿主机文件所有权不匹配。

**解决方案：**
```bash
# On your host machine
id -u  # → this is your PUID
id -g  # → this is your PGID
```
在 compose 文件中设置：
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker 将 .claude.json 创建为目录</strong></summary>

**原因：** 如果绑定挂载的目标文件在容器启动前不存在，Docker 会"贴心地"将其创建为目录。谢谢你，Docker。

**解决方案：** 已处理，`entrypoint.sh` 会先恢复已保存的会话文件；如果没有保存的会话，才创建安全的默认文件。
</details>

查看 [docs/troubleshooting.md](docs/troubleshooting.md) 获取完整指南，包括所有 SMB/CIFS 注意事项以及我们遇到并修复的 bug 完整历史。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :warning: Known Issues

以下不是 HolyClaude 的 bug，而是上游问题或有意为之的权衡。

| 问题 | 原因 | 解决方案 |
|-------|-----|------------|
| "Continue in Shell" 按钮无效 | CloudCLI 上游 bug（终端初始化中的竞争条件） | 改用 **Web Terminal** 插件（已预装） |
| Cursor CLI "Command timeout" | 未配置 API 密钥，仅为视觉提示，不影响任何功能 | 设置 `CURSOR_API_KEY` 或忽略 |
| 重建后 CloudCLI 账户丢失 | SQLite 无法在网络挂载上持久化，有意为之的权衡 | 重新创建账户（约 10 秒） |
| Web 推送通知"不支持" | CloudCLI 中的浏览器限制，标准行为 | 改用 Apprise 通知（参见[通知](#bell-notifications)） |

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :hammer_and_wrench: Building Locally

想自己构建镜像而不是从 Docker Hub 拉取？完全没问题：

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# Build full image
docker build -t holyclaude .

# Build slim image
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# Build for ARM (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

然后在 compose 文件中使用 `image: holyclaude` 替代 `image: coderluii/holyclaude:latest`。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :bar_chart: Alternatives

HolyClaude 与其他方案的对比：

| 方案 | Web UI | 多 AI | 预配置工具 | 无头浏览器 | 一键启动 | 持久化 |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 个 CLI | 50+ 工具 | Chromium + Xvfb + Playwright | `docker compose up` | 绑定挂载 |
| Claude Code（裸机） | 无 | 无 | 自行安装 | 自行安装 | 多步骤安装 | 手动 |
| Claude Code + oh-my-openagent | 无 | 是（多模型） | 部分 | 无 | npm install | 手动 |
| DIY Docker + Claude Code | 也许 | 也许 | 你自己添加的 | 如果你配置了 | 如果你写了 Dockerfile | 如果你设置了 volumes |
| Cursor IDE | 内置 | 仅 Cursor | IDE 内置 | 无 | 下载应用 | 应用数据 |

HolyClaude 不是在与编码代理竞争，它是让所有这些代理都能更好运行的**基础设施层**。它是你运行这些代理的容器。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :rocket: Roadmap

即将推出的内容：

| 状态 | 功能 |
|--------|---------|
| 🔜 | **ARM 原生构建** — 优化的原生 ARM64 镜像，不再只是模拟 |
| 🔜 | **VS Code 隧道集成** — 内置 VS Code Server 或隧道，用于从 VS Code 桌面连接 |
| 🔜 | **通知路由** — 针对不同事件类型配置不同的通知目标（错误发送到 Telegram，完成发送到 Discord） |

有想法？[发起讨论](https://github.com/CoderLuii/HolyClaude/discussions)或[提交功能请求](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml)。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :trophy: Built with HolyClaude

用 HolyClaude 构建了什么？我们很乐意看到。

提交一个带有 `showcase` 标签的 issue，或提 PR 将你的项目添加到这里：

<!-- Add your project: [Project Name](url) — one-line description -->

*成为第一个在此展示项目的人。*

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :handshake: Contributing

欢迎贡献。这个项目诞生于真实的日常使用，越多人使用并发现边缘情况，它就会变得越好。

1. Fork 它
2. 创建分支（`git checkout -b feature/something`）
3. 提交代码
4. 推送分支
5. 提 PR

Bug 报告、功能请求、问题：[提交 issue](https://github.com/CoderLuii/HolyClaude/issues)。

### 联系方式

| 渠道 | 用途 |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | 问题、展示你的配置、想法 |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Bug 报告、功能和包请求 |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | 漏洞报告（私密） |

### 想添加某个工具？

使用 [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml) issue 模板。请说明包名、安装方式以及目标版本（完整版/Slim 版）。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :heart: Support

HolyClaude 是免费开源的，由一位每天都在使用它的开发者维护。

如果它为你节省了时间，以下是你可以提供帮助的方式：

- **给这个仓库加星** — 这是你能为项目可见度做的最重要的事
- **分享它** — 告诉朋友，发帖，转推
- **提交 issue** — Bug 报告和功能请求让 HolyClaude 对每个人都更好
- **贡献代码** — 始终欢迎 PR

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :scroll: Third-Party Software

HolyClaude Docker 镜像包含第三方软件，每个组件均有其各自的许可证。主要组件：

| 组件 | 许可证 | 来源 |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

查看 [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) 获取完整详情，包括修改声明。HolyClaude 自身的源代码采用 MIT 许可证。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

## :page_facing_up: License

MIT — 查看 [LICENSE](LICENSE)。随意使用。

<p align="right">
  <a href="#top">↑ 回到顶部</a>
</p>

---

<!-- Star History -->
<div align="center">
<a href="https://star-history.com/#CoderLuii/HolyClaude&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" width="600" />
  </picture>
</a>
</div>

---

<div align="center">

由 [CoderLuii](https://github.com/coderluii) 构建 · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

这个容器是我每天都在使用的。如果它为你节省了哪怕一半的配置时间，点个星就太好了。

</div>
