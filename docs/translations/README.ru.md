🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | **Русский** | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Хватит настраивать. Начни создавать.

Одна команда. Полноценная рабочая станция для разработки с AI. Claude Code, веб-интерфейс, безголовый браузер, 8 AI CLI, 50+ инструментов разработчика — всё в контейнере и готово к работе.

**Вы собирались потратить 2 часа на ручную настройку. Или просто запустить `docker compose up`.**

**Работает с вашей существующей подпиской на Claude Code.** Тарифный план Max/Pro, API-ключ — что бы у вас ни было, всё просто работает.

---

## Что это такое?

Всё как обычно. Вам нужен Claude Code. Но вы также хотите использовать его в браузере. С безголовым браузером для скриншотов и тестирования. С настроенным Playwright. С каждым AI CLI. С TypeScript, Python, инструментами развёртывания, клиентами баз данных, GitHub CLI.

И вы начинаете устанавливать всё по очереди. Затем Chromium не запускается, потому что общая память Docker — 64 МБ. Потом Xvfb не настроен. Потом UID внутри контейнера не совпадает с вашим хостом, и везде «permission denied». Потом оказывается, что установщик Claude Code зависает, когда WORKDIR принадлежит root. Потом SQLite блокируется на монтировании NAS. Потом...

**HolyClaude — это контейнер, который я собрал, решив каждую из этих проблем.**

Я запускаю его ежедневно на своём сервере уже несколько недель. Каждый баг был воспроизведён, диагностирован и исправлен. Каждый крайний случай обработан. На каждый вопрос «почему это не работает в Docker» дан ответ.

Вы скачиваете его. Запускаете. Открываете браузер. Создаёте.

### :credit_card: Используйте свою существующую подписку

**Здесь запускается настоящий Claude Code CLI.** Не обёртка. Не прокси. Не имитация.

Ваш существующий аккаунт Anthropic работает напрямую:
- **Claude Max/Pro план** — аутентификация через веб-интерфейс (OAuth), так же, как в настольном Claude Code
- **Anthropic API-ключ** — введите его через веб-интерфейс, та же тарификация, что и всегда
- **Без дополнительных расходов** — HolyClaude бесплатен и с открытым исходным кодом. Вы платите Anthropic только за то, что используете, как уже делаете.

> HolyClaude не касается ваших учётных данных. Они хранятся локально в вашем привязанном томе (`./data/claude/`), так же, как если бы вы работали на обычном железе.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## Содержание

| | Раздел |
|---|---|
| :zap: | [Быстрый старт](#zap-quick-start) |
| :computer: | [Поддерживаемые платформы](#computer-platform-support) |
| :star2: | [Почему HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Подписка и аутентификация](#credit_card-subscription--authentication) |
| :package: | [Варианты образов](#package-image-variants) |
| :whale: | [Docker Compose — Быстрый](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Полный](#whale2-docker-compose--full) |
| :wrench: | [Переменные окружения](#wrench-environment-variables) |
| :rocket: | [Что внутри](#rocket-whats-inside) |
| :robot: | [AI CLI провайдеры](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Использование Ollama](#llama-using-ollama) |
| :building_construction: | [Архитектура](#building_construction-architecture) |
| :file_folder: | [Структура проекта](#file_folder-project-structure) |
| :floppy_disk: | [Данные и постоянство](#floppy_disk-data--persistence) |
| :lock: | [Разрешения](#lock-permissions) |
| :shield: | [Удалённый доступ и безопасность](#shield-remote-access--exposure) |
| :bell: | [Уведомления](#bell-notifications) |
| :arrows_counterclockwise: | [Обновление](#arrows_counterclockwise-upgrading) |
| :construction: | [Устранение неполадок](#construction-troubleshooting) |
| :warning: | [Известные проблемы](#warning-known-issues) |
| :hammer_and_wrench: | [Локальная сборка](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Альтернативы](#bar_chart-alternatives) |
| :rocket: | [Дорожная карта](#rocket-roadmap) |
| :trophy: | [Создано с HolyClaude](#trophy-built-with-holyclaude) |
| :handshake: | [Участие в разработке](#handshake-contributing) |
| :heart: | [Поддержка](#heart-support) |
| :scroll: | [Стороннее ПО](#scroll-third-party-software) |
| :page_facing_up: | [Лицензия](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :zap: Быстрый старт

**1.** Создайте папку для HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Создайте файл `docker-compose.yaml`. Скопируйте один из шаблонов ниже:
- [Быстрый шаблон](#whale-docker-compose--quick) — минимальный, без настройки, просто работает
- [Полный шаблон](#whale2-docker-compose--full) — все параметры, полная документация

**3.** Загрузите и запустите:

```bash
docker compose up -d
```

**4.** Откройте веб-интерфейс:

```
http://localhost:3001
```

**5.** Создайте аккаунт CloudCLI (займёт 10 секунд), войдите с вашим аккаунтом Anthropic — и вы в деле.

> Никаких файлов `.env`. Никаких предварительных настроек. Никакого чтения 40 страниц документации перед началом. Просто запускается.

> **Хотите получить доступ извне вашей сети?** Не делайте port-forward. Смотрите [Удалённый доступ и безопасность](#shield-remote-access--exposure) — используйте Tailscale или Cloudflare Tunnel.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :computer: Поддерживаемые платформы

| Платформа | Статус | Примечания |
|----------|--------|-------|
| Linux (amd64) | ✅ Полная поддержка | Нативная производительность, рекомендуется |
| Linux (arm64) | ✅ Полная поддержка | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Полная поддержка | Apple Silicon и Intel через Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Полная поддержка | Требуется бэкенд WSL2 |
| Synology / QNAP NAS | ✅ Полная поддержка | Используйте `CHOKIDAR_USEPOLLING=true` для SMB-монтирований |
| Kubernetes | 🔜 Скоро | Запланирован Helm chart |

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :star2: Почему HolyClaude

Я создал это, потому что устал повторять одну и ту же настройку каждый раз. Установка Claude Code, подключение веб-интерфейса, настройка Chromium в Docker, исправление проблем с правами доступа, отладка управления процессами. Снова и снова.

Поэтому я сделал контейнер, который делает всё это. И потом столкнулся с каждой возможной ошибкой, чтобы вам не пришлось.

| | HolyClaude | Делать самостоятельно |
|---|---|---|
| **Установка** | 30 секунд | 1-2 часа (если всё идёт хорошо) |
| **Claude Code** | Предустановлен, преднастроен, готов | Установить, настроить, отладить зависание установщика, исправить WORKDIR |
| **Веб-интерфейс** | CloudCLI включён с плагинами | Найти веб-интерфейс, установить его, настроить, подключить к Claude |
| **Безголовый браузер** | Chromium + Xvfb + Playwright, настроено | Установить Chromium, установить Xvfb, настроить дисплей :99, исправить shm, sandbox, seccomp... |
| **AI CLI** | 8 провайдеров, один контейнер | Устанавливать каждый отдельно через 3 менеджера пакетов |
| **Инструменты разработки** | 50+ инструментов, готовы | `apt-get install` / `npm i -g` / `pip install` на следующий час |
| **Управление процессами** | s6-overlay (автоперезапуск, корректное завершение) | Писать собственный конфиг supervisord или надеяться на restart в Docker |
| **Постоянство данных** | Bind-монтирования, учётные данные переживают всё | Разбираться с томами Docker, отлаживать «почему это директория, а не файл» |
| **Обновления** | `docker pull && docker compose up -d` | Обновлять 50 инструментов вручную, молясь, что ничего не сломается |
| **Мультиархитектурность** | AMD64 + ARM64 | Надеяться, что ваш Dockerfile соберётся на ARM |

**Последняя строка каждой ручной установки — «работает на моей машине».** HolyClaude работает на каждой машине.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :credit_card: Подписка и аутентификация

HolyClaude запускает **официальный Claude Code CLI** от Anthropic. Ваш существующий аккаунт работает из коробки.

### Что работает:

| Метод аутентификации | Как | Стоимость |
|----------------------|-----|------|
| **Claude Max/Pro план** (подписка) | Войдите через веб-интерфейс CloudCLI — тот же OAuth, что и в настольном приложении | Ваша существующая подписка, без дополнительной оплаты |
| **Anthropic API-ключ** | Вставьте API-ключ в веб-интерфейс | Оплата по факту использования, та же тарификация Anthropic |

### Что не работает:

| | Почему |
|---|---|
| OpenAI API-ключ для Claude | Разные компании, разные API. Ключи OpenAI работают с **Codex CLI** (тоже предустановлен) |

> **Подписчики ChatGPT Plus/Pro:** Ваша подписка работает с **Codex CLI**. Запустите `codex login --device-auth` внутри контейнера для аутентификации через ваш аккаунт ChatGPT.

### Другие AI CLI в комплекте:

| CLI | Что нужно |
|-----|--------------|
| Gemini CLI | Google AI API-ключ (`GEMINI_API_KEY`) |
| OpenAI Codex | OpenAI API-ключ (`OPENAI_API_KEY`) или подписка ChatGPT Plus/Pro (`codex login --device-auth`) |
| Cursor | Cursor API-ключ (`CURSOR_API_KEY`) |
| TaskMaster AI | Использует ваши ключи AI-провайдеров (Anthropic, OpenAI и др.) |
| Junie | Аккаунт JetBrains (подписка JetBrains AI) |
| OpenCode | Настройка через TUI `opencode` (поддерживает OpenRouter и несколько провайдеров) |
| Pi Coding Agent | Настройка через `pi` (поддерживает несколько провайдеров) |

> **HolyClaude бесплатен и с открытым исходным кодом.** Вы платите только своим AI-провайдерам за использование, как уже делаете. Мы не проксируем, не перехватываем и не касаемся ваших учётных данных. Они живут в вашем локальном bind-монтировании.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :package: Варианты образов

Два варианта. Одинаковое качество. Выберите свой весовой класс.

| Тег | Что включено | Лучше для |
|-----|-------------|----------|
| **`latest`** | Всё предустановлено — каждый инструмент, каждая библиотека, каждый CLI | Большинство пользователей. Нулевое время ожидания. Claude никогда не останавливается, чтобы что-то установить. |
| **`slim`** | Только основные инструменты — Claude устанавливает дополнения по требованию | Небольшой VPS, ограниченный диск, тарифицируемая пропускная способность |
| `X.Y.Z` | Полный образ, фиксированная версия | Стабильность в продакшене — вы контролируете, когда обновляться |
| `X.Y.Z-slim` | Slim-образ, фиксированная версия | Продакшен + небольшой размер |

```bash
# Полный — всё включено (рекомендуется)
docker pull coderluii/holyclaude

# Slim — лёгкий и быстрый
docker pull coderluii/holyclaude:slim
```

> **`latest` — всегда полный образ.** Пользователи slim: не беспокойтесь — когда вы попросите Claude сделать что-то, для чего нужен отсутствующий инструмент, он установит его за секунды. Вы получаете те же возможности, просто с меньшим первоначальным скачиванием.
>
> Docker Hub показывает сжатый размер загрузки: `latest` примерно 4,1 GB, `slim` примерно 2,4 GB. Docker, Synology Container Manager и файловые системы NAS могут показывать больший размер после распаковки слоев.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :whale: Docker Compose — Быстрый

Шаблон «просто хочу, чтобы всё работало». Скопируйте весь этот блок в файл `docker-compose.yaml`:

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

Затем:

```bash
docker compose up -d
```

Откройте `http://localhost:3001`. Создайте аккаунт CloudCLI. Войдите с аккаунтом Anthropic. Создавайте что-нибудь.

**Это вся настройка. Вы готовы.**

> **Зачем эти права браузера?** В этой версии сохраняется текущий браузерный профиль HolyClaude. `SYS_ADMIN` и `seccomp=unconfined` расширяют права процессов и снижают изоляцию; `SYS_PTRACE` нужен для отладки. Оставьте этот профиль без изменений для v1.5.0 и рассматривайте hardening как отдельное изменение.

> **Зачем `shm_size: 2g`?** По умолчанию Docker выделяет контейнерам 64 МБ общей памяти. HolyClaude сохраняет 2 ГБ как закреплённый default для этой версии, потому что Chromium активно использует `/dev/shm` для рендеринга вкладок. При 64 МБ вкладки падают; при активном использовании браузера поднимите до 4 ГБ.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :whale2: Docker Compose — Полный

Тот же образ, все параметры открыты. Скопируйте весь этот блок в файл `docker-compose.yaml`:

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

Затем:

```bash
docker compose up -d
```

Если вы хотите изменить порт на стороне хоста или пути bind-монтирования без редактирования compose, скопируйте `.env.example` в `.env` и задайте:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Эти значения читаются Docker Compose на хосте. Они не являются переменными окружения контейнера.

### Что контролирует каждый раздел:

| Раздел | Что делает | Когда менять |
|---------|-------------|-------------------|
| **Timezone** | Часы контейнера | Всегда — установите свой местный часовой пояс |
| **Performance** | Потолок памяти Node.js | Только если вы получаете ошибки OOM на больших проектах |
| **User mapping** | Права доступа к файлам между контейнером и хостом | Если вы получаете «permission denied» (`id -u` и `id -g` на хосте) |
| **SMB/CIFS** | Режим опроса файлового наблюдателя | Только если ваши тома находятся на NAS или сетевом ресурсе |
| **Notifications** | Push-уведомления через Apprise (Discord, Telegram, Slack, Email, 100+ сервисов) | Если хотите отойти и знать, когда Claude закончил |
| **AI providers** | API-ключи для Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Если хотите использовать AI CLI кроме Claude |

> **Каждая переменная окружения необязательна.** Контейнер отлично работает только с `TZ=UTC`. У всего остального есть разумные значения по умолчанию или настройка через веб-интерфейс.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :wrench: Переменные окружения

Полный справочник. Каждая переменная, её значение по умолчанию, что она делает.

| Переменная | По умолчанию | Что делает |
|----------|---------|--------------|
| `TZ` | `UTC` | Часовой пояс контейнера |
| `PUID` | `1000` | ID пользователя контейнера для Docker-remap; rootless Podman использует `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | ID группы контейнера для Docker-remap; rootless Podman использует `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Лимит памяти кучи Node.js в МБ |
| `GIT_USER_NAME` | `HolyClaude User` | Автор git-коммитов (устанавливается один раз при первом запуске) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Email git-коммитов (устанавливается один раз при первом запуске) |
| `CHOKIDAR_USEPOLLING` | *(не задано)* | Установите `1` для SMB/CIFS — включает опросные файловые наблюдатели |
| `WATCHFILES_FORCE_POLLING` | *(не задано)* | Установите `true` для SMB/CIFS — включает Python-опрос |
| `NOTIFY_DISCORD` | *(не задано)* | URL Discord-вебхука для уведомлений |
| `NOTIFY_TELEGRAM` | *(не задано)* | URL Telegram-бота для уведомлений |
| `NOTIFY_PUSHOVER` | *(не задано)* | URL Pushover для уведомлений |
| `NOTIFY_SLACK` | *(не задано)* | URL Slack-вебхука для уведомлений |
| `NOTIFY_EMAIL` | *(не задано)* | Email (SMTP) URL для уведомлений |
| `NOTIFY_GOTIFY` | *(не задано)* | URL Gotify для уведомлений |
| `NOTIFY_URLS` | *(не задано)* | Универсальный — разделённые запятыми [URL Apprise](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(не задано)* | Anthropic API-ключ (альтернатива OAuth через веб-интерфейс) |
| `ANTHROPIC_AUTH_TOKEN` | *(не задано)* | Токен аутентификации Anthropic (альтернатива API-ключу) |
| `ANTHROPIC_BASE_URL` | *(не задано)* | Пользовательский эндпоинт API Anthropic (прокси, частные развёртывания) |
| `CLAUDE_CODE_USE_BEDROCK` | *(не задано)* | Установите `1` для использования бэкенда Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | *(не задано)* | Установите `1` для использования бэкенда Google Vertex AI |
| `GEMINI_API_KEY` | *(не задано)* | Google Gemini API-ключ |
| `OPENAI_API_KEY` | *(не задано)* | OpenAI API-ключ (для Codex CLI или используйте `codex login --device-auth` для подписки ChatGPT) |
| `CURSOR_API_KEY` | *(не задано)* | Cursor API-ключ |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Опциональная глобальная настройка Desloppify skills. Значения: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` или списки через запятую |
| `OLLAMA_HOST` | *(не задано)* | URL эндпоинта Ollama (например, `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :rocket: Что внутри

Это не минимальный контейнер. Это полноценная рабочая станция разработчика.

### Оба варианта (full + slim)

<details>
<summary><strong>Node.js 26 + npm глобальные пакеты</strong></summary>

| Пакет | Для чего |
|---------|---------------|
| `typescript`, `tsx` | Компиляция и выполнение TypeScript |
| `pnpm` | Быстрый, эффективный по дисковому пространству менеджер пакетов |
| `vite`, `esbuild` | Молниеносные инструменты сборки |
| `eslint`, `prettier` | Качество кода и форматирование |
| `serve`, `nodemon` | Статический файловый сервер, сервер разработки с автоперезапуском |
| `concurrently` | Запуск нескольких скриптов параллельно |
| `dotenv-cli` | Загрузка переменных окружения из файлов `.env` |

</details>

<details>
<summary><strong>Python 3 пакеты</strong></summary>

| Пакет | Для чего |
|---------|---------------|
| `requests`, `httpx` | HTTP-клиенты |
| `beautifulsoup4`, `lxml` | Парсинг веб-страниц и HTML |
| `Pillow` | Обработка изображений (предкомпилировано — без ожидания) |
| `pandas`, `numpy` | Манипуляция данными (предкомпилировано — серьёзно, вы не захотите делать pip install этого в рантайме) |
| `openpyxl` | Чтение/запись файлов Excel |
| `python-docx` | Чтение/запись документов Word |
| `jinja2`, `markdown` | Шаблонизация и отрисовка markdown |
| `pyyaml`, `python-dotenv` | Разбор конфигурационных файлов |
| `rich`, `click`, `tqdm` | Красивые CLI и индикаторы прогресса |
| `desloppify`, `bandit`, `tree-sitter` | Сканирование качества кода, проверки безопасности Python, анализ кода на базе parser |
| `playwright` | Автоматизация браузера (Chromium уже настроен и готов) |

</details>

<details>
<summary><strong>Системные инструменты</strong></summary>

| Инструмент | Для чего |
|------|---------------|
| `git`, `gh` | Контроль версий + GitHub CLI (PR, issues, релизы из терминала) |
| `ripgrep` (`rg`), `fd`, `fzf` | Молниеносный поиск — Claude использует их постоянно |
| `bat`, `tree`, `jq` | Улучшенный cat (подсветка синтаксиса), деревья директорий, обработка JSON |
| `curl`, `wget` | HTTP-загрузки |
| `tmux` | Мультиплексор терминала — запуск задач в фоне |
| `htop`, `lsof`, `strace` | Мониторинг процессов и отладка |
| `imagemagick` | Конвертация изображений (`convert`, `identify`, `mogrify`) |
| `chromium` | Безголовый браузер — скриншоты, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Прямое обращение к базам данных |
| `openssh-client`, `openssh-server`, `mosh` | Исходящий SSH и опциональный SSH/Mosh-доступ в контейнер |

</details>

<details>
<summary><strong>AI CLI — каждый крупный провайдер</strong></summary>

| CLI | Команда | Для чего |
|-----|---------|---------------|
| **Claude Code** | `claude` | Главное событие — вы работаете внутри него |
| **Gemini CLI** | `gemini` | AI-агент кодирования от Google |
| **OpenAI Codex** | `codex` | AI-агент кодирования от OpenAI |
| **Cursor** | `cursor` | AI-агент Cursor |
| **TaskMaster AI** | `task-master` | Планирование и оркестрация задач |
| **Junie** | `junie` | AI-агент кодирования от JetBrains |
| **OpenCode** | `opencode` | Open source AI-агент (OpenRouter и несколько провайдеров) |
| **Pi Coding Agent** | `pi` | Минимальный агентный harness (несколько провайдеров) |

Восемь AI CLI. Один контейнер. Мгновенное переключение между ними. Ни один другой Docker-образ этого не делает.

</details>

### Только полный образ (дополнительные пакеты)

Полный образ включает всё вышеперечисленное, плюс:

<details>
<summary><strong>Дополнительные npm пакеты — развёртывание, ORM, производительность</strong></summary>

| Пакет | Для чего |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Развёртывание Cloudflare Workers |
| `vercel` | Развёртывание Vercel |
| `netlify-cli` | Развёртывание Netlify |
| `az` | Azure CLI для облачного развёртывания и управления |
| `prisma`, `drizzle-kit` | Два самых популярных Node.js ORM |
| `pm2` | Менеджер процессов для продакшена |
| `eas-cli` | Сборки Expo / React Native |
| `lighthouse`, `@lhci/cli` | Аудит производительности (Chromium уже здесь) |
| `sharp-cli` | CLI обработки изображений |
| `json-server`, `http-server` | Мок REST API, статическое файловое обслуживание |
| `@marp-team/marp-cli` | Markdown в презентационные слайды |

</details>

<details>
<summary><strong>Дополнительные Python пакеты — PDF, визуализация данных, веб-фреймворки</strong></summary>

| Пакет | Для чего |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Каждая крупная PDF-библиотека. Генерировать, читать, конвертировать, объединять. |
| `xlsxwriter`, `xlrd` | Форматы Excel, выходящие за рамки возможностей openpyxl |
| `matplotlib`, `seaborn` | Визуализация данных и графики |
| `python-pptx` | Генерация PowerPoint |
| `fastapi`, `uvicorn` | Python веб-фреймворк |

</details>

<details>
<summary><strong>Дополнительные системные пакеты — медиа, документы</strong></summary>

| Пакет | Для чего |
|---------|---------------|
| `pandoc` | Конвертация между любыми форматами документов (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Обработка видео и аудио (извлечение, конвертация, перекодирование) |
| `libvips-dev` | Высокопроизводительная библиотека обработки изображений |

</details>

> **Пользователи slim:** Не хватает пакета? Спросите Claude. Он устанавливает npm/pip пакеты за секунды. Системные пакеты (pandoc, ffmpeg) занимают 1-2 минуты. Вы получаете те же возможности — полный образ просто имеет нулевое время ожидания.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :robot: AI CLI провайдеры

Восемь AI CLI. Один контейнер. Ни один другой Docker-образ не даёт вам этого.

| Провайдер | Команда | Как аутентифицироваться | Работает подписка? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | Веб-интерфейс CloudCLI (OAuth) | **Да** — план Max/Pro или API-ключ |
| **Gemini CLI** | `gemini` | Переменная окружения `GEMINI_API_KEY` | API-ключ (оплата по факту) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` или `codex login --device-auth` | **Да** — ChatGPT Plus/Pro/Team/Enterprise или API-ключ |
| **Cursor** | `cursor` | Переменная окружения `CURSOR_API_KEY` | API-ключ |
| **TaskMaster AI** | `task-master` | Использует существующие ключи AI-провайдеров | Работает с настроенными ключами |
| **Junie** | `junie` | Подписка JetBrains AI | Требуется аккаунт JetBrains |
| **OpenCode** | `opencode` | Настройка через TUI | Поддерживает OpenRouter и несколько провайдеров; только full image |
| **Pi Coding Agent** | `pi` | Настройка через Pi | Поддерживает несколько провайдеров |

> Claude Code — основной CLI. Остальные нужны, потому что иногда хочется второго мнения, или специфических сильных сторон конкретной модели, или вы сравниваете результаты. Иметь все они на расстоянии одного нажатия `Tab` — в этом весь смысл.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :mag: Desloppify

Desloppify входит в оба image как команда `desloppify`. По умолчанию он пассивен: HolyClaude не запускает scans, не создает `.desloppify/`, не редактирует `.gitignore` и не меняет mounted workspace, пока вы сами не запустите Desloppify.

```bash
desloppify scan --path .
desloppify next
```

После scan проекта добавьте `.desloppify/` в `.gitignore` этого проекта.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` отключает только автоматическую глобальную настройку skills; CLI остается установленной. `all` означает `claude,codex,gemini`. `opencode` доступен только в full image и не входит в `all`. Не объединяйте `claude` и `opencode` в automatic setup, потому что OpenCode также видит Claude-compatible skills из `~/.claude/skills`.

Ручные upstream targets: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :llama: Использование Ollama

HolyClaude работает с [Ollama](https://ollama.com) как альтернативой подписке Anthropic. Установите две переменные окружения и используйте локальные или облачные модели.

Смотрите полное руководство по настройке: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :building_construction: Архитектура

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

### Как части соединяются вместе

1. **Контейнер запускается** — `entrypoint.sh` выполняется от root. Переназначает UID/GID под пользователя хоста, восстанавливает сохранённую сессию Claude Code до запуска bootstrap и проверяет, является ли это первым запуском.

2. **Только при первом запуске** — `bootstrap.sh` выполняется один раз. Копирует настройки по умолчанию, шаблон памяти, настраивает git-идентичность. Создаёт файл-маркер (`.holyclaude-bootstrapped`), чтобы никогда не запускаться снова. С этого момента ваши настройки в безопасности.

3. **s6-overlay берёт управление как PID 1** — Это не supervisord. Это [s6-overlay](https://github.com/just-containers/s6-overlay), созданный специально для Docker. Следит за CloudCLI, Xvfb и синхронизацией сессии Claude. Автоматически перезапускает при падении. Пересылает сигналы. Убирает зомби-процессы. Корректно завершает работу.

4. **CloudCLI обслуживает веб-интерфейс** — Порт 3001. Браузерный интерфейс к Claude Code с управлением проектами, несколькими сессиями и плагинами (статистика проекта + веб-терминал включены).

5. **Xvfb предоставляет дисплей совместимости** — Xvfb остаётся доступным на `:99` для инструментов, которым нужен обычный дисплей. Современным headless Chromium, Playwright и Lighthouse Xvfb требуется не всегда.

Смотрите [docs/architecture.md](docs/architecture.md) для полного технического погружения — включая, почему мы выбрали s6 вместо supervisord, почему плагины встроены в образ, и почему `runuser` вместо `su`.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :file_folder: Структура проекта

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
  <a href="#top">↑ наверх</a>
</p>

---

## :floppy_disk: Данные и постоянство

| Что | Где (контейнер) | Где (хост) | Переживает пересборку? |
|------|-------------------|-------------|-------------------|
| Настройки, учётные данные, API-ключи | `/home/claude/.claude` | `./data/claude` | **Да** |
| Сессия Claude Code (OAuth, онбординг) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Да** |
| Ваш код и проекты | `/workspace` | `./workspace` | **Да** |
| Аккаунт CloudCLI | `/home/claude/.cloudcli` | *(только в контейнере по умолчанию — см. ниже)* | Нет (opt-in доступен) |

HolyClaude восстанавливает сохранённую сессию Claude Code до того, как запуск сможет создать новый файл по умолчанию. Так rebuild и recreate не заменяют настоящую OAuth/API-сессию состоянием onboarding.

### Что переживает `docker compose down && docker compose up`:
- Ваша аутентификация Anthropic и API-ключи
- Настройки Claude Code, память (`CLAUDE.md`) и OAuth-сессия (без повторного входа)
- Весь ваш код в `./workspace`
- Конфигурация git
- Аутентификация Codex, Gemini и Cursor CLI (с v1.1.7)

### Что придётся повторить (10 секунд):
- Аккаунт CloudCLI — быстрая регистрация, вот и всё (если не включите persistency ниже)

### Повторный запуск первоначальной настройки:
```bash
# Удалите файл-маркер — НЕ всю папку
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Никогда не удаляйте `./data/claude/` полностью.** Там живут ваши учётные данные. Удалите файл-маркер, если хотите чистую начальную загрузку. Удалите конкретные файлы конфигурации, если хотите сбросить настройки. Но никогда не уничтожайте всю папку.

### Сохранение аккаунта CloudCLI (опционально, только локальное хранилище)

По умолчанию база данных аккаунта CloudCLI (`~/.cloudcli`) локальна для контейнера и удаляется при пересборке. Пересоздание аккаунта занимает 10 секунд, поэтому большинство людей оставляют всё как есть.

Если хотите, чтобы аккаунт переживал пересборки, добавьте **named Docker volume** в ваш compose-файл:

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

> **НЕ делайте bind-mount `./data/cloudcli` на сетевой ресурс (NAS, SMB/CIFS, NFS).** CloudCLI хранит аккаунт в SQLite, а блокировка файлов SQLite не работает на сетевых монтированиях. Вы будете постоянно получать ошибки `database is locked`. Named volumes живут на локальной файловой системе Docker engine, поэтому это работает — bind mounts на NAS работать не будут.

Bind mount к локальному SSD-пути тоже подойдёт, только держите его подальше от любых сетевых ресурсов.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :lock: Разрешения

Claude Code работает в режиме **`acceptEdits`** по умолчанию. Это настройка, которая поставляется в образе:

| Действие | Разрешено? |
|--------|----------|
| Чтение файлов | Да |
| Редактирование / создание файлов | Да |
| Выполнение команд оболочки | **Спрашивает сначала** |
| Установка пакетов | **Спрашивает сначала** |

### Хотите полный обход? (для опытных пользователей)

Именно так я лично запускаю его. Отредактируйте `./data/claude/settings.json` на вашем хосте:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Режим обхода означает, что Claude выполняет команды без подтверждения.** Он мощный, но может быстро выполнить разрушительные команды. Оставьте поставляемый по умолчанию `acceptEdits`, если вы не доверяете рабочей области и каждому запросу.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :shield: Удалённый доступ и безопасность

HolyClaude привязывает CloudCLI к порту `3001`. По умолчанию это только локально — отлично для запуска на ноутбуке или домашнем сервере, к которому вы подключаетесь по SSH.

**Как только вы захотите получить доступ извне вашей сети — прочитайте этот раздел.**

### Не делайте port-forward в публичный интернет

Скажу прямо: не пробивайте дыру в роутере и не открывайте `3001` в открытый интернет. Даже с паролем. Вот почему:

- CloudCLI открывает полноценный shell через плагин веб-терминала
- Он может выполнять произвольный код, устанавливать пакеты и читать/писать весь ваш `/workspace`
- Он хранит ваши OAuth-токены Anthropic и API-ключи
- Пароли базовой аутентификации взламываются брутфорсом, credential stuffing'ом и извлекаются из логов
- Один утёкший пароль = кто-то другой запускает платный экземпляр Claude Code на вашей машине за ваши деньги

Пароль — это лежачий полицейский, не дверь. Относитесь к HolyClaude как к SSH-сессии: никогда в открытом интернете без нормального туннеля перед ним.

### Используйте нормальный туннель

Вот два варианта, которые я реально рекомендую:

| Вариант | Для кого | Почему |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Личное использование, небольшие команды | WireGuard mesh VPN. Установите Tailscale на сервер + ноутбук/телефон, и вы получаете доступ к `http://holyclaude:3001` откуда угодно, как будто вы в локальной сети. Никаких открытых портов, DNS, сертификатов. Бесплатно для личного использования. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Доступ для других, публичный hostname | Cloudflare проксирует соединение, поэтому порт `3001` остаётся закрытым. Вы получаете реальный домен с HTTPS и можете поставить Cloudflare Access (Google/GitHub SSO) перед ним. Бесплатный тариф покрывает большинство личных нужд. |

Оба дают вам:
- Ноль открытых портов на роутере
- Зашифрованный транспорт от конца до конца
- Реальную аутентификацию на основе идентификации (не общий пароль)
- Журналы аудита

### Если вы настаиваете на прямом открытии (пожалуйста, не надо)

Если вы абсолютно вынуждены обойтись без туннеля (туториал по self-hosting, изолированная лабораторная сеть, что угодно), как минимум:

1. **Поставьте reverse proxy перед ним** (Caddy, nginx, Traefik) с настоящим TLS
2. **Добавьте IP allowlisting** на уровне файрвола или прокси — только ваши известные IP
3. **Оставьте поставляемый по умолчанию `acceptEdits`**, если у вас нет явной причины использовать `bypassPermissions`
4. **Ротируйте учётные данные Anthropic**, если что-то выглядит подозрительно
5. **Запускайте за Cloudflare Access или аналогичным SSO**, не базовой аутентификацией

Даже со всем этим поверхность риска огромна. Используйте Tailscale или Cloudflare Tunnel. Они бесплатны, настраиваются за пять минут, и именно их я использую лично.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :bell: Уведомления

Отойдите от компьютера и знайте, когда Claude закончил. Использует [Apprise](https://github.com/caronc/apprise) для уведомлений — поддерживает 100+ сервисов, включая Discord, Telegram, Slack, Email, Pushover, Gotify и другие.

**Для включения:**

1. Добавьте одну или несколько переменных `NOTIFY_*` в раздел `environment` вашего compose:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Внутри контейнера: `touch ~/.claude/notify-on`

Смотрите [документацию по настройке](docs/configuration.md#notifications-apprise) для всех поддерживаемых переменных и форматов URL.

**Для отключения:** `rm ~/.claude/notify-on`

**События, вызывающие уведомления:**
| Событие | Что произошло |
|-------|--------------|
| `stop` | Claude завершил текущую задачу |
| `error` | Произошла ошибка при использовании инструмента |

> Полностью молчит, когда не настроено. Нет переменных `NOTIFY_*`? Нет файла-флага? Ноль сетевых вызовов. Ноль спама в логах. Ноль накладных расходов.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :arrows_counterclockwise: Обновление

```bash
# Загрузите последний образ
docker compose pull

# Пересоздайте контейнер с новым образом
docker compose up -d
```

Ваши данные сохраняются в `./data/claude` и `./workspace` — обновление заменяет только контейнер, не ваши файлы.

Не запускайте `cloudcli update` или `npm install -g @cloudcli-ai/cloudcli@latest` внутри контейнера. HolyClaude поставляет пропатченный runtime CloudCLI; обновляйтесь через `docker compose pull && docker compose up -d`.

Чтобы закрепить конкретную версию вместо `latest`:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :construction: Устранение неполадок

<details>
<summary><strong>CloudCLI показывает неправильную директорию по умолчанию</strong></summary>

CloudCLI открывается в `/home/claude` вместо `/workspace`.

**Причина:** Пользовательский или измененный служебный скрипт CloudCLI не задал `WORKSPACES_ROOT=/workspace` перед запуском CloudCLI.

**Исправление:** Уже обработано в HolyClaude. Скрипт запуска s6 устанавливает `WORKSPACES_ROOT=/workspace` непосредственно в окружение процесса.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Причина:** Базы данных SQLite на SMB/CIFS сетевых монтированиях. CIFS не поддерживает блокировку файлов на уровне, требуемом SQLite.

**Исправление:** Не храните базы данных SQLite на сетевых ресурсах. HolyClaude хранит `.cloudcli` в локальном хранилище контейнера именно по этой причине. Если у вас есть собственные базы данных SQLite в `/workspace` на NAS, перенесите их на локальный путь.
</details>

<details>
<summary><strong>Chromium падает / пустые страницы / сбои вкладок</strong></summary>

**Причина:** Недостаточная общая память. Docker по умолчанию даёт 64 МБ.

**Исправление:** Убедитесь, что `shm_size: 2g` в вашем compose-файле. При интенсивном использовании браузера (много вкладок, сложные страницы) увеличьте до `4g`.
</details>

<details>
<summary><strong>Файловые наблюдатели не обнаруживают изменения (горячая перезагрузка сломана)</strong></summary>

**Причина:** SMB/CIFS сетевые монтирования не поддерживают `inotify`.

**Исправление:** Включите опрос в окружении вашего compose:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Примечание: Опрос использует больше CPU, чем inotify. Включайте только на сетевых монтированиях.
</details>

<details>
<summary><strong>Ошибки "permission denied"</strong></summary>

**Причина:** UID/GID контейнера не совпадает с правами собственности файлов хоста.

**Исправление:**
```bash
# На вашей хост-машине
id -u  # → это ваш PUID
id -g  # → это ваш PGID
```
Установите их в вашем compose-файле:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker создаёт .claude.json как директорию</strong></summary>

**Причина:** Если целевой файл bind-монтирования не существует перед запуском контейнера, Docker заботливо создаёт его как директорию. Спасибо, Docker.

**Исправление:** Уже обработано — `entrypoint.sh` сначала восстанавливает сохранённый файл сессии или создаёт безопасный файл по умолчанию, если сохранённой сессии нет.
</details>

Смотрите [docs/troubleshooting.md](docs/troubleshooting.md) для полного руководства, включая все особенности SMB/CIFS и полную историю обнаруженных и исправленных нами ошибок.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :warning: Известные проблемы

Это не баги HolyClaude — это проблемы выше по цепочке или намеренные компромиссы.

| Проблема | Почему | Обходное решение |
|-------|-----|------------|
| Кнопка «Continue in Shell» сломана | Баг CloudCLI выше по цепочке (состояние гонки при инициализации терминала) | Используйте плагин **Web Terminal** (предустановлен) |
| Cursor CLI "Command timeout" | API-ключ не настроен — только косметически, ни на что не влияет | Установите `CURSOR_API_KEY` или игнорируйте |
| Аккаунт CloudCLI теряется при пересборке | SQLite не может сохраняться на сетевых монтированиях — намеренный компромисс | Создайте аккаунт заново (~10 секунд) |
| Веб push-уведомления «не поддерживаются» | Ограничение браузера в CloudCLI, стандартное поведение | Используйте уведомления Apprise (смотрите [Уведомления](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :hammer_and_wrench: Локальная сборка

Хотите собрать образ самостоятельно вместо загрузки из Docker Hub? Пожалуйста:

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

Затем используйте `image: holyclaude` вместо `image: coderluii/holyclaude:latest` в вашем compose-файле.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :bar_chart: Альтернативы

Как HolyClaude сравнивается с другими подходами?

| Подход | Веб-интерфейс | Мульти-AI | Предустановленные инструменты | Безголовый браузер | Настройка одной командой | Постоянство |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLI | 50+ инструментов | Chromium + Xvfb + Playwright | `docker compose up` | Bind-монтирования |
| Claude Code (голое железо) | Нет | Нет | Устанавливайте сами | Устанавливайте сами | Многошаговая установка | Вручную |
| Claude Code + oh-my-openagent | Нет | Да (мульти-модель) | Некоторые | Нет | npm install | Вручную |
| DIY Docker + Claude Code | Возможно | Возможно | Что добавите | Если настроите | Если напишете Dockerfile | Если настроите тома |
| Cursor IDE | Встроенный | Только Cursor | Встроено в IDE | Нет | Скачать приложение | Данные приложения |

HolyClaude не конкурирует с агентами кодирования — это **инфраструктурный слой**, который делает их всех лучше. Это контейнер, внутри которого вы их запускаете.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :rocket: Дорожная карта

Что будет дальше:

| Статус | Функция |
|--------|---------|
| 🔜 | **Нативные ARM-сборки** — оптимизированные нативные образы ARM64, а не эмулированные |
| 🔜 | **Интеграция VS Code tunnel** — встроенный VS Code Server или туннель для подключения из настольного VS Code |
| 🔜 | **Маршрутизация уведомлений** — разные адресаты уведомлений для разных типов событий (ошибки в Telegram, завершения в Discord) |

Есть идея? [Начните обсуждение](https://github.com/CoderLuii/HolyClaude/discussions) или [запросите функцию](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :trophy: Создано с HolyClaude

Используете HolyClaude для создания чего-то? Мы хотели бы это увидеть.

Откройте issue с меткой `showcase` или отправьте PR, чтобы добавить свой проект сюда:

<!-- Add your project: [Project Name](url) — one-line description -->

*Будьте первым, кто добавит свой проект сюда.*

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :handshake: Участие в разработке

Вклад приветствуется. Этот проект родился из реального ежедневного использования, и становится лучше, когда больше людей его используют и находят крайние случаи.

1. Форкните
2. Создайте ветку (`git checkout -b feature/something`)
3. Зафиксируйте изменения
4. Запушьте
5. Создайте PR

Баги, запросы функций, вопросы: [откройте issue](https://github.com/CoderLuii/HolyClaude/issues).

### Связаться

| Канал | Для чего |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Вопросы, покажите вашу настройку, идеи |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Отчёты об ошибках, запросы функций и пакетов |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Отчёты об уязвимостях (приватно) |

### Хотите добавить инструмент?

Используйте шаблон issue [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml). Укажите название пакета, метод установки и в каком варианте (full/slim) он должен быть.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :heart: Поддержка

HolyClaude бесплатен, с открытым исходным кодом и поддерживается одним разработчиком, который использует его каждый день.

Если он сэкономил вам время, вот как вы можете помочь:

- **Поставьте звезду репозиторию** — это самое большое, что вы можете сделать для видимости
- **Поделитесь** — расскажите другу, опубликуйте, твитните
- **Открывайте issues** — отчёты об ошибках и запросы функций делают HolyClaude лучше для всех
- **Вносите вклад** — PR всегда приветствуются

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :scroll: Стороннее ПО

Docker-образ HolyClaude включает стороннее программное обеспечение, каждое под своей лицензией. Основные компоненты:

| Компонент | Лицензия | Источник |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Смотрите [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) для полных деталей, включая уведомления об изменениях. Собственный исходный код HolyClaude лицензирован под MIT.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>

---

## :page_facing_up: Лицензия

MIT — смотрите [LICENSE](LICENSE). Используйте как хотите.

<p align="right">
  <a href="#top">↑ наверх</a>
</p>
