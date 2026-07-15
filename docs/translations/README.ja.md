🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | **日本語** | [한국어](README.ko.md)

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

### 設定は終わり。ビルドを始めよう。

コマンド一つで完全な AI 開発ワークステーションが手に入る。Claude Code、Web UI、ヘッドレスブラウザ、8 つの AI CLI、50 以上の開発ツール — コンテナ化済み、すぐに使える。

**これを手動でセットアップするのに 2 時間かかるところを、`docker compose up` だけで済む。**

**既存の Claude Code サブスクリプションで動作します。** Max/Pro プラン、API キー — どちらでもそのまま使えます。

---

## これは何？

おなじみの話だろう。Claude Code が欲しい。ブラウザからも使いたい。スクリーンショットとテスト用のヘッドレスブラウザも。Playwright の設定も。すべての AI CLI も。TypeScript、Python、デプロイツール、データベースクライアント、GitHub CLI も。

そこから始まる。一つひとつインストール。すると Docker の共有メモリが 64MB だから Chromium が起動しない。Xvfb が設定されていない。コンテナ内の UID がホストと一致しないからすべてパーミッションエラー。WORKDIR が root 所有だと Claude Code のインストーラーがハングすることに気づく。NAS マウントで SQLite がロックする。そして——

**HolyClaude は、そうした問題をすべて解決した後に私が作ったコンテナだ。**

私は何週間も自分のサーバーでこれを毎日使っている。あらゆるバグに当たり、診断し、修正した。あらゆるエッジケースに対処した。「Docker でなぜ動かないのか」という疑問にはすべて答えた。

プルして、起動して、ブラウザを開いて、ビルドする。

### :credit_card: 既存のサブスクリプションを使う

**これは本物の Claude Code CLI を実行する。** ラッパーでも、プロキシでも、模倣品でもない。

既存の Anthropic アカウントがそのまま使える:
- **Claude Max/Pro プラン** — Web UI から認証（OAuth）、デスクトップ版 Claude Code と同じ
- **Anthropic API キー** — Web UI から設定、いつもと同じ請求
- **追加費用なし** — HolyClaude は無料のオープンソースです。Anthropic への支払いは今まで通り、使った分だけです。

> HolyClaude はあなたの認証情報に触れません。バインドマウントされたボリューム（`./data/claude/`）にローカルで保存されます。ベアメタルと同じです。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## 目次

| | セクション |
|---|---|
| :zap: | [クイックスタート](#zap-quick-start) |
| :computer: | [プラットフォームサポート](#computer-platform-support) |
| :star2: | [なぜ HolyClaude か](#star2-why-holyclaude) |
| :credit_card: | [サブスクリプションと認証](#credit_card-subscription--authentication) |
| :package: | [イメージバリアント](#package-image-variants) |
| :whale: | [Docker Compose — クイック](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — フル](#whale2-docker-compose--full) |
| :wrench: | [環境変数](#wrench-environment-variables) |
| :rocket: | [中身](#rocket-whats-inside) |
| :robot: | [AI CLI プロバイダー](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Ollama の使い方](#llama-using-ollama) |
| :building_construction: | [アーキテクチャ](#building_construction-architecture) |
| :file_folder: | [プロジェクト構造](#file_folder-project-structure) |
| :floppy_disk: | [データと永続化](#floppy_disk-data--persistence) |
| :lock: | [パーミッション](#lock-permissions) |
| :shield: | [リモートアクセスとセキュリティ](#shield-remote-access--exposure) |
| :bell: | [通知](#bell-notifications) |
| :arrows_counterclockwise: | [アップグレード](#arrows_counterclockwise-upgrading) |
| :construction: | [トラブルシューティング](#construction-troubleshooting) |
| :warning: | [既知の問題](#warning-known-issues) |
| :hammer_and_wrench: | [ローカルビルド](#hammer_and_wrench-building-locally) |
| :bar_chart: | [比較](#bar_chart-alternatives) |
| :rocket: | [ロードマップ](#rocket-roadmap) |
| :trophy: | [HolyClaude で作ったもの](#trophy-built-with-holyclaude) |
| :handshake: | [コントリビュート](#handshake-contributing) |
| :heart: | [サポート](#heart-support) |
| :scroll: | [サードパーティソフトウェア](#scroll-third-party-software) |
| :page_facing_up: | [ライセンス](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :zap: Quick Start

**1.** HolyClaude 用のフォルダを作成:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** `docker-compose.yaml` ファイルを作成。以下のテンプレートをいずれかコピー:
- [クイックテンプレート](#whale-docker-compose--quick) — 最小構成、設定不要、すぐ動く
- [フルテンプレート](#whale2-docker-compose--full) — 全オプション、詳細ドキュメント付き

**3.** プルして起動:

```bash
docker compose up -d
```

**4.** Web UI を開く:

```
http://localhost:3001
```

**5.** CloudCLI アカウントを作成（10 秒）、Anthropic アカウントでサインイン、これで準備完了。

> `.env` ファイル不要。事前設定不要。40 ページのドキュメントを読む必要なし。ただ動く。

> **ネットワーク外からアクセスしたい？** ポートフォワードはしないこと。[リモートアクセスとセキュリティ](#shield-remote-access--exposure) を参照 — Tailscale か Cloudflare Tunnel を使おう。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :computer: Platform Support

| プラットフォーム | ステータス | 備考 |
|----------|--------|-------|
| Linux (amd64) | ✅ 完全サポート | ネイティブパフォーマンス、推奨 |
| Linux (arm64) | ✅ 完全サポート | Raspberry Pi 4+、Oracle Cloud、AWS Graviton |
| macOS (Docker Desktop) | ✅ 完全サポート | Apple Silicon と Intel、Docker Desktop 経由 |
| Windows (WSL2 + Docker Desktop) | ✅ 完全サポート | WSL2 バックエンド必須 |
| Synology / QNAP NAS | ✅ 完全サポート | SMB マウントは `CHOKIDAR_USEPOLLING=true` を使用 |
| Kubernetes | 🔜 近日公開 | Helm チャート計画中 |

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :star2: Why HolyClaude

毎回同じセットアップを繰り返すのに疲れたから作った。Claude Code のインストール、Web UI の配線、Docker での Chromium 設定、パーミッション問題の修正、プロセス監視のデバッグ。毎回。

だからすべてをやってくれるコンテナを作った。そして考えうるすべてのバグを踏んだので、あなたが踏まなくて済む。

| | HolyClaude | 自分でやる場合 |
|---|---|---|
| **セットアップ** | 30 秒 | 1〜2 時間（うまくいけば） |
| **Claude Code** | プリインストール済み、設定済み、すぐ使える | インストール、設定、インストーラーハングのデバッグ、WORKDIR の修正 |
| **Web UI** | CloudCLI とプラグイン同梱 | Web UI を探して、インストールして、設定して、Claude に接続する |
| **ヘッドレスブラウザ** | Chromium + Xvfb + Playwright、設定済み | Chromium のインストール、Xvfb のインストール、ディスプレイ :99 の設定、shm の修正、サンドボックスの修正、seccomp の修正… |
| **AI CLI** | 8 プロバイダー、1 コンテナ | 3 つのパッケージマネージャーで 1 つずつインストール |
| **開発ツール** | 50 以上のツール、すぐ使える | 次の 1 時間は `apt-get install` / `npm i -g` / `pip install` |
| **プロセス管理** | s6-overlay（自動再起動、グレースフルシャットダウン） | 独自の supervisord 設定を書くか、Docker の再起動を祈る |
| **永続化** | バインドマウント、認証情報はすべてを生き延びる | Docker ボリュームを理解し、「なぜファイルじゃなくディレクトリになってるんだ」をデバッグ |
| **更新** | `docker pull && docker compose up -d` | 50 のツールを手動で更新し、何も壊れないことを祈る |
| **マルチアーキテクチャ** | AMD64 + ARM64 | Dockerfile が ARM でビルドできることを祈る |

**手動セットアップの最後の行はいつも「自分のマシンでは動く」。** HolyClaude はどのマシンでも動く。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude は Anthropic の**公式 Claude Code CLI** を実行する。既存のアカウントがそのまま使える。

### 使えるもの:

| 認証方法 | 方法 | 費用 |
|----------------------|-----|------|
| **Claude Max/Pro プラン**（サブスクリプション） | CloudCLI Web UI からサインイン — デスクトップと同じ OAuth フロー | 既存のサブスクリプション、追加費用なし |
| **Anthropic API キー** | Web UI に API キーを貼り付ける | 従量課金、Anthropic の通常請求 |

### 使えないもの:

| | 理由 |
|---|---|
| Claude に対する OpenAI API キー | 別会社、別 API。OpenAI キーは**Codex CLI**（こちらもプリインストール済み）で使える |

> **ChatGPT Plus/Pro ユーザー:** サブスクリプションは **Codex CLI** で使えます。コンテナ内で `codex login --device-auth` を実行して ChatGPT アカウントで認証してください。

### 同梱のその他 AI CLI:

| CLI | 必要なもの |
|-----|--------------|
| Gemini CLI | Google AI API キー（`GEMINI_API_KEY`） |
| OpenAI Codex | OpenAI API キー（`OPENAI_API_KEY`）または ChatGPT Plus/Pro サブスクリプション（`codex login --device-auth`） |
| Cursor | Cursor API キー（`CURSOR_API_KEY`） |
| TaskMaster AI | AI プロバイダーキーを使用（Anthropic、OpenAI など） |
| Junie | JetBrains アカウント（JetBrains AI サブスクリプション） |
| OpenCode | `opencode` TUI で設定（OpenRouter と複数プロバイダー対応） |
| Pi Coding Agent | `pi` で設定（複数プロバイダー対応） |

> **HolyClaude は無料のオープンソースです。** AI プロバイダーへの支払いは今まで通り、使った分だけです。認証情報をプロキシ、傍受、または操作することはありません。ローカルのバインドマウントに保存されます。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :package: Image Variants

2 種類のフレーバー。同じ品質。サイズを選ぼう。

| タグ | 内容 | 適している用途 |
|-----|-------------|----------|
| **`latest`** | すべてプリインストール済み — すべてのツール、ライブラリ、CLI | ほとんどのユーザー向け。待ち時間ゼロ。Claude が途中で何かをインストールする必要なし。 |
| **`slim`** | コアツールのみ — Claude がオンデマンドで追加インストール | 小さい VPS、ディスク容量が限られている場合、計量制の帯域幅 |
| `X.Y.Z` | フルイメージ、固定バージョン | 本番安定性 — 更新タイミングを自分でコントロール |
| `X.Y.Z-slim` | スリムイメージ、固定バージョン | 本番環境 + 小さいフットプリント |

```bash
# Full — バッテリー同梱（推奨）
docker pull coderluii/holyclaude

# Slim — 軽量
docker pull coderluii/holyclaude:slim
```

> **`latest` は常にフルイメージです。** スリムユーザーへ: 足りないパッケージ？ Claude に聞いてください。npm/pip パッケージは数秒でインストールできます。同じ機能が使えます — フルイメージは初回ダウンロードの待ち時間がゼロなだけです。
>
> Docker Hub が表示するのは圧縮された転送サイズです: `latest` は約 4.1 GB、`slim` は約 2.4 GB。Docker、Synology Container Manager、NAS のファイルシステムでは、レイヤー展開後により大きなサイズとして表示されることがあります。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :whale: Docker Compose — Quick

「とにかく動かしたい」テンプレート。このブロック全体を `docker-compose.yaml` ファイルにコピー:

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

次に:

```bash
docker compose up -d
```

`http://localhost:3001` を開く。CloudCLI アカウントを作る。Anthropic アカウントでサインイン。何かを作る。

**セットアップはこれだけ。完了。**

> **なぜこのブラウザ権限なのか？** このリリースでは HolyClaude の現在のブラウザ設定をそのまま維持します。`SYS_ADMIN` と `seccomp=unconfined` はプロセス権限を広げて分離を弱め、`SYS_PTRACE` はデバッグ用です。v1.5.0 ではこの設定を維持し、ハードニングは別の変更として扱ってください。

> **なぜ `shm_size: 2g` なのか？** Docker の共有メモリは既定で 64MB しかありません。HolyClaude はこのリリースの既定値として 2GB を維持しています。Chromium はタブ描画で `/dev/shm` をかなり使うためです。64MB だとタブが落ちます。ブラウザを多用するなら 4GB に増やしてください。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :whale2: Docker Compose — Full

同じイメージ、すべての設定項目を公開。このブロック全体を `docker-compose.yaml` ファイルにコピー:

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

次に:

```bash
docker compose up -d
```

compose を編集せずにホスト側ポートやバインドマウントパスを変更したい場合、`.env.example` を `.env` にコピーして設定:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

これらの値はホスト上の Docker Compose によって読み込まれます。コンテナの環境変数ではありません。

### 各セクションが制御するもの:

| セクション | 内容 | 変更するタイミング |
|---------|-------------|-------------------|
| **タイムゾーン** | コンテナの時計 | 常に — ローカルの TZ に設定 |
| **パフォーマンス** | Node.js メモリ上限 | 大きなプロジェクトで OOM エラーが出た場合のみ |
| **ユーザーマッピング** | コンテナとホスト間のファイルパーミッション | 「permission denied」が出た場合（ホストで `id -u` と `id -g` を実行） |
| **SMB/CIFS** | ファイルウォッチャーのポーリングモード | ボリュームが NAS やネットワーク共有にある場合のみ |
| **通知** | Apprise 経由のプッシュ通知（Discord、Telegram、Slack、Email、100 以上のサービス） | Claude が終わったときに通知を受け取りたい場合 |
| **AI プロバイダー** | Gemini、Codex、Cursor、Junie、OpenCode, Pi Coding Agent の API キー | Claude 以外の AI CLI を使いたい場合 |

> **環境変数はすべて任意です。** コンテナは `TZ=UTC` だけで完全に動作します。それ以外はすべてデフォルト値があるか、Web UI で設定できます。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :wrench: Environment Variables

完全なリファレンス。すべての変数、デフォルト値、内容。

| 変数 | デフォルト | 内容 |
|----------|---------|--------------|
| `TZ` | `UTC` | コンテナのタイムゾーン |
| `PUID` | `1000` | Docker 方式のコンテナユーザー ID; rootless Podman は `docker-compose.podman-rootless.yaml` を使用 |
| `PGID` | `1000` | Docker 方式のコンテナグループ ID; rootless Podman は `docker-compose.podman-rootless.yaml` を使用 |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js ヒープメモリ上限（MB） |
| `GIT_USER_NAME` | `HolyClaude User` | Git コミット作成者（初回起動時に一度設定） |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git コミットメールアドレス（初回起動時に一度設定） |
| `CHOKIDAR_USEPOLLING` | *(未設定)* | SMB/CIFS の場合は `1` に設定 — ポーリング型ファイルウォッチャーを有効化 |
| `WATCHFILES_FORCE_POLLING` | *(未設定)* | SMB/CIFS の場合は `true` に設定 — Python ポーリングを有効化 |
| `NOTIFY_DISCORD` | *(未設定)* | 通知用 Discord Webhook URL |
| `NOTIFY_TELEGRAM` | *(未設定)* | 通知用 Telegram ボット URL |
| `NOTIFY_PUSHOVER` | *(未設定)* | 通知用 Pushover URL |
| `NOTIFY_SLACK` | *(未設定)* | 通知用 Slack Webhook URL |
| `NOTIFY_EMAIL` | *(未設定)* | 通知用メール（SMTP）URL |
| `NOTIFY_GOTIFY` | *(未設定)* | 通知用 Gotify URL |
| `NOTIFY_URLS` | *(未設定)* | キャッチオール — カンマ区切りの [Apprise URL](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(未設定)* | Anthropic API キー（Web UI OAuth の代替） |
| `ANTHROPIC_AUTH_TOKEN` | *(未設定)* | Anthropic 認証トークン（API キーの代替） |
| `ANTHROPIC_BASE_URL` | *(未設定)* | カスタム Anthropic API エンドポイント（プロキシ、プライベートデプロイ） |
| `CLAUDE_CODE_USE_BEDROCK` | *(未設定)* | Amazon Bedrock バックエンドを使う場合は `1` に設定 |
| `CLAUDE_CODE_USE_VERTEX` | *(未設定)* | Google Vertex AI バックエンドを使う場合は `1` に設定 |
| `GEMINI_API_KEY` | *(未設定)* | Google Gemini API キー |
| `OPENAI_API_KEY` | *(未設定)* | OpenAI API キー（Codex CLI 用、または ChatGPT サブスクリプションは `codex login --device-auth` で使用） |
| `CURSOR_API_KEY` | *(未設定)* | Cursor API キー |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Desloppify のグローバル skill 設定（任意）。有効値: `off`, `all`, `claude`, `codex`, `gemini`, `opencode`, またはカンマ区切りの組み合わせ |
| `OLLAMA_HOST` | *(未設定)* | Ollama エンドポイント URL（例: `http://host.docker.internal:11434`） |

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :rocket: What's Inside

これは最小限のコンテナではない。完全な開発ワークステーションだ。

### 両バリアント共通（full + slim）

<details>
<summary><strong>Node.js 26 + npm グローバルパッケージ</strong></summary>

| パッケージ | 用途 |
|---------|---------------|
| `typescript`, `tsx` | TypeScript のコンパイルと実行 |
| `pnpm` | 高速でディスク効率の良いパッケージマネージャー |
| `vite`, `esbuild` | 超高速ビルドツール |
| `eslint`, `prettier` | コード品質とフォーマット |
| `serve`, `nodemon` | 静的ファイルサーバー、自動再起動開発サーバー |
| `concurrently` | 複数スクリプトの並列実行 |
| `dotenv-cli` | `.env` ファイルから環境変数を読み込む |

</details>

<details>
<summary><strong>Python 3 パッケージ</strong></summary>

| パッケージ | 用途 |
|---------|---------------|
| `requests`, `httpx` | HTTP クライアント |
| `beautifulsoup4`, `lxml` | Web スクレイピングと HTML パース |
| `Pillow` | 画像処理（プリコンパイル済み — 待ち時間なし） |
| `pandas`, `numpy` | データ操作（プリコンパイル済み — 実行時に pip install したくないでしょう） |
| `openpyxl` | Excel ファイルの読み書き |
| `python-docx` | Word ドキュメントの読み書き |
| `jinja2`, `markdown` | テンプレートと Markdown レンダリング |
| `pyyaml`, `python-dotenv` | 設定ファイルのパース |
| `rich`, `click`, `tqdm` | 美しい CLI とプログレスバー |
| `desloppify`, `bandit`, `tree-sitter` | コード品質スキャン、Python セキュリティチェック、parser ベースのコード解析 |
| `playwright` | ブラウザ自動化（Chromium は設定済み、すぐ使える） |

</details>

<details>
<summary><strong>システムツール</strong></summary>

| ツール | 用途 |
|------|---------------|
| `git`, `gh` | バージョン管理 + GitHub CLI（ターミナルから PR、issue、リリース） |
| `ripgrep` (`rg`), `fd`, `fzf` | 超高速検索 — Claude が常用する |
| `bat`, `tree`, `jq` | より良い cat（シンタックスハイライト）、ディレクトリツリー、JSON 処理 |
| `curl`, `wget` | HTTP ダウンロード |
| `tmux` | ターミナルマルチプレクサ — バックグラウンドで実行 |
| `htop`, `lsof`, `strace` | プロセス監視とデバッグ |
| `imagemagick` | 画像変換（`convert`、`identify`、`mogrify`） |
| `chromium` | ヘッドレスブラウザ — スクリーンショット、Playwright、Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | データベースへの直接アクセス |
| `openssh-client`, `openssh-server`, `mosh` | 外部への SSH と、コンテナへの任意の SSH/Mosh アクセス |

</details>

<details>
<summary><strong>AI CLI — 主要プロバイダー全て</strong></summary>

| CLI | コマンド | 用途 |
|-----|---------|---------------|
| **Claude Code** | `claude` | メインイベント — これの中で動いている |
| **Gemini CLI** | `gemini` | Google の AI コーディングエージェント |
| **OpenAI Codex** | `codex` | OpenAI のコーディングエージェント |
| **Cursor** | `cursor` | Cursor の AI エージェント |
| **TaskMaster AI** | `task-master` | タスク計画とオーケストレーション |
| **Junie** | `junie` | JetBrains の AI コーディングエージェント |
| **OpenCode** | `opencode` | オープンソース AI エージェント（OpenRouter と複数プロバイダー） |
| **Pi Coding Agent** | `pi` | 最小構成のエージェントハーネス（複数プロバイダー） |

8 つの AI CLI。1 つのコンテナ。瞬時に切り替え。これをやってくれる Docker イメージは他にない。

</details>

### フルイメージのみ（追加パッケージ）

フルイメージには上記のすべてに加えて:

<details>
<summary><strong>追加 npm パッケージ — デプロイ、ORM、パフォーマンス</strong></summary>

| パッケージ | 用途 |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers デプロイ |
| `vercel` | Vercel デプロイ |
| `netlify-cli` | Netlify デプロイ |
| `az` | クラウドデプロイと管理のための Azure CLI |
| `prisma`, `drizzle-kit` | 最も人気の 2 つの Node.js ORM |
| `pm2` | 本番プロセスマネージャー |
| `eas-cli` | Expo / React Native ビルド |
| `lighthouse`, `@lhci/cli` | パフォーマンス監査（Chromium は既にある） |
| `sharp-cli` | 画像処理 CLI |
| `json-server`, `http-server` | モック REST API、静的ファイル配信 |
| `@marp-team/marp-cli` | Markdown をプレゼンテーションスライドに変換 |

</details>

<details>
<summary><strong>追加 Python パッケージ — PDF、データ可視化、Web フレームワーク</strong></summary>

| パッケージ | 用途 |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | 主要 PDF ライブラリ全て。生成、読み込み、変換、マージ。 |
| `xlsxwriter`, `xlrd` | openpyxl ではカバーできない Excel フォーマット |
| `matplotlib`, `seaborn` | データ可視化とチャート |
| `python-pptx` | PowerPoint 生成 |
| `fastapi`, `uvicorn` | Python Web フレームワーク |

</details>

<details>
<summary><strong>追加システムパッケージ — メディア、ドキュメント</strong></summary>

| パッケージ | 用途 |
|---------|---------------|
| `pandoc` | あらゆるドキュメント形式間の変換（Markdown、HTML、PDF、docx、epub…） |
| `ffmpeg` | 動画と音声の処理（抽出、変換、トランスコード） |
| `libvips-dev` | 高性能画像処理ライブラリ |

</details>

> **スリムユーザーへ:** パッケージが足りない？ Claude に聞いてください。npm/pip パッケージは数秒でインストールできます。システムパッケージ（pandoc、ffmpeg）は 1〜2 分かかります。同じ機能が使えます — フルイメージは待ち時間がゼロなだけです。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :robot: AI CLI Providers

8 つの AI CLI。1 つのコンテナ。これをやってくれる Docker イメージは他にない。

| プロバイダー | コマンド | 認証方法 | サブスクリプション使用可? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI Web UI（OAuth） | **可** — Max/Pro プランまたは API キー |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY` 環境変数 | API キー（従量課金） |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` または `codex login --device-auth` | **可** — ChatGPT Plus/Pro/Team/Enterprise または API キー |
| **Cursor** | `cursor` | `CURSOR_API_KEY` 環境変数 | API キー |
| **TaskMaster AI** | `task-master` | 既存の AI プロバイダーキーを使用 | 設定済みキーで動作 |
| **Junie** | `junie` | JetBrains AI サブスクリプション | JetBrains アカウント必須 |
| **OpenCode** | `opencode` | TUI で設定 | OpenRouter と複数プロバイダー対応; full image のみ |
| **Pi Coding Agent** | `pi` | Pi で設定 | 複数プロバイダー対応 |

> Claude Code がメイン CLI です。他のものがあるのは、セカンドオピニオンが欲しいとき、特定モデルの強みを使いたいとき、または出力を比較したいときのため。すべてが `Tab` 一つで使えることが重要なのです。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :mag: Desloppify

Desloppify は両方の image に `desloppify` コマンドとして含まれています。デフォルトでは passive です。HolyClaude は、ユーザーが Desloppify を実行しない限り、scan を実行せず、`.desloppify/` を作らず、`.gitignore` を編集せず、mounted workspace を変更しません。

```bash
desloppify scan --path .
desloppify next
```

project を scan した後、その project の `.gitignore` に `.desloppify/` を追加してください。

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` は自動の global skill setup だけを無効にします。CLI はインストールされたままです。`all` は `claude,codex,gemini` です。`opencode` は full image 専用で、`all` には含まれません。OpenCode は `~/.claude/skills` から Claude-compatible skills も検出できるため、automatic setup で `claude` と `opencode` を組み合わせないでください。

手動の upstream targets: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ 上へ戻る</a>
</p>

---

## :llama: Using Ollama

HolyClaude は Anthropic サブスクリプションの代替として [Ollama](https://ollama.com) に対応しています。2 つの環境変数を設定してローカルまたはクラウドモデルを使用できます。

完全なセットアップガイド: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
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

### 各部品がどのように組み合わさるか

1. **コンテナ起動** — `entrypoint.sh` が root として実行。UID/GID をホストユーザーに合わせてリマップし、bootstrap が触れる前に保存済みの Claude Code セッションを復元し、初回起動かどうかを確認。

2. **初回起動のみ** — `bootstrap.sh` が一度だけ実行される。デフォルト設定、メモリテンプレートのコピー、git ID の設定。センチネルファイル（`.holyclaude-bootstrapped`）を作成して二度と実行されないようにする。それ以降はカスタマイズが安全に保持される。

3. **s6-overlay が PID 1 を引き継ぐ** — これは supervisord ではない。Docker 向けに作られた [s6-overlay](https://github.com/just-containers/s6-overlay) だ。CloudCLI、Xvfb、Claude セッション同期を監視。クラッシュ時に自動再起動。シグナルを転送。ゾンビプロセスを刈り取る。グレースフルシャットダウン。

4. **CloudCLI が Web UI を提供** — ポート 3001。プロジェクト管理、複数セッション、プラグイン（プロジェクト統計 + Web ターミナル同梱）を備えた Claude Code へのブラウザベースインターフェース。

5. **Xvfb が互換ディスプレイを提供** — 表示画面を使うツール向けに Xvfb を `:99` で残している。現在のヘッドレス Chromium、Playwright、Lighthouse が常に Xvfb を必要とするわけではない。

技術的な詳細 — s6 を supervisord の代わりに選んだ理由、プラグインをイメージに組み込んだ理由、`su` ではなく `runuser` を使う理由については [docs/architecture.md](docs/architecture.md) を参照。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :file_folder: Project Structure

```
holyclaude/
├── .github/                 # CI/CD ワークフロー、issue と PR テンプレート
│   ├── FUNDING.yml          # スポンサー/寄付リンク
│   ├── ISSUE_TEMPLATE/      # バグレポート、機能リクエスト、パッケージリクエスト
│   ├── pull_request_template.md
│   ├── SECURITY.md          # セキュリティポリシー
│   └── workflows/           # Docker ビルド & プッシュ自動化
├── assets/                  # ロゴとバナー画像
├── config/                  # Claude Code 設定
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # 拡張ドキュメント
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # コンテナライフサイクルスクリプト
│   ├── bootstrap.sh         # 初回実行セットアップ
│   ├── entrypoint.sh        # コンテナエントリーポイント
│   └── notify.py            # 通知ヘルパー（Apprise）
├── s6-overlay/              # プロセス監視（s6-rc サービス）
├── Dockerfile               # シングルステージビルド
├── docker-compose.yaml      # クイックスタート（最小設定）
├── docker-compose.full.yaml # フル設定（全オプション）
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :floppy_disk: Data & Persistence

| 内容 | 場所（コンテナ） | 場所（ホスト） | リビルド後も残る? |
|------|-------------------|-------------|-------------------|
| 設定、認証情報、API キー | `/home/claude/.claude` | `./data/claude` | **残る** |
| Claude Code セッション（OAuth、オンボーディング） | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **残る** |
| コードとプロジェクト | `/workspace` | `./workspace` | **残る** |
| CloudCLI アカウント | `/home/claude/.cloudcli` | *(デフォルトはコンテナのみ — 下記参照)* | 残らない（opt-in 可能） |

HolyClaude は起動時に新しいデフォルトファイルを作る前に、保存済みの Claude Code セッションを復元します。これで rebuild や recreate が本物の OAuth/API セッションをオンボーディング状態で置き換えることはありません。

### `docker compose down && docker compose up` 後も残るもの:
- Anthropic 認証と API キー
- Claude Code 設定、メモリ（`CLAUDE.md`）、OAuth セッション（再ログイン不要）
- `./workspace` 内のすべてのコード
- Git 設定
- Codex、Gemini、Cursor CLI の認証（v1.1.7 以降）

### やり直しが必要なもの（10 秒）:
- CloudCLI Web アカウント — 素早いサインアップだけ（下記の永続化を有効にしない限り）

### 初回起動セットアップの再実行:
```bash
# センチネルファイルを削除 — フォルダ全体ではない
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **`./data/claude/` を丸ごと削除しないこと。** そこに認証情報が入っている。新しいブートストラップが必要ならセンチネルファイルを削除する。設定をリセットしたければ特定の設定ファイルを削除する。ただしフォルダ全体を消すのは絶対にダメだ。

### CloudCLI アカウントの永続化（オプション、ローカルストレージのみ）

デフォルトでは、CloudCLI アカウントデータベース（`~/.cloudcli`）はコンテナローカルで、リビルド時に消える。アカウントの再作成は 10 秒で済むので、ほとんどの人はそのままにしている。

リビルド後も残したい場合は、compose ファイルに **named Docker volume** を追加する:

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

> **`./data/cloudcli` をネットワーク共有（NAS、SMB/CIFS、NFS）に bind-mount しないこと。** CloudCLI はアカウントを SQLite に保存しており、SQLite のファイルロックはネットワークマウントで壊れる。`database is locked` エラーが頻発する。Named volume は Docker エンジンのローカルファイルシステムに存在するため動作する — NAS を指す bind mount は動かない。

ローカル SSD パスへの bind mount も問題ない。ネットワーク共有さえ避ければ大丈夫だ。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :lock: Permissions

Claude Code はデフォルトで **`acceptEdits`** モードで動作する。これはイメージに同梱されている設定だ:

| アクション | 許可? |
|--------|----------|
| ファイルの読み込み | 許可 |
| ファイルの編集 / 作成 | 許可 |
| シェルコマンドの実行 | **先に確認する** |
| パッケージのインストール | **先に確認する** |

### 完全バイパスが必要な場合？（パワーユーザー向け）

これは私が個人的に使っている設定だ。ホスト上の `./data/claude/settings.json` を編集:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **バイパスモードは Claude が確認なしにコマンドを実行することを意味する。** 強力だが、破壊的なコマンドもすばやく実行できる。ワークスペースと各プロンプトを信頼できる場合を除き、同梱の `acceptEdits` デフォルトを維持すること。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :shield: リモートアクセスとセキュリティ

HolyClaude は CloudCLI をポート `3001` にバインドする。デフォルトはローカルのみ — ラップトップや SSH でアクセスするホームサーバーで動かすには十分だ。

**ネットワーク外からアクセスしたい瞬間、このセクションを読むこと。**

### 公開インターネットにポートフォワードしないこと

はっきり言う: ルーターに穴を開けて `3001` をオープンインターネットに晒すな。パスワードがあっても同じだ。理由:

- CloudCLI は web terminal プラグインを通じてフルシェルを公開している
- 任意のコードを実行し、パッケージをインストールし、`/workspace` 全体を読み書きできる
- Anthropic の OAuth トークンと API キーを保持している
- Basic 認証パスワードはブルートフォース、クレデンシャルスタッフィングされ、ログから抜き出される
- パスワードが漏れる = 誰かがあなたのお金であなたのマシンで有料 Claude Code インスタンスを動かす

パスワードはスピードバンプであって、ドアではない。HolyClaude を SSH セッションと同じように扱え: 適切なトンネルなしにオープンインターネットには絶対に出すな。

### 代わりに適切なトンネルを使う

本当に勧める 2 つの選択肢:

| 選択肢 | 向いている人 | 理由 |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | 個人利用、小規模チーム | WireGuard メッシュ VPN。サーバーとラップトップ/スマホに Tailscale をインストールすれば、LAN にいるかのように `http://holyclaude:3001` にどこからでもアクセスできる。ポート開放不要、DNS 不要、証明書不要。個人利用は無料。 |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | 他者と共有、公開ホスト名 | Cloudflare が接続をプロキシするので、ポート `3001` は閉じたまま。HTTPS 付きの本物のドメインが手に入り、Cloudflare Access（Google/GitHub SSO）を前に置ける。無料プランで個人利用のほとんどをカバーできる。 |

どちらも提供するもの:
- ルーターの開放ポートゼロ
- エンドツーエンドの暗号化トランスポート
- 本物のアイデンティティベース認証（共有パスワードではない）
- 監査ログ

### 直接公開するとしたら（やめてほしいが）

どうしてもトンネルをスキップしなければならない場合（セルフホスティングチュートリアル、隔離されたラボネットワーク等）、最低限:

1. **前にリバースプロキシを置く**（Caddy、nginx、Traefik）と本物の TLS
2. **ファイアウォールまたはプロキシレベルで IP allowlisting を追加** — 既知の IP のみ
3. **同梱の `acceptEdits` デフォルトを維持する**。`bypassPermissions` を使う明確な理由がある場合だけ変更する
4. **Anthropic の認証情報をローテート**する、何かおかしければ
5. **Cloudflare Access や同様の SSO の後ろで動かす**、Basic 認証ではなく

それでもリスク面は大きい。Tailscale か Cloudflare Tunnel を使え。無料で、5 分でセットアップでき、私が個人的に使っているものだ。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :bell: Notifications

コンピューターから離れて、Claude が終わったときに通知を受け取ろう。通知には [Apprise](https://github.com/caronc/apprise) を使用 — Discord、Telegram、Slack、Email、Pushover、Gotify を含む 100 以上のサービスに対応。

**有効にするには:**

1. compose の `environment` に `NOTIFY_*` 変数を一つ以上追加:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. コンテナ内で: `touch ~/.claude/notify-on`

すべての対応変数と URL 形式については [設定ドキュメント](docs/configuration.md#notifications-apprise) を参照。

**無効にするには:** `rm ~/.claude/notify-on`

**通知が発生するイベント:**
| イベント | 内容 |
|-------|--------------|
| `stop` | Claude が現在のタスクを完了した |
| `error` | ツール使用エラーが発生した |

> 設定されていない場合は完全に無音。`NOTIFY_*` 変数なし？フラグファイルなし？ネットワーク呼び出しゼロ。ログスパムゼロ。オーバーヘッドゼロ。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# 最新イメージをプル
docker compose pull

# 新しいイメージでコンテナを再作成
docker compose up -d
```

データは `./data/claude` と `./workspace` に残る — アップグレードはコンテナのみを置き換え、ファイルには触れない。

コンテナ内で `cloudcli update` や `npm install -g @cloudcli-ai/cloudcli@latest` を実行しないでください。HolyClaude はパッチ済みの CloudCLI ランタイムを含むため、更新は `docker compose pull && docker compose up -d` で行います。

`latest` の代わりに特定バージョンに固定するには:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI が間違ったデフォルトディレクトリを表示する</strong></summary>

CloudCLI が `/workspace` ではなく `/home/claude` を開く。

**原因:** カスタムまたは変更済みの CloudCLI サービススクリプトが、CloudCLI を起動する前に `WORKSPACES_ROOT=/workspace` を設定していない。

**修正方法:** HolyClaude では既に対処済み。s6 の run スクリプトがプロセス環境に直接 `WORKSPACES_ROOT=/workspace` を設定している。
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**原因:** SMB/CIFS ネットワークマウント上の SQLite データベース。CIFS は SQLite が必要とするファイルレベルのロックに対応していない。

**修正方法:** ネットワーク共有に SQLite データベースを保存しない。HolyClaude が `.cloudcli` をコンテナローカルストレージに保持しているのはまさにこの理由のため。NAS 上の `/workspace` に独自の SQLite データベースがある場合は、ローカルパスに移動する。
</details>

<details>
<summary><strong>Chromium のクラッシュ / 空白ページ / タブの失敗</strong></summary>

**原因:** 共有メモリ不足。Docker のデフォルトは 64MB。

**修正方法:** compose ファイルに `shm_size: 2g` があることを確認する。ブラウザを多用する場合（多くのタブ、複雑なページ）は `4g` に増やす。
</details>

<details>
<summary><strong>ファイルウォッチャーが変更を検出しない（ホットリロードが壊れる）</strong></summary>

**原因:** SMB/CIFS ネットワークマウントは `inotify` に対応していない。

**修正方法:** compose 環境でポーリングを有効にする:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
注意: ポーリングは inotify よりも CPU を多く使用する。ネットワークマウントでのみ有効にすること。
</details>

<details>
<summary><strong>パーミッションエラー</strong></summary>

**原因:** コンテナの UID/GID がホストのファイル所有権と一致していない。

**修正方法:**
```bash
# ホストマシンで
id -u  # → これが PUID
id -g  # → これが PGID
```
compose ファイルに設定:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker が .claude.json をディレクトリとして作成する</strong></summary>

**原因:** バインドマウントのターゲットファイルがコンテナ起動前に存在しない場合、Docker が親切にもディレクトリとして作成してしまう。ありがとう、Docker。

**修正方法:** 既に対処済み — `entrypoint.sh` が保存済みのセッションファイルを先に復元し、保存済みセッションがない場合だけ安全なデフォルトファイルを作成します。
</details>

すべての SMB/CIFS の落とし穴と、遭遇して修正したバグの全履歴を含む完全なガイドは [docs/troubleshooting.md](docs/troubleshooting.md) を参照。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :warning: Known Issues

これらは HolyClaude のバグではない — アップストリームの問題または意図的なトレードオフだ。

| 問題 | 理由 | 回避策 |
|-------|-----|------------|
| 「Continue in Shell」ボタンが機能しない | CloudCLI アップストリームのバグ（ターミナル初期化のレースコンディション） | 代わりに **Web Terminal** プラグインを使用（プリインストール済み） |
| Cursor CLI の「Command timeout」 | API キーが設定されていない — 外見上の問題のみ、何にも影響しない | `CURSOR_API_KEY` を設定するか無視する |
| リビルド後に CloudCLI アカウントが消える | SQLite はネットワークマウントに永続化できない — 意図的なトレードオフ | アカウントを再作成（約 10 秒） |
| Web プッシュ通知「not supported」 | CloudCLI のブラウザ制限、標準的な動作 | Apprise 通知を代わりに使用（[通知](#bell-notifications)を参照） |

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :hammer_and_wrench: Building Locally

Docker Hub からプルする代わりに自分でイメージをビルドしたい？ どうぞ:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# フルイメージのビルド
docker build -t holyclaude .

# スリムイメージのビルド
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# ARM 向けビルド（Apple Silicon、Raspberry Pi、AWS Graviton）
docker buildx build --platform linux/arm64 -t holyclaude .
```

compose ファイルで `image: coderluii/holyclaude:latest` の代わりに `image: holyclaude` を使う。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :bar_chart: Alternatives

HolyClaude は他のアプローチとどう違うか？

| アプローチ | Web UI | マルチ AI | 設定済みツール | ヘッドレスブラウザ | ワンコマンドセットアップ | 永続化 |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLI | 50 以上のツール | Chromium + Xvfb + Playwright | `docker compose up` | バインドマウント |
| Claude Code（ベアメタル） | なし | なし | 自分でインストール | 自分でインストール | マルチステップインストール | 手動 |
| Claude Code + oh-my-openagent | なし | あり（マルチモデル） | 一部 | なし | npm install | 手動 |
| DIY Docker + Claude Code | あるかも | あるかも | 自分で追加したもの | 設定すれば | Dockerfile を書けば | ボリュームをセットアップすれば |
| Cursor IDE | 組み込み | Cursor のみ | IDE 同梱 | なし | アプリをダウンロード | アプリデータ |

HolyClaude はコーディングエージェントと競合しているのではない — それらすべてをより良く動かす**インフラストラクチャレイヤー**だ。それらを内部で実行するコンテナだ。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :rocket: Roadmap

次に来るもの:

| ステータス | 機能 |
|--------|---------|
| 🔜 | **ARM ネイティブビルド** — エミュレーションではなく最適化されたネイティブ ARM64 イメージ |
| 🔜 | **VS Code トンネル統合** — VS Code デスクトップから接続するための組み込み VS Code Server またはトンネル |
| 🔜 | **通知ルーティング** — イベントタイプごとに異なる通知先（エラーは Telegram、完了は Discord） |

アイデアがある？[ディスカッションを開始する](https://github.com/CoderLuii/HolyClaude/discussions)か[機能をリクエストする](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml)。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :trophy: Built with HolyClaude

HolyClaude で何か作った？ ぜひ見せてほしい。

`showcase` ラベルで issue を開くか、PR を送ってプロジェクトをここに追加しよう:

<!-- Add your project: [Project Name](url) — one-line description -->

*最初のプロジェクトを追加してください。*

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :handshake: Contributing

コントリビュートを歓迎します。このプロジェクトは実際の日常使用から生まれ、より多くの人が使ってエッジケースを見つけることで改善されていく。

1. フォークする
2. ブランチを切る（`git checkout -b feature/something`）
3. コミットする
4. プッシュする
5. PR を出す

バグ、機能リクエスト、質問: [issue を開く](https://github.com/CoderLuii/HolyClaude/issues)。

### 連絡先

| チャンネル | 用途 |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | 質問、セットアップの紹介、アイデア |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | バグレポート、機能 & パッケージリクエスト |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | 脆弱性の報告（非公開） |

### ツールを追加してほしい？

[📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml) issue テンプレートを使用してください。パッケージ名、インストール方法、対象バリアント（full/slim）を記載してください。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :heart: Support

HolyClaude は無料のオープンソースで、毎日使っている一人の開発者によってメンテナンスされている。

時間を節約できたなら、こんな方法で応援できる:

- **このリポジトリにスターをつける** — 可視性のために一番効果的なこと
- **シェアする** — 友達に伝える、投稿する、ツイートする
- **issue を開く** — バグレポートと機能リクエストが HolyClaude を皆のために改善する
- **コントリビュートする** — PR は常に歓迎

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :scroll: Third-Party Software

HolyClaude Docker イメージにはサードパーティソフトウェアが含まれており、それぞれ独自のライセンスのもとに配布されています。主なコンポーネント:

| コンポーネント | ライセンス | ソース |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

変更通知を含む完全な詳細は [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) を参照。HolyClaude 自体のソースコードは MIT ライセンスです。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
</p>

---

## :page_facing_up: License

MIT — [LICENSE](LICENSE) を参照。自由に使ってください。

<p align="right">
  <a href="#top">↑ トップへ戻る</a>
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

[CoderLuii](https://github.com/coderluii) 作 · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

このコンテナは私が毎日使っているものです。私が節約したセットアップ時間の半分でも節約できたなら、スターをつけてもらえると嬉しいです。

</div>
