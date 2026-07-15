🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | **한국어**

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

### 설정은 그만. 이제 만들기 시작하세요.

명령어 하나. 완전한 AI 개발 워크스테이션. Claude Code, 웹 UI, 헤드리스 브라우저, 8개의 AI CLI, 50개 이상의 개발 도구 — 컨테이너화되어 바로 사용 가능.

**수동으로 설정하는 데 2시간을 쓸 뻔했죠. 아니면 그냥 `docker compose up`을 실행하면 됩니다.**

**기존 Claude Code 구독으로 바로 작동합니다.** Max/Pro 플랜, API 키 — 무엇을 가지고 있든 그냥 작동합니다.

---

## 이게 뭔가요?

다 아는 얘기죠. Claude Code가 필요합니다. 그런데 브라우저에서도 쓰고 싶습니다. 스크린샷과 테스트를 위한 헤드리스 브라우저도요. Playwright도 설정하고 싶고, 모든 AI CLI도 필요합니다. TypeScript, Python, 배포 도구, 데이터베이스 클라이언트, GitHub CLI도요.

그래서 하나씩 설치하기 시작합니다. 그러다 Docker의 공유 메모리가 64MB라서 Chromium이 실행되지 않습니다. Xvfb도 설정되지 않았습니다. 컨테이너 내부의 UID가 호스트와 맞지 않아서 모든 게 permission denied입니다. Claude Code 인스톨러가 WORKDIR이 root 소유일 때 멈춥니다. NAS 마운트에서 SQLite가 잠깁니다. 그리고 —

**HolyClaude는 이 모든 문제를 해결한 후 제가 만든 컨테이너입니다.**

저는 몇 주 동안 제 서버에서 매일 이것을 사용했습니다. 모든 버그를 직접 경험하고, 진단하고, 수정했습니다. 모든 엣지 케이스가 처리되었습니다. "Docker에서 왜 이게 안 되지?"라는 모든 질문에 답이 있습니다.

그냥 pull하세요. 실행하세요. 브라우저를 여세요. 만드세요.

### :credit_card: 기존 구독 사용하기

**이것은 실제 Claude Code CLI를 실행합니다.** 래퍼가 아닙니다. 프록시가 아닙니다. 짝퉁이 아닙니다.

기존 Anthropic 계정이 바로 작동합니다:
- **Claude Max/Pro 플랜** — 웹 UI를 통해 인증 (OAuth), 데스크톱 Claude Code와 동일
- **Anthropic API 키** — 웹 UI에서 설정, 평소와 동일한 청구
- **추가 비용 없음** — HolyClaude는 무료 오픈 소스입니다. Anthropic에는 이미 사용하던 대로만 지불하면 됩니다.

> HolyClaude는 자격 증명에 손대지 않습니다. 바인드 마운트된 볼륨(`./data/claude/`)에 로컬로 저장되며, 베어 메탈과 동일합니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## 목차

| | 섹션 |
|---|---|
| :zap: | [빠른 시작](#zap-quick-start) |
| :computer: | [플랫폼 지원](#computer-platform-support) |
| :star2: | [HolyClaude를 쓰는 이유](#star2-why-holyclaude) |
| :credit_card: | [구독 및 인증](#credit_card-subscription--authentication) |
| :package: | [이미지 종류](#package-image-variants) |
| :whale: | [Docker Compose — 빠른 시작](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — 전체 설정](#whale2-docker-compose--full) |
| :wrench: | [환경 변수](#wrench-environment-variables) |
| :rocket: | [포함된 것들](#rocket-whats-inside) |
| :robot: | [AI CLI 제공자](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Ollama 사용하기](#llama-using-ollama) |
| :building_construction: | [아키텍처](#building_construction-architecture) |
| :file_folder: | [프로젝트 구조](#file_folder-project-structure) |
| :floppy_disk: | [데이터 및 영속성](#floppy_disk-data--persistence) |
| :lock: | [권한](#lock-permissions) |
| :shield: | [원격 접근 및 보안](#shield-remote-access--exposure) |
| :bell: | [알림](#bell-notifications) |
| :arrows_counterclockwise: | [업그레이드](#arrows_counterclockwise-upgrading) |
| :construction: | [문제 해결](#construction-troubleshooting) |
| :warning: | [알려진 문제](#warning-known-issues) |
| :hammer_and_wrench: | [로컬 빌드](#hammer_and_wrench-building-locally) |
| :bar_chart: | [대안 비교](#bar_chart-alternatives) |
| :rocket: | [로드맵](#rocket-roadmap) |
| :trophy: | [HolyClaude로 만든 것들](#trophy-built-with-holyclaude) |
| :handshake: | [기여하기](#handshake-contributing) |
| :heart: | [지원하기](#heart-support) |
| :scroll: | [서드파티 소프트웨어](#scroll-third-party-software) |
| :page_facing_up: | [라이선스](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :zap: Quick Start

**1.** HolyClaude용 폴더 생성:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** `docker-compose.yaml` 파일 생성. 아래 템플릿 중 하나를 복사하세요:
- [빠른 템플릿](#whale-docker-compose--quick) — 최소 설정, 설정 불필요, 그냥 작동
- [전체 템플릿](#whale2-docker-compose--full) — 모든 옵션, 완전히 문서화됨

**3.** Pull 및 시작:

```bash
docker compose up -d
```

**4.** 웹 UI 열기:

```
http://localhost:3001
```

**5.** CloudCLI 계정 생성 (10초 소요), Anthropic 계정으로 로그인하면 바로 시작됩니다.

> `.env` 파일 없음. 사전 설정 없음. 시작 전에 40페이지의 문서를 읽을 필요 없음. 그냥 실행됩니다.

> **외부 네트워크에서 접근하고 싶으신가요?** 포트 포워딩하지 마세요. [원격 접근 및 보안](#shield-remote-access--exposure) 참조 — Tailscale이나 Cloudflare Tunnel을 사용하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :computer: Platform Support

| 플랫폼 | 상태 | 비고 |
|----------|--------|-------|
| Linux (amd64) | ✅ 완전 지원 | 네이티브 성능, 권장 |
| Linux (arm64) | ✅ 완전 지원 | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ 완전 지원 | Apple Silicon 및 Intel (Docker Desktop 경유) |
| Windows (WSL2 + Docker Desktop) | ✅ 완전 지원 | WSL2 백엔드 필요 |
| Synology / QNAP NAS | ✅ 완전 지원 | SMB 마운트에는 `CHOKIDAR_USEPOLLING=true` 사용 |
| Kubernetes | 🔜 출시 예정 | Helm 차트 계획 중 |

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :star2: Why HolyClaude

매번 같은 설정을 반복하는 게 지겨워서 만들었습니다. Claude Code 설치, 웹 UI 연결, Docker에서 Chromium 설정, 권한 문제 수정, 프로세스 감독 디버깅. 매번 같은 일의 반복.

그래서 이 모든 걸 해주는 컨테이너를 만들었습니다. 그리고 모든 가능한 버그를 직접 경험했으니 여러분은 그럴 필요가 없습니다.

| | HolyClaude | 직접 설정 |
|---|---|---|
| **설정** | 30초 | 1-2시간 (잘 되면) |
| **Claude Code** | 사전 설치, 사전 설정, 바로 사용 | 설치, 설정, 인스톨러 멈춤 디버깅, WORKDIR 수정 |
| **웹 UI** | CloudCLI 플러그인 포함 | 웹 UI 찾기, 설치, 설정, Claude에 연결 |
| **헤드리스 브라우저** | Chromium + Xvfb + Playwright, 설정 완료 | Chromium 설치, Xvfb 설치, 디스플레이 :99 설정, shm 수정, sandbox 수정, seccomp 수정... |
| **AI CLI** | 8개 제공자, 하나의 컨테이너 | 3개의 패키지 매니저로 각각 설치 |
| **개발 도구** | 50개 이상 도구, 바로 사용 | 한 시간 동안 `apt-get install` / `npm i -g` / `pip install` |
| **프로세스 관리** | s6-overlay (자동 재시작, 정상 종료) | supervisord 설정 직접 작성 또는 Docker restart 믿기 |
| **영속성** | 바인드 마운트, 자격 증명 영구 보존 | Docker 볼륨 파악, "왜 파일이 아닌 디렉터리인가" 디버깅 |
| **업데이트** | `docker pull && docker compose up -d` | 50개 도구 수동 업데이트, 아무것도 깨지지 않길 기도 |
| **멀티 아키텍처** | AMD64 + ARM64 | Dockerfile이 ARM에서 빌드되길 기도 |

**모든 수동 설정의 마지막 줄은 "내 컴퓨터에서는 됩니다."** HolyClaude는 모든 컴퓨터에서 됩니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude는 Anthropic의 **공식 Claude Code CLI**를 실행합니다. 기존 계정이 즉시 작동합니다.

### 작동하는 것:

| 인증 방법 | 방법 | 비용 |
|----------------------|-----|------|
| **Claude Max/Pro 플랜** (구독) | CloudCLI 웹 UI에서 로그인 — 데스크톱과 동일한 OAuth 플로우 | 기존 구독, 추가 요금 없음 |
| **Anthropic API 키** | 웹 UI에 API 키 붙여넣기 | 사용량 기반 과금, 동일한 Anthropic 청구 |

### 작동하지 않는 것:

| | 이유 |
|---|---|
| Claude용 OpenAI API 키 | 다른 회사, 다른 API. OpenAI 키는 (사전 설치된) **Codex CLI**에서 작동합니다 |

> **ChatGPT Plus/Pro 구독자:** 구독은 **Codex CLI**에서 작동합니다. 컨테이너 내에서 `codex login --device-auth`를 실행하여 ChatGPT 계정으로 인증하세요.

### 포함된 다른 AI CLI:

| CLI | 필요한 것 |
|-----|--------------|
| Gemini CLI | Google AI API 키 (`GEMINI_API_KEY`) |
| OpenAI Codex | OpenAI API 키 (`OPENAI_API_KEY`) 또는 ChatGPT Plus/Pro 구독 (`codex login --device-auth`) |
| Cursor | Cursor API 키 (`CURSOR_API_KEY`) |
| TaskMaster AI | AI 제공자 키 사용 (Anthropic, OpenAI 등) |
| Junie | JetBrains 계정 (JetBrains AI 구독) |
| OpenCode | `opencode` TUI로 설정 (OpenRouter 및 여러 제공자 지원) |
| Pi Coding Agent | `pi`로 설정 (여러 제공자 지원) |

> **HolyClaude는 무료 오픈 소스입니다.** AI 제공자에게만 사용량에 따라 지불하면 되며, 이미 그렇게 하고 있는 것과 동일합니다. 자격 증명을 프록시하거나 가로채거나 건드리지 않습니다. 로컬 바인드 마운트에 저장됩니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :package: Image Variants

두 가지 버전. 동일한 품질. 용량 클래스를 선택하세요.

| 태그 | 포함 내용 | 적합한 사용자 |
|-----|-------------|----------|
| **`latest`** | 모든 것 사전 설치 — 모든 도구, 모든 라이브러리, 모든 CLI | 대부분의 사용자. 대기 시간 없음. Claude가 무언가 설치하기 위해 멈출 필요 없음. |
| **`slim`** | 핵심 도구만 — Claude가 추가 도구를 필요 시 설치 | 소형 VPS, 제한된 디스크, 종량제 대역폭 |
| `X.Y.Z` | 전체 이미지, 고정 버전 | 프로덕션 안정성 — 업데이트 시점을 직접 제어 |
| `X.Y.Z-slim` | Slim 이미지, 고정 버전 | 프로덕션 + 작은 용량 |

```bash
# 전체 — 배터리 포함 (권장)
docker pull coderluii/holyclaude

# Slim — 가볍게
docker pull coderluii/holyclaude:slim
```

> **`latest`는 항상 전체 이미지입니다.** Slim 사용자: 걱정 마세요 — Claude에게 없는 도구가 필요한 작업을 요청하면 몇 초 안에 설치됩니다. 동일한 기능을 제공하되, 초기 다운로드 크기만 작습니다.
>
> Docker Hub는 압축된 전송 크기를 표시합니다. `latest`는 약 4.1 GB, `slim`은 약 2.4 GB입니다. Docker, Synology Container Manager, NAS 파일시스템은 레이어가 풀린 뒤 더 큰 크기로 표시할 수 있습니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :whale: Docker Compose — Quick

"그냥 실행되기만 하면 돼" 템플릿. 이 전체 블록을 `docker-compose.yaml` 파일에 복사하세요:

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

그런 다음:

```bash
docker compose up -d
```

`http://localhost:3001`을 여세요. CloudCLI 계정을 만드세요. Anthropic 계정으로 로그인하세요. 무언가를 만드세요.

**설정은 이게 전부입니다. 완료되었습니다.**

> **왜 이런 브라우저 권한인가요?** 이번 릴리스는 HolyClaude의 현재 브라우저 프로필을 유지합니다. `SYS_ADMIN`과 `seccomp=unconfined`는 프로세스 권한을 넓히고 격리를 약화시키며, `SYS_PTRACE`는 디버깅용입니다. v1.5.0에서는 이 프로필을 그대로 유지하고, 하드닝은 별도 변경으로 다루세요.

> **왜 `shm_size: 2g`인가요?** Docker는 기본으로 공유 메모리 64MB만 줍니다. HolyClaude는 이번 릴리스의 유지된 기본값으로 2GB를 둡니다. Chromium이 탭 렌더링에 `/dev/shm`을 많이 쓰기 때문입니다. 64MB에서는 탭이 깨집니다. 브라우저 사용이 많으면 4GB로 올리세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :whale2: Docker Compose — Full

동일한 이미지, 모든 설정 노출. 이 전체 블록을 `docker-compose.yaml` 파일에 복사하세요:

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

그런 다음:

```bash
docker compose up -d
```

compose를 편집하지 않고 호스트 포트나 바인드 마운트 경로를 변경하려면 `.env.example`을 `.env`에 복사하고 다음을 설정하세요:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

이 값들은 호스트에서 Docker Compose가 읽습니다. 컨테이너 환경 변수가 아닙니다.

### 각 섹션이 제어하는 것:

| 섹션 | 역할 | 변경 시점 |
|---------|-------------|-------------------|
| **Timezone** | 컨테이너 시계 | 항상 — 로컬 TZ로 설정 |
| **Performance** | Node.js 메모리 한도 | 대규모 프로젝트에서 OOM 오류가 발생할 때만 |
| **User mapping** | 컨테이너와 호스트 간 파일 권한 | "permission denied" 발생 시 (호스트에서 `id -u` 및 `id -g` 실행) |
| **SMB/CIFS** | 파일 감시자 폴링 모드 | 볼륨이 NAS 또는 네트워크 공유에 있을 때만 |
| **Notifications** | Apprise를 통한 푸시 알림 (Discord, Telegram, Slack, Email, 100개 이상 서비스) | 자리를 비우면서 Claude 작업 완료를 알고 싶을 때 |
| **AI providers** | Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent용 API 키 | Claude 외의 AI CLI를 사용하고 싶을 때 |

> **모든 환경 변수는 선택 사항입니다.** 컨테이너는 `TZ=UTC`만으로도 완벽하게 실행됩니다. 나머지는 합리적인 기본값이 있거나 웹 UI를 통해 처리됩니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :wrench: Environment Variables

전체 참조. 모든 변수, 기본값, 역할.

| 변수 | 기본값 | 역할 |
|----------|---------|--------------|
| `TZ` | `UTC` | 컨테이너 시간대 |
| `PUID` | `1000` | Docker 방식 컨테이너 사용자 ID; rootless Podman은 `docker-compose.podman-rootless.yaml` 사용 |
| `PGID` | `1000` | Docker 방식 컨테이너 그룹 ID; rootless Podman은 `docker-compose.podman-rootless.yaml` 사용 |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js 힙 메모리 한도 (MB) |
| `GIT_USER_NAME` | `HolyClaude User` | Git 커밋 작성자 (첫 부팅 시 한 번 설정) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git 커밋 이메일 (첫 부팅 시 한 번 설정) |
| `CHOKIDAR_USEPOLLING` | *(미설정)* | SMB/CIFS용 `1`로 설정 — 폴링 파일 감시자 활성화 |
| `WATCHFILES_FORCE_POLLING` | *(미설정)* | SMB/CIFS용 `true`로 설정 — Python 폴링 활성화 |
| `NOTIFY_DISCORD` | *(미설정)* | 알림용 Discord 웹훅 URL |
| `NOTIFY_TELEGRAM` | *(미설정)* | 알림용 Telegram 봇 URL |
| `NOTIFY_PUSHOVER` | *(미설정)* | 알림용 Pushover URL |
| `NOTIFY_SLACK` | *(미설정)* | 알림용 Slack 웹훅 URL |
| `NOTIFY_EMAIL` | *(미설정)* | 알림용 이메일 (SMTP) URL |
| `NOTIFY_GOTIFY` | *(미설정)* | 알림용 Gotify URL |
| `NOTIFY_URLS` | *(미설정)* | 범용 — 쉼표로 구분된 [Apprise URLs](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(미설정)* | Anthropic API 키 (웹 UI OAuth 대안) |
| `ANTHROPIC_AUTH_TOKEN` | *(미설정)* | Anthropic 인증 토큰 (API 키 대안) |
| `ANTHROPIC_BASE_URL` | *(미설정)* | 사용자 정의 Anthropic API 엔드포인트 (프록시, 프라이빗 배포) |
| `CLAUDE_CODE_USE_BEDROCK` | *(미설정)* | Amazon Bedrock 백엔드 사용 시 `1`로 설정 |
| `CLAUDE_CODE_USE_VERTEX` | *(미설정)* | Google Vertex AI 백엔드 사용 시 `1`로 설정 |
| `GEMINI_API_KEY` | *(미설정)* | Google Gemini API 키 |
| `OPENAI_API_KEY` | *(미설정)* | OpenAI API 키 (Codex CLI용, 또는 ChatGPT 구독은 `codex login --device-auth` 사용) |
| `CURSOR_API_KEY` | *(미설정)* | Cursor API 키 |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | 선택적 Desloppify 전역 skill 설정. 값: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` 또는 쉼표로 구분한 조합 |
| `OLLAMA_HOST` | *(미설정)* | Ollama 엔드포인트 URL (예: `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :rocket: What's Inside

이것은 최소한의 컨테이너가 아닙니다. 완전한 개발 워크스테이션입니다.

### 두 버전 모두 포함 (full + slim)

<details>
<summary><strong>Node.js 26 + npm 글로벌 패키지</strong></summary>

| 패키지 | 용도 |
|---------|---------------|
| `typescript`, `tsx` | TypeScript 컴파일 및 실행 |
| `pnpm` | 빠르고 디스크 효율적인 패키지 매니저 |
| `vite`, `esbuild` | 초고속 빌드 도구 |
| `eslint`, `prettier` | 코드 품질 및 포매팅 |
| `serve`, `nodemon` | 정적 파일 서버, 자동 재시작 개발 서버 |
| `concurrently` | 여러 스크립트 병렬 실행 |
| `dotenv-cli` | `.env` 파일에서 환경 변수 로드 |

</details>

<details>
<summary><strong>Python 3 패키지</strong></summary>

| 패키지 | 용도 |
|---------|---------------|
| `requests`, `httpx` | HTTP 클라이언트 |
| `beautifulsoup4`, `lxml` | 웹 스크래핑 및 HTML 파싱 |
| `Pillow` | 이미지 처리 (사전 컴파일 — 대기 없음) |
| `pandas`, `numpy` | 데이터 조작 (사전 컴파일 — 런타임에 pip install 하고 싶지 않을 겁니다) |
| `openpyxl` | Excel 파일 읽기/쓰기 |
| `python-docx` | Word 문서 읽기/쓰기 |
| `jinja2`, `markdown` | 템플릿 및 마크다운 렌더링 |
| `pyyaml`, `python-dotenv` | 설정 파일 파싱 |
| `rich`, `click`, `tqdm` | 아름다운 CLI 및 진행 표시줄 |
| `desloppify`, `bandit`, `tree-sitter` | 코드 품질 스캔, Python 보안 체크, parser 기반 코드 분석 |
| `playwright` | 브라우저 자동화 (Chromium이 이미 설정되어 사용 준비 완료) |

</details>

<details>
<summary><strong>시스템 도구</strong></summary>

| 도구 | 용도 |
|------|---------------|
| `git`, `gh` | 버전 관리 + GitHub CLI (터미널에서 PR, 이슈, 릴리스) |
| `ripgrep` (`rg`), `fd`, `fzf` | 초고속 검색 — Claude가 이것들을 자주 사용합니다 |
| `bat`, `tree`, `jq` | 더 나은 cat (구문 강조), 디렉터리 트리, JSON 처리 |
| `curl`, `wget` | HTTP 다운로드 |
| `tmux` | 터미널 멀티플렉서 — 백그라운드에서 실행 |
| `htop`, `lsof`, `strace` | 프로세스 모니터링 및 디버깅 |
| `imagemagick` | 이미지 변환 (`convert`, `identify`, `mogrify`) |
| `chromium` | 헤드리스 브라우저 — 스크린샷, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | 데이터베이스 직접 접속 |
| `openssh-client`, `openssh-server`, `mosh` | 외부 SSH와 컨테이너로 들어오는 선택적 SSH/Mosh 접근 |

</details>

<details>
<summary><strong>AI CLI — 모든 주요 제공자</strong></summary>

| CLI | 명령어 | 용도 |
|-----|---------|---------------|
| **Claude Code** | `claude` | 메인 이벤트 — 이 안에서 실행 중 |
| **Gemini CLI** | `gemini` | Google의 AI 코딩 에이전트 |
| **OpenAI Codex** | `codex` | OpenAI의 코딩 에이전트 |
| **Cursor** | `cursor` | Cursor의 AI 에이전트 |
| **TaskMaster AI** | `task-master` | 작업 계획 및 오케스트레이션 |
| **Junie** | `junie` | JetBrains의 AI 코딩 에이전트 |
| **OpenCode** | `opencode` | 오픈 소스 AI 에이전트 (OpenRouter 및 여러 제공자) |
| **Pi Coding Agent** | `pi` | 미니멀 에이전트 하네스 (여러 제공자) |

8개의 AI CLI. 하나의 컨테이너. `Tab` 하나면 바로 전환. 다른 Docker 이미지는 이것을 제공하지 않습니다.

</details>

### 전체 이미지 전용 (추가 패키지)

전체 이미지는 위의 모든 것에 추가로 다음을 포함합니다:

<details>
<summary><strong>추가 npm 패키지 — 배포, ORM, 성능</strong></summary>

| 패키지 | 용도 |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers 배포 |
| `vercel` | Vercel 배포 |
| `netlify-cli` | Netlify 배포 |
| `az` | 클라우드 배포 및 관리를 위한 Azure CLI |
| `prisma`, `drizzle-kit` | 가장 인기 있는 두 Node.js ORM |
| `pm2` | 프로덕션 프로세스 매니저 |
| `eas-cli` | Expo / React Native 빌드 |
| `lighthouse`, `@lhci/cli` | 성능 감사 (Chromium이 이미 있음) |
| `sharp-cli` | 이미지 처리 CLI |
| `json-server`, `http-server` | Mock REST API, 정적 파일 제공 |
| `@marp-team/marp-cli` | 마크다운을 프레젠테이션 슬라이드로 변환 |

</details>

<details>
<summary><strong>추가 Python 패키지 — PDF, 데이터 시각화, 웹 프레임워크</strong></summary>

| 패키지 | 용도 |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | 모든 주요 PDF 라이브러리. 생성, 읽기, 변환, 병합. |
| `xlsxwriter`, `xlrd` | openpyxl이 지원하지 않는 Excel 형식 |
| `matplotlib`, `seaborn` | 데이터 시각화 및 차트 |
| `python-pptx` | PowerPoint 생성 |
| `fastapi`, `uvicorn` | Python 웹 프레임워크 |

</details>

<details>
<summary><strong>추가 시스템 패키지 — 미디어, 문서</strong></summary>

| 패키지 | 용도 |
|---------|---------------|
| `pandoc` | 모든 문서 형식 간 변환 (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | 비디오 및 오디오 처리 (추출, 변환, 트랜스코드) |
| `libvips-dev` | 고성능 이미지 처리 라이브러리 |

</details>

> **Slim 사용자:** 패키지가 없나요? Claude에게 물어보세요. npm/pip 패키지는 몇 초 안에 설치됩니다. 시스템 패키지 (pandoc, ffmpeg)는 1-2분이 걸립니다. 동일한 기능을 제공 — 전체 이미지는 그냥 대기 시간이 없습니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :robot: AI CLI Providers

8개의 AI CLI. 하나의 컨테이너. 다른 Docker 이미지는 이것을 제공하지 않습니다.

| 제공자 | 명령어 | 인증 방법 | 구독 사용 가능? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI 웹 UI (OAuth) | **예** — Max/Pro 플랜 또는 API 키 |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY` 환경 변수 | API 키 (사용량 기반 과금) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` 또는 `codex login --device-auth` | **예** — ChatGPT Plus/Pro/Team/Enterprise 또는 API 키 |
| **Cursor** | `cursor` | `CURSOR_API_KEY` 환경 변수 | API 키 |
| **TaskMaster AI** | `task-master` | 기존 AI 제공자 키 사용 | 설정된 키로 작동 |
| **Junie** | `junie` | JetBrains AI 구독 | JetBrains 계정 필요 |
| **OpenCode** | `opencode` | TUI로 설정 | OpenRouter 및 여러 제공자 지원; full image 전용 |
| **Pi Coding Agent** | `pi` | Pi로 설정 | 여러 제공자 지원 |

> Claude Code가 기본 CLI입니다. 나머지는 두 번째 의견이 필요할 때, 특정 모델의 강점을 활용할 때, 또는 출력을 비교할 때 사용합니다. `Tab` 하나면 모두 사용 가능하다는 것이 핵심입니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :mag: Desloppify

Desloppify는 두 이미지 모두에 `desloppify` 명령으로 포함됩니다. 기본값은 passive입니다. HolyClaude는 사용자가 직접 Desloppify를 실행하지 않는 한 scan을 실행하지 않고, `.desloppify/`를 만들지 않으며, `.gitignore`를 편집하거나 mounted workspace를 변경하지 않습니다.

```bash
desloppify scan --path .
desloppify next
```

프로젝트를 scan한 뒤에는 그 프로젝트의 `.gitignore`에 `.desloppify/`를 추가하세요.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off`는 자동 전역 skill 설정만 끕니다. CLI는 계속 설치되어 있습니다. `all`은 `claude,codex,gemini`를 뜻합니다. `opencode`는 full image 전용이며 `all`에 포함되지 않습니다. OpenCode는 `~/.claude/skills`에서 Claude-compatible skills도 찾을 수 있으므로 automatic setup에서 `claude`와 `opencode`를 함께 쓰지 마세요.

수동 upstream targets: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :llama: Using Ollama

HolyClaude는 Anthropic 구독의 대안으로 [Ollama](https://ollama.com)와 함께 작동합니다. 두 개의 환경 변수를 설정하고 로컬 또는 클라우드 모델을 사용하세요.

전체 설정 가이드: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ 맨 위로</a>
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

### 구성 요소가 맞물리는 방식

1. **컨테이너 시작** — `entrypoint.sh`가 root로 실행됩니다. UID/GID를 호스트 사용자에 맞게 재매핑하고, bootstrap이 건드리기 전에 저장된 Claude Code 세션을 복원하며, 첫 부팅 여부를 확인합니다.

2. **첫 부팅 시에만** — `bootstrap.sh`가 한 번 실행됩니다. 기본 설정, 메모리 템플릿 복사, git 정보 설정. 이후 다시 실행되지 않도록 sentinel 파일(`.holyclaude-bootstrapped`)을 생성합니다. 이 시점부터 커스터마이징은 안전합니다.

3. **s6-overlay가 PID 1을 인계받습니다** — supervisord가 아닙니다. Docker용으로 특별 제작된 [s6-overlay](https://github.com/just-containers/s6-overlay)입니다. CloudCLI, Xvfb, Claude 세션 동기화를 감독합니다. 충돌 시 자동 재시작. 신호 전달. 좀비 프로세스 수거. 정상 종료.

4. **CloudCLI가 웹 UI를 제공합니다** — 포트 3001. 프로젝트 관리, 다중 세션, 플러그인 (프로젝트 통계 + 웹 터미널 포함)이 있는 Claude Code용 브라우저 기반 인터페이스.

5. **Xvfb가 호환 디스플레이를 제공합니다** — 화면 표시를 사용하는 도구를 위해 Xvfb를 `:99`에 유지합니다. 최신 헤드리스 Chromium, Playwright, Lighthouse가 항상 Xvfb를 필요로 하는 것은 아닙니다.

s6를 supervisord 대신 선택한 이유, 플러그인이 이미지에 내장된 이유, `su` 대신 `runuser`를 사용하는 이유 등 전체 기술 심층 분석은 [docs/architecture.md](docs/architecture.md)를 참조하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
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
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :floppy_disk: Data & Persistence

| 항목 | 위치 (컨테이너) | 위치 (호스트) | 재빌드 후 유지? |
|------|-------------------|-------------|-------------------|
| 설정, 자격 증명, API 키 | `/home/claude/.claude` | `./data/claude` | **예** |
| Claude Code 세션 (OAuth, 온보딩) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **예** |
| 코드 및 프로젝트 | `/workspace` | `./workspace` | **예** |
| CloudCLI 계정 | `/home/claude/.cloudcli` | *(기본적으로 컨테이너 전용 — 아래 참조)* | 아니요 (opt-in 가능) |

HolyClaude는 시작 중 새 기본 파일을 만들기 전에 저장된 Claude Code 세션을 복원합니다. 그래서 rebuild와 recreate가 실제 OAuth/API 세션을 온보딩 상태로 바꾸지 않습니다.

### `docker compose down && docker compose up` 후에도 유지되는 것:
- Anthropic 인증 및 API 키
- Claude Code 설정, 메모리 (`CLAUDE.md`) 및 OAuth 세션 (재로그인 불필요)
- `./workspace`의 모든 코드
- Git 설정
- Codex, Gemini, Cursor CLI 인증 (v1.1.7부터)

### 다시 해야 할 것 (10초):
- CloudCLI 웹 계정 — 빠른 가입, 그게 전부 (아래 영속성을 활성화하지 않는 한)

### 첫 부팅 설정 재실행:
```bash
# sentinel 파일 삭제 — 폴더 전체가 아님
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **`./data/claude/`를 절대 완전히 삭제하지 마세요.** 자격 증명이 거기에 있습니다. 새로운 bootstrap을 원하면 sentinel 파일을 삭제하세요. 설정을 초기화하고 싶으면 특정 설정 파일을 삭제하세요. 하지만 폴더 전체를 삭제하면 안 됩니다.

### CloudCLI 계정 영속화 (선택 사항, 로컬 스토리지만)

기본적으로 CloudCLI 계정 데이터베이스(`~/.cloudcli`)는 컨테이너 로컬이며 재빌드 시 삭제됩니다. 계정 재생성은 10초면 되므로 대부분의 사람들은 그냥 둡니다.

재빌드 후에도 유지하려면 compose 파일에 **named Docker volume**을 추가하세요:

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

> **`./data/cloudcli`를 네트워크 공유(NAS, SMB/CIFS, NFS)에 bind-mount하지 마세요.** CloudCLI는 계정을 SQLite에 저장하는데, SQLite의 파일 잠금은 네트워크 마운트에서 작동하지 않습니다. `database is locked` 오류가 계속 발생합니다. Named volume은 Docker 엔진의 로컬 파일시스템에 존재하기 때문에 작동합니다 — NAS를 가리키는 bind mount는 작동하지 않습니다.

로컬 SSD 경로로의 bind mount도 괜찮습니다. 네트워크 공유만 피하면 됩니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :lock: Permissions

Claude Code는 기본적으로 **`acceptEdits`** 모드로 실행됩니다. 이것이 이미지에 포함된 설정입니다:

| 작업 | 허용 여부 |
|--------|----------|
| 파일 읽기 | 예 |
| 파일 편집 / 생성 | 예 |
| 셸 명령 실행 | **먼저 확인 요청** |
| 패키지 설치 | **먼저 확인 요청** |

### 완전한 bypass 원하시나요? (고급 사용자)

제가 개인적으로 사용하는 방식입니다. 호스트에서 `./data/claude/settings.json`을 편집하세요:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Bypass 모드는 Claude가 확인 없이 명령을 실행한다는 의미입니다.** 강력하지만 파괴적인 명령도 빠르게 실행할 수 있습니다. 워크스페이스와 모든 프롬프트를 신뢰하지 않는다면 포함된 기본값인 `acceptEdits`를 유지하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :shield: 원격 접근 및 보안

HolyClaude는 CloudCLI를 포트 `3001`에 바인딩합니다. 기본적으로 로컬 전용입니다 — 노트북이나 SSH로 접근하는 홈 서버에서 실행하기에 적합합니다.

**외부 네트워크에서 접근하고 싶은 순간, 이 섹션을 읽으세요.**

### 공개 인터넷에 포트 포워딩하지 마세요

직접 말하겠습니다: 라우터에 구멍을 뚫고 `3001`을 열린 인터넷에 노출하지 마세요. 비밀번호가 있어도 마찬가지입니다. 이유:

- CloudCLI는 웹 터미널 플러그인을 통해 전체 셸을 노출합니다
- 임의의 코드를 실행하고, 패키지를 설치하고, `/workspace` 전체를 읽고 쓸 수 있습니다
- Anthropic OAuth 토큰과 API 키를 보유합니다
- 기본 인증 비밀번호는 브루트포스, 크리덴셜 스터핑되고 로그에서 추출됩니다
- 비밀번호 하나 유출 = 누군가가 당신의 돈으로 당신의 머신에서 유료 Claude Code 인스턴스를 실행합니다

비밀번호는 과속 방지턱이지 문이 아닙니다. HolyClaude를 SSH 세션처럼 취급하세요: 적절한 터널 없이는 절대 열린 인터넷에 노출하지 마세요.

### 대신 적절한 터널을 사용하세요

제가 실제로 추천하는 두 가지 옵션:

| 옵션 | 대상 | 이유 |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | 개인 사용, 소규모 팀 | WireGuard 메시 VPN. 서버와 노트북/폰에 Tailscale을 설치하면 LAN에 있는 것처럼 어디서든 `http://holyclaude:3001`에 접근할 수 있습니다. 포트 개방 불필요, DNS 불필요, 인증서 불필요. 개인 사용은 무료. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | 다른 사람과 공유, 공개 호스트명 | Cloudflare가 연결을 프록시하므로 포트 `3001`은 닫힌 상태를 유지합니다. HTTPS가 있는 실제 도메인을 얻고, Cloudflare Access(Google/GitHub SSO)를 앞에 둘 수 있습니다. 무료 티어로 대부분의 개인 사용을 커버합니다. |

둘 다 제공하는 것:
- 라우터의 개방 포트 제로
- 엔드투엔드 암호화 전송
- 실제 신원 기반 인증 (공유 비밀번호 아님)
- 감사 로그

### 직접 노출하겠다면 (제발 하지 마세요)

터널을 절대적으로 건너뛰어야 한다면 (셀프호스팅 튜토리얼, 격리된 랩 네트워크 등), 최소한:

1. **앞에 리버스 프록시를 두세요** (Caddy, nginx, Traefik) 실제 TLS와 함께
2. **방화벽 또는 프록시 레벨에서 IP allowlisting 추가** — 알려진 IP만
3. **포함된 기본값 `acceptEdits`를 유지**하세요. `bypassPermissions`를 쓸 분명한 이유가 있을 때만 바꾸세요
4. **Anthropic 자격 증명 교체** 뭔가 이상해 보이면
5. **Cloudflare Access 또는 유사한 SSO 뒤에서 실행**, 기본 인증이 아닌

그래도 위험 표면은 큽니다. Tailscale이나 Cloudflare Tunnel을 사용하세요. 무료이고, 5분이면 설정되고, 제가 개인적으로 사용하는 것입니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :bell: Notifications

컴퓨터를 떠나도 Claude가 완료되면 알 수 있습니다. 알림에 [Apprise](https://github.com/caronc/apprise)를 사용 — Discord, Telegram, Slack, Email, Pushover, Gotify 등 100개 이상의 서비스를 지원합니다.

**활성화 방법:**

1. compose `environment`에 `NOTIFY_*` 변수를 하나 이상 추가하세요:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. 컨테이너 내부에서: `touch ~/.claude/notify-on`

지원되는 모든 변수 및 URL 형식은 [설정 문서](docs/configuration.md#notifications-apprise)를 참조하세요.

**비활성화:** `rm ~/.claude/notify-on`

**알림을 트리거하는 이벤트:**
| 이벤트 | 의미 |
|-------|--------------|
| `stop` | Claude가 현재 작업을 완료했습니다 |
| `error` | 도구 사용 실패가 발생했습니다 |

> 설정하지 않으면 완전히 조용합니다. `NOTIFY_*` 변수 없음? 플래그 파일 없음? 네트워크 호출 없음. 로그 스팸 없음. 오버헤드 없음.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# 최신 이미지 Pull
docker compose pull

# 새 이미지로 컨테이너 재생성
docker compose up -d
```

데이터는 `./data/claude`와 `./workspace`에 유지됩니다 — 업그레이드는 컨테이너만 교체하며 파일은 건드리지 않습니다.

컨테이너 안에서 `cloudcli update` 또는 `npm install -g @cloudcli-ai/cloudcli@latest`를 실행하지 마세요. HolyClaude는 패치된 CloudCLI 런타임을 포함하므로 `docker compose pull && docker compose up -d`로 업데이트하세요.

`latest` 대신 특정 버전을 고정하려면:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI가 잘못된 기본 디렉터리를 표시합니다</strong></summary>

CloudCLI가 `/workspace` 대신 `/home/claude`를 엽니다.

**원인:** 사용자 지정 또는 수정된 CloudCLI 서비스 스크립트가 CloudCLI를 시작하기 전에 `WORKSPACES_ROOT=/workspace`를 설정하지 않았습니다.

**해결책:** HolyClaude에서 이미 처리되었습니다. s6 run 스크립트가 프로세스 환경에 `WORKSPACES_ROOT=/workspace`를 직접 설정합니다.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**원인:** SMB/CIFS 네트워크 마운트의 SQLite 데이터베이스. CIFS는 SQLite가 필요로 하는 파일 수준 잠금을 지원하지 않습니다.

**해결책:** 네트워크 공유에 SQLite 데이터베이스를 저장하지 마세요. HolyClaude는 정확히 이 이유로 `.cloudcli`를 컨테이너 로컬 스토리지에 유지합니다. NAS의 `/workspace`에 자체 SQLite 데이터베이스가 있다면 로컬 경로로 이동하세요.
</details>

<details>
<summary><strong>Chromium 충돌 / 빈 페이지 / 탭 실패</strong></summary>

**원인:** 공유 메모리 부족. Docker 기본값은 64MB입니다.

**해결책:** compose 파일에 `shm_size: 2g`가 있는지 확인하세요. 무거운 브라우저 사용 (많은 탭, 복잡한 페이지)의 경우 `4g`로 늘리세요.
</details>

<details>
<summary><strong>파일 감시자가 변경을 감지하지 못합니다 (핫 리로드 불작동)</strong></summary>

**원인:** SMB/CIFS 네트워크 마운트는 `inotify`를 지원하지 않습니다.

**해결책:** compose 환경에서 폴링을 활성화하세요:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
참고: 폴링은 inotify보다 CPU를 더 사용합니다. 네트워크 마운트에서만 활성화하세요.
</details>

<details>
<summary><strong>Permission denied 오류</strong></summary>

**원인:** 컨테이너 UID/GID가 호스트 파일 소유권과 일치하지 않습니다.

**해결책:**
```bash
# 호스트 머신에서
id -u  # → 이것이 PUID입니다
id -g  # → 이것이 PGID입니다
```
compose 파일에서 설정하세요:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker가 .claude.json을 디렉터리로 생성합니다</strong></summary>

**원인:** 컨테이너 시작 전에 바인드 마운트 대상 파일이 존재하지 않으면 Docker가 친절하게 디렉터리로 생성합니다. 감사합니다, Docker.

**해결책:** 이미 처리되었습니다 — `entrypoint.sh`가 저장된 세션 파일을 먼저 복원하거나, 저장된 세션이 없을 때만 안전한 기본 파일을 만듭니다.
</details>

모든 SMB/CIFS 주의사항 및 경험하고 수정한 모든 버그의 전체 기록을 포함한 완전한 가이드는 [docs/troubleshooting.md](docs/troubleshooting.md)를 참조하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :warning: Known Issues

이것들은 HolyClaude 버그가 아닙니다 — 업스트림 문제이거나 의도적인 트레이드오프입니다.

| 문제 | 이유 | 우회 방법 |
|-------|-----|------------|
| "Continue in Shell" 버튼 불작동 | CloudCLI 업스트림 버그 (터미널 초기화의 레이스 컨디션) | 대신 **Web Terminal** 플러그인 사용 (사전 설치됨) |
| Cursor CLI "Command timeout" | API 키 미설정 — 외관상 문제만, 어떤 것도 영향 없음 | `CURSOR_API_KEY` 설정 또는 무시 |
| 재빌드 시 CloudCLI 계정 소실 | SQLite가 네트워크 마운트에 영속될 수 없음 — 의도적인 트레이드오프 | 계정 재생성 (~10초) |
| 웹 푸시 알림 "not supported" | CloudCLI의 브라우저 제한, 표준 동작 | 대신 Apprise 알림 사용 ([알림](#bell-notifications) 참조) |

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :hammer_and_wrench: Building Locally

Docker Hub에서 pull하는 대신 직접 이미지를 빌드하고 싶으신가요? 얼마든지:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# 전체 이미지 빌드
docker build -t holyclaude .

# Slim 이미지 빌드
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# ARM용 빌드 (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

그런 다음 compose 파일에서 `image: coderluii/holyclaude:latest` 대신 `image: holyclaude`를 사용하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :bar_chart: Alternatives

HolyClaude는 다른 접근 방식과 어떻게 비교되나요?

| 접근 방식 | 웹 UI | 멀티 AI | 사전 설정 도구 | 헤드리스 브라우저 | 원 커맨드 설정 | 영속성 |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8개 CLI | 50개 이상 도구 | Chromium + Xvfb + Playwright | `docker compose up` | 바인드 마운트 |
| Claude Code (베어 메탈) | 없음 | 없음 | 직접 설치 | 직접 설치 | 다단계 설치 | 수동 |
| Claude Code + oh-my-openagent | 없음 | 예 (멀티 모델) | 일부 | 없음 | npm install | 수동 |
| DIY Docker + Claude Code | 아마도 | 아마도 | 직접 추가 | 직접 설정 시 | Dockerfile 작성 시 | 볼륨 설정 시 |
| Cursor IDE | 내장 | Cursor 전용 | IDE 번들 | 없음 | 앱 다운로드 | 앱 데이터 |

HolyClaude는 코딩 에이전트와 경쟁하지 않습니다 — 모든 것을 더 잘 작동하게 하는 **인프라 계층**입니다. 이것들을 실행하는 컨테이너입니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :rocket: Roadmap

다음에 올 것들:

| 상태 | 기능 |
|--------|---------|
| 🔜 | **ARM 네이티브 빌드** — 에뮬레이션이 아닌 최적화된 네이티브 ARM64 이미지 |
| 🔜 | **VS Code 터널 통합** — VS Code 데스크톱에서 연결하기 위한 내장 VS Code Server 또는 터널 |
| 🔜 | **알림 라우팅** — 이벤트 유형별 다른 알림 대상 (오류는 Telegram, 완료는 Discord) |

아이디어가 있으신가요? [토론을 시작](https://github.com/CoderLuii/HolyClaude/discussions)하거나 [기능을 요청](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml)하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :trophy: Built with HolyClaude

HolyClaude로 무언가를 만들고 계신가요? 보고 싶습니다.

`showcase` 라벨로 이슈를 열거나 프로젝트를 추가하는 PR을 제출하세요:

<!-- Add your project: [Project Name](url) — one-line description -->

*여기에 첫 번째 프로젝트를 추가해 보세요.*

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :handshake: Contributing

기여를 환영합니다. 이 프로젝트는 실제 일상 사용에서 탄생했으며, 더 많은 사람들이 사용하고 엣지 케이스를 발견할수록 더 좋아집니다.

1. Fork 하세요
2. 브랜치를 만드세요 (`git checkout -b feature/something`)
3. 커밋하세요
4. Push하세요
5. PR을 올리세요

버그, 기능 요청, 질문: [이슈를 열어주세요](https://github.com/CoderLuii/HolyClaude/issues).

### 연락처

| 채널 | 용도 |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | 질문, 설정 공유, 아이디어 |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | 버그 리포트, 기능 및 패키지 요청 |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | 취약점 리포트 (비공개) |

### 도구 추가를 원하시나요?

[📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml) 이슈 템플릿을 사용하세요. 패키지 이름, 설치 방법, 대상 변형 (full/slim)을 포함해 주세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :heart: Support

HolyClaude는 무료, 오픈 소스이며 매일 사용하는 한 명의 개발자가 유지 관리합니다.

시간을 절약했다면 도움을 주실 수 있는 방법:

- **이 repo에 별 주기** — 가시성을 위해 가장 큰 도움이 됩니다
- **공유하기** — 친구에게 알리고, 포스팅하고, 트윗하세요
- **이슈 열기** — 버그 리포트와 기능 요청은 모든 사람을 위해 HolyClaude를 더 좋게 만듭니다
- **기여하기** — PR은 언제나 환영합니다

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :scroll: Third-Party Software

HolyClaude Docker 이미지에는 각각 자체 라이선스를 가진 서드파티 소프트웨어가 포함되어 있습니다. 주요 구성 요소:

| 구성 요소 | 라이선스 | 소스 |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

수정 고지를 포함한 전체 세부 사항은 [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES)를 참조하세요. HolyClaude 자체 소스 코드는 MIT 라이선스입니다.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
</p>

---

## :page_facing_up: License

MIT — [LICENSE](LICENSE) 참조. 원하는 대로 사용하세요.

<p align="right">
  <a href="#top">↑ 맨 위로</a>
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

[CoderLuii](https://github.com/coderluii)가 만들었습니다 · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

이 컨테이너는 제가 매일 사용하는 것입니다. 저에게 절약해 준 설정 시간의 절반만이라도 절약해 드렸다면, 별 하나 주시면 감사하겠습니다.

</div>
