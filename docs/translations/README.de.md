🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | **Deutsch** | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Aufhoren zu konfigurieren. Anfangen zu bauen.

Ein Befehl. Vollständige KI-Entwicklungsumgebung. Claude Code, Web-UI, Headless-Browser, 8 KI-CLIs, 50+ Entwicklungstools — containerisiert und einsatzbereit.

**Du hättest 2 Stunden damit verbracht, das manuell einzurichten. Oder du führst einfach `docker compose up` aus.**

**Funktioniert mit deinem bestehenden Claude Code-Abonnement.** Max/Pro-Plan, API-Key — was auch immer du hast, es funktioniert einfach.

---

## Was ist das?

Du kennst das Schema. Du willst Claude Code. Aber du willst es auch im Browser. Mit einem Headless-Browser für Screenshots und Tests. Mit konfiguriertem Playwright. Mit jeder KI-CLI. Mit TypeScript, Python, Deployment-Tools, Datenbank-Clients, GitHub CLI.

Also fängst du an, Dinge zu installieren. Eines nach dem anderen. Dann startet Chromium nicht, weil Dockers Shared Memory 64 MB beträgt. Dann ist Xvfb nicht konfiguriert. Dann stimmt die UID im Container nicht mit deinem Host überein und alles gibt "permission denied". Dann merkst du, dass der Installer von Claude Code hängt, wenn WORKDIR root-owned ist. Dann sperrt SQLite auf deinem NAS-Mount. Dann—

**HolyClaude ist der Container, den ich gebaut habe, nachdem ich jedes einzelne dieser Probleme gelöst hatte.**

Ich habe diesen Container wochenlang täglich auf meinem eigenen Server betrieben. Jeder Bug wurde gefunden, diagnostiziert und behoben. Jeder Grenzfall wurde behandelt. Jedes "Warum funktioniert das nicht in Docker?" wurde beantwortet.

Du ziehst es. Du startest es. Du öffnest deinen Browser. Du baust.

### :credit_card: Nutze dein bestehendes Abonnement

**Hier läuft die echte Claude Code CLI.** Kein Wrapper. Kein Proxy. Kein Ersatzprodukt.

Dein bestehendes Anthropic-Konto funktioniert direkt:
- **Claude Max/Pro-Plan** — Authentifizierung über die Web-UI (OAuth), genauso wie beim Desktop-Claude Code
- **Anthropic API-Key** — über die Web-UI einrichten, gleiche Abrechnung wie immer
- **Keine Zusatzkosten** — HolyClaude ist kostenlos und Open Source. Du zahlst Anthropic nur für das, was du nutzt, wie bisher.

> HolyClaude greift nicht auf deine Zugangsdaten zu. Sie werden lokal in deinem Bind-Mount-Volume (`./data/claude/`) gespeichert, genauso wie auf einem Bare-Metal-System.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## Inhaltsverzeichnis

| | Abschnitt |
|---|---|
| :zap: | [Schnellstart](#zap-quick-start) |
| :computer: | [Plattform-Unterstützung](#computer-platform-support) |
| :star2: | [Warum HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Abonnement & Authentifizierung](#credit_card-subscription--authentication) |
| :package: | [Image-Varianten](#package-image-variants) |
| :whale: | [Docker Compose — Schnell](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Vollständig](#whale2-docker-compose--full) |
| :wrench: | [Umgebungsvariablen](#wrench-environment-variables) |
| :rocket: | [Was ist enthalten](#rocket-whats-inside) |
| :robot: | [KI-CLI-Anbieter](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Ollama verwenden](#llama-using-ollama) |
| :building_construction: | [Architektur](#building_construction-architecture) |
| :file_folder: | [Projektstruktur](#file_folder-project-structure) |
| :floppy_disk: | [Daten & Persistenz](#floppy_disk-data--persistence) |
| :lock: | [Berechtigungen](#lock-permissions) |
| :shield: | [Fernzugriff & Exposition](#shield-remote-access--exposure) |
| :bell: | [Benachrichtigungen](#bell-notifications) |
| :arrows_counterclockwise: | [Aktualisieren](#arrows_counterclockwise-upgrading) |
| :construction: | [Fehlerbehebung](#construction-troubleshooting) |
| :warning: | [Bekannte Probleme](#warning-known-issues) |
| :hammer_and_wrench: | [Lokal bauen](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Alternativen](#bar_chart-alternatives) |
| :rocket: | [Roadmap](#rocket-roadmap) |
| :trophy: | [Mit HolyClaude gebaut](#trophy-built-with-holyclaude) |
| :handshake: | [Beitragen](#handshake-contributing) |
| :heart: | [Unterstützung](#heart-support) |
| :scroll: | [Drittanbieter-Software](#scroll-third-party-software) |
| :page_facing_up: | [Lizenz](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :zap: Quick Start

**1.** Erstelle einen Ordner für HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Erstelle eine `docker-compose.yaml`-Datei. Kopiere eine der folgenden Vorlagen:
- [Schnell-Vorlage](#whale-docker-compose--quick) — minimal, keine Konfiguration, funktioniert einfach
- [Vollständige Vorlage](#whale2-docker-compose--full) — alle Optionen, vollständig dokumentiert

**3.** Herunterladen und starten:

```bash
docker compose up -d
```

**4.** Öffne die Web-UI:

```
http://localhost:3001
```

**5.** Erstelle ein CloudCLI-Konto (dauert 10 Sekunden), melde dich mit deinem Anthropic-Konto an und leg sofort los.

> Keine `.env`-Dateien. Keine Vorkonfiguration. Kein Lesen von 40 Seiten Dokumentation, bevor du anfangen kannst. Es läuft einfach.

> **Willst du von außerhalb deines Netzwerks darauf zugreifen?** Kein Port-Forwarding. Sieh [Fernzugriff & Exposition](#shield-remote-access--exposure) — nutze stattdessen Tailscale oder Cloudflare Tunnel.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :computer: Platform Support

| Plattform | Status | Hinweise |
|----------|--------|-------|
| Linux (amd64) | ✅ Vollständig unterstützt | Native Performance, empfohlen |
| Linux (arm64) | ✅ Vollständig unterstützt | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Vollständig unterstützt | Apple Silicon & Intel über Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Vollständig unterstützt | Benötigt WSL2-Backend |
| Synology / QNAP NAS | ✅ Vollständig unterstützt | `CHOKIDAR_USEPOLLING=true` für SMB-Mounts verwenden |
| Kubernetes | 🔜 Demnächst | Helm Chart geplant |

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :star2: Why HolyClaude

Ich habe das gebaut, weil ich es satt hatte, dasselbe Setup jedes Mal wiederholen zu müssen. Claude Code installieren, eine Web-UI verdrahten, Chromium in Docker konfigurieren, Berechtigungsprobleme beheben, Prozessüberwachung debuggen. Jedes Mal.

Also habe ich einen Container erstellt, der das alles erledigt. Und dann habe ich jeden möglichen Bug gefunden, damit du das nicht musst.

| | HolyClaude | Selbst einrichten |
|---|---|---|
| **Setup** | 30 Sekunden | 1-2 Stunden (wenn es gut läuft) |
| **Claude Code** | Vorinstalliert, vorkonfiguriert, einsatzbereit | Installieren, konfigurieren, hängengebliebenen Installer debuggen, WORKDIR reparieren |
| **Web-UI** | CloudCLI inklusive mit Plugins | Eine Web-UI finden, installieren, konfigurieren, mit Claude verdrahten |
| **Headless-Browser** | Chromium + Xvfb + Playwright, konfiguriert | Chromium installieren, Xvfb installieren, Display :99 konfigurieren, shm reparieren, Sandbox reparieren, seccomp reparieren... |
| **KI-CLIs** | 8 Anbieter, ein Container | Jeden einzeln über 3 Paketmanager installieren |
| **Entwicklungstools** | 50+ Tools, einsatzbereit | `apt-get install` / `npm i -g` / `pip install` für die nächste Stunde |
| **Prozessverwaltung** | s6-overlay (Auto-Neustart, sauberes Herunterfahren) | Eigene supervisord-Konfiguration schreiben oder hoffen, dass Docker restart funktioniert |
| **Persistenz** | Bind Mounts, Zugangsdaten überleben alles | Docker Volumes verstehen, debuggen "warum ist das ein Verzeichnis und keine Datei" |
| **Updates** | `docker pull && docker compose up -d` | 50 Tools manuell aktualisieren, beten, dass nichts bricht |
| **Multi-Arch** | AMD64 + ARM64 | Hoffen, dass dein Dockerfile auf ARM baut |

**Die letzte Zeile jedes manuellen Setups lautet "funktioniert auf meinem Rechner."** HolyClaude funktioniert auf jedem Rechner.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude führt die **offizielle Claude Code CLI** von Anthropic aus. Dein bestehendes Konto funktioniert sofort.

### Was funktioniert:

| Authentifizierungsmethode | Wie | Kosten |
|----------------------|-----|------|
| **Claude Max/Pro-Plan** (Abonnement) | Anmeldung über die CloudCLI Web-UI — gleicher OAuth-Ablauf wie auf dem Desktop | Dein bestehendes Abonnement, kein Aufpreis |
| **Anthropic API-Key** | API-Key in der Web-UI einfügen | Pay-per-use, gleiche Anthropic-Abrechnung |

### Was nicht funktioniert:

| | Warum |
|---|---|
| OpenAI API-Key für Claude | Verschiedene Unternehmen, verschiedene APIs. OpenAI-Keys funktionieren mit der **Codex CLI** (ebenfalls vorinstalliert) |

> **ChatGPT Plus/Pro-Abonnenten:** Dein Abonnement funktioniert mit der **Codex CLI**. Führe `codex login --device-auth` im Container aus, um dich mit deinem ChatGPT-Konto zu authentifizieren.

### Weitere enthaltene KI-CLIs:

| CLI | Was du brauchst |
|-----|--------------|
| Gemini CLI | Google AI API-Key (`GEMINI_API_KEY`) |
| OpenAI Codex | OpenAI API-Key (`OPENAI_API_KEY`) oder ChatGPT Plus/Pro-Abonnement (`codex login --device-auth`) |
| Cursor | Cursor API-Key (`CURSOR_API_KEY`) |
| TaskMaster AI | Verwendet deine KI-Anbieter-Keys (Anthropic, OpenAI, etc.) |
| Junie | JetBrains-Konto (JetBrains AI-Abonnement) |
| OpenCode | Konfiguration über `opencode` TUI (unterstützt OpenRouter und mehrere Anbieter) |
| Pi Coding Agent | Über `pi` konfigurieren (unterstützt mehrere Anbieter) |

> **HolyClaude ist kostenlos und Open Source.** Du zahlst deinen KI-Anbietern nur für die Nutzung, genau wie bisher. Wir proxieren, interceptieren oder berühren deine Zugangsdaten nicht. Sie liegen in deinem lokalen Bind-Mount.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :package: Image Variants

Zwei Varianten. Gleiche Qualität. Wähle deine Gewichtsklasse.

| Tag | Was du bekommst | Am besten für |
|-----|-------------|----------|
| **`latest`** | Alles vorinstalliert — jedes Tool, jede Bibliothek, jede CLI | Die meisten Nutzer. Keine Wartezeit. Claude muss nie anhalten, um etwas zu installieren. |
| **`slim`** | Nur Kern-Tools — Claude installiert Extras bei Bedarf | Kleineres VPS, begrenzter Speicherplatz, gebührenpflichtige Bandbreite |
| `X.Y.Z` | Vollständiges Image, festgelegte Version | Produktionsstabilität — du kontrollierst, wann du aktualisierst |
| `X.Y.Z-slim` | Slim-Image, festgelegte Version | Produktion + kleiner Speicherabdruck |

```bash
# Full — Batterien inklusive (empfohlen)
docker pull coderluii/holyclaude

# Slim — schlank und schnell
docker pull coderluii/holyclaude:slim
```

> **`latest` ist immer das vollständige Image.** Slim-Nutzer: Kein Problem — wenn du Claude bittest, etwas zu tun, das ein fehlendes Tool benötigt, installiert es dieses in Sekunden. Du bekommst dieselben Fähigkeiten, nur mit einem kleineren initialen Download.
>
> Docker Hub zeigt die komprimierte Übertragungsgröße: `latest` etwa 4,1 GB, `slim` etwa 2,4 GB. Docker, Synology Container Manager und NAS-Dateisysteme können nach dem Entpacken eine größere Größe anzeigen.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :whale: Docker Compose — Quick

Die "Ich will es einfach nur zum Laufen bringen"-Vorlage. Kopiere diesen gesamten Block in eine `docker-compose.yaml`-Datei:

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

Dann:

```bash
docker compose up -d
```

Öffne `http://localhost:3001`. Erstelle ein CloudCLI-Konto. Melde dich mit deinem Anthropic-Konto an. Baue etwas.

**Das ist das gesamte Setup. Du bist fertig.**

> **Warum diese Browser-Rechte?** Diese Version behält HolyClaudes aktuelles Browser-Profil bei. `SYS_ADMIN` und `seccomp=unconfined` erweitern Prozessrechte und verringern die Isolation; `SYS_PTRACE` dient dem Debugging. Lass dieses Profil für v1.5.0 unverändert und behandle Hardening als separaten Schritt.

> **Warum `shm_size: 2g`?** Docker gibt Containern standardmäßig 64 MB Shared Memory. HolyClaude behält 2 GB als beibehaltenen Standard für diese Version bei, weil Chromium `/dev/shm` stark für das Tab-Rendering nutzt. Bei 64 MB brechen Tabs; bei intensivem Browser-Einsatz auf 4 GB erhöhen.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :whale2: Docker Compose — Full

Gleiches Image, jeder Knopf freigelegt. Kopiere diesen gesamten Block in eine `docker-compose.yaml`-Datei:

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

Dann:

```bash
docker compose up -d
```

Wenn du den Host-seitigen Port oder Bind-Mount-Pfade ändern möchtest, ohne compose zu bearbeiten, kopiere `.env.example` nach `.env` und setze:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Diese Werte werden von Docker Compose auf dem Host gelesen. Sie sind keine Container-Umgebungsvariablen.

### Was jeder Abschnitt steuert:

| Abschnitt | Was er tut | Wann ändern |
|---------|-------------|-------------------|
| **Zeitzone** | Container-Uhr | Immer — auf deine lokale Zeitzone setzen |
| **Performance** | Node.js-Speicherdeckel | Nur wenn du OOM-Fehler bei großen Projekten bekommst |
| **Benutzer-Mapping** | Dateiberechtigungen zwischen Container und Host | Wenn du "permission denied" bekommst (`id -u` und `id -g` auf deinem Host) |
| **SMB/CIFS** | Dateibeobachter-Polling-Modus | Nur wenn deine Volumes auf einem NAS oder Netzwerk-Share liegen |
| **Benachrichtigungen** | Push-Benachrichtigungen über Apprise (Discord, Telegram, Slack, E-Mail, 100+ Dienste) | Wenn du weggehst und wissen möchtest, wenn Claude fertig ist |
| **KI-Anbieter** | API-Keys für Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Wenn du andere KI-CLIs als Claude verwenden möchtest |

> **Jede einzelne Umgebungsvariable ist optional.** Der Container läuft problemlos mit nur `TZ=UTC`. Alles andere hat sinnvolle Standardwerte oder wird über die Web-UI gehandhabt.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :wrench: Environment Variables

Die vollständige Referenz. Jede Variable, ihr Standard, was sie tut.

| Variable | Standard | Was sie tut |
|----------|---------|--------------|
| `TZ` | `UTC` | Container-Zeitzone |
| `PUID` | `1000` | Container-Benutzer-ID fuer Docker-Remapping; rootless Podman nutzt `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | Container-Gruppen-ID fuer Docker-Remapping; rootless Podman nutzt `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js-Heap-Speichergrenze in MB |
| `GIT_USER_NAME` | `HolyClaude User` | Git-Commit-Autor (einmalig beim ersten Start gesetzt) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git-Commit-E-Mail (einmalig beim ersten Start gesetzt) |
| `CHOKIDAR_USEPOLLING` | *(nicht gesetzt)* | Auf `1` setzen für SMB/CIFS — aktiviert Polling-Dateibeobachter |
| `WATCHFILES_FORCE_POLLING` | *(nicht gesetzt)* | Auf `true` setzen für SMB/CIFS — aktiviert Python-Polling |
| `NOTIFY_DISCORD` | *(nicht gesetzt)* | Discord-Webhook-URL für Benachrichtigungen |
| `NOTIFY_TELEGRAM` | *(nicht gesetzt)* | Telegram-Bot-URL für Benachrichtigungen |
| `NOTIFY_PUSHOVER` | *(nicht gesetzt)* | Pushover-URL für Benachrichtigungen |
| `NOTIFY_SLACK` | *(nicht gesetzt)* | Slack-Webhook-URL für Benachrichtigungen |
| `NOTIFY_EMAIL` | *(nicht gesetzt)* | E-Mail (SMTP)-URL für Benachrichtigungen |
| `NOTIFY_GOTIFY` | *(nicht gesetzt)* | Gotify-URL für Benachrichtigungen |
| `NOTIFY_URLS` | *(nicht gesetzt)* | Sammelfeld — kommagetrennte [Apprise-URLs](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(nicht gesetzt)* | Anthropic API-Key (Alternative zur Web-UI OAuth) |
| `ANTHROPIC_AUTH_TOKEN` | *(nicht gesetzt)* | Anthropic Auth-Token (Alternative zum API-Key) |
| `ANTHROPIC_BASE_URL` | *(nicht gesetzt)* | Benutzerdefinierter Anthropic API-Endpunkt (Proxies, private Deployments) |
| `CLAUDE_CODE_USE_BEDROCK` | *(nicht gesetzt)* | Auf `1` setzen, um Amazon Bedrock-Backend zu verwenden |
| `CLAUDE_CODE_USE_VERTEX` | *(nicht gesetzt)* | Auf `1` setzen, um Google Vertex AI-Backend zu verwenden |
| `GEMINI_API_KEY` | *(nicht gesetzt)* | Google Gemini API-Key |
| `OPENAI_API_KEY` | *(nicht gesetzt)* | OpenAI API-Key (für Codex CLI, oder `codex login --device-auth` für ChatGPT-Abonnement verwenden) |
| `CURSOR_API_KEY` | *(nicht gesetzt)* | Cursor API-Key |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Optionale globale Desloppify-Skill-Einrichtung. Gueltig: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` oder kommagetrennte Auswahl |
| `OLLAMA_HOST` | *(nicht gesetzt)* | Ollama-Endpunkt-URL (z.B. `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :rocket: What's Inside

Das ist kein minimaler Container. Das ist eine komplette Entwicklungsumgebung.

### Beide Varianten (full + slim)

<details>
<summary><strong>Node.js 26 + npm globale Pakete</strong></summary>

| Paket | Wofür |
|---------|---------------|
| `typescript`, `tsx` | TypeScript-Kompilierung und -Ausführung |
| `pnpm` | Schneller, speichereffizienter Paketmanager |
| `vite`, `esbuild` | Blitzschnelle Build-Tools |
| `eslint`, `prettier` | Code-Qualität und Formatierung |
| `serve`, `nodemon` | Statischer Dateiserver, Auto-Neustart-Entwicklungsserver |
| `concurrently` | Mehrere Skripte parallel ausführen |
| `dotenv-cli` | Umgebungsvariablen aus `.env`-Dateien laden |

</details>

<details>
<summary><strong>Python 3-Pakete</strong></summary>

| Paket | Wofür |
|---------|---------------|
| `requests`, `httpx` | HTTP-Clients |
| `beautifulsoup4`, `lxml` | Web-Scraping und HTML-Parsing |
| `Pillow` | Bildverarbeitung (vorkompiliert — keine Wartezeit) |
| `pandas`, `numpy` | Datenmanipulation (vorkompiliert — du willst diese wirklich nicht zur Laufzeit per pip installieren) |
| `openpyxl` | Excel-Dateien lesen/schreiben |
| `python-docx` | Word-Dokumente lesen/schreiben |
| `jinja2`, `markdown` | Templating und Markdown-Rendering |
| `pyyaml`, `python-dotenv` | Konfigurationsdatei-Parsing |
| `rich`, `click`, `tqdm` | Schöne CLIs und Fortschrittsbalken |
| `desloppify`, `bandit`, `tree-sitter` | Code-Qualitaetsscans, Python-Sicherheitschecks, parsergestuetzte Codeanalyse |
| `playwright` | Browser-Automatisierung (Chromium bereits konfiguriert und einsatzbereit) |

</details>

<details>
<summary><strong>System-Tools</strong></summary>

| Tool | Wofür |
|------|---------------|
| `git`, `gh` | Versionskontrolle + GitHub CLI (PRs, Issues, Releases aus dem Terminal) |
| `ripgrep` (`rg`), `fd`, `fzf` | Blitzschnelle Suche — Claude verwendet diese ständig |
| `bat`, `tree`, `jq` | Besseres cat (Syntaxhervorhebung), Verzeichnisbäume, JSON-Verarbeitung |
| `curl`, `wget` | HTTP-Downloads |
| `tmux` | Terminal-Multiplexer — Dinge im Hintergrund ausführen |
| `htop`, `lsof`, `strace` | Prozessüberwachung und Debugging |
| `imagemagick` | Bildkonvertierung (`convert`, `identify`, `mogrify`) |
| `chromium` | Headless-Browser — Screenshots, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Direkt mit Datenbanken kommunizieren |
| `openssh-client`, `openssh-server`, `mosh` | SSH heraus und optionaler SSH/Mosh-Zugriff in den Container |

</details>

<details>
<summary><strong>KI-CLIs — jeder große Anbieter</strong></summary>

| CLI | Befehl | Wofür |
|-----|---------|---------------|
| **Claude Code** | `claude` | Das Hauptereignis — du läufst darin |
| **Gemini CLI** | `gemini` | Googles KI-Coding-Agent |
| **OpenAI Codex** | `codex` | OpenAIs Coding-Agent |
| **Cursor** | `cursor` | Cursors KI-Agent |
| **TaskMaster AI** | `task-master` | Aufgabenplanung und Orchestrierung |
| **Junie** | `junie` | JetBrains' KI-Coding-Agent |
| **OpenCode** | `opencode` | Open-Source-KI-Agent (OpenRouter und mehrere Anbieter) |
| **Pi Coding Agent** | `pi` | Minimaler Agent-Harness (mehrere Anbieter) |

Acht KI-CLIs. Ein Container. Wechsle sofort zwischen ihnen. Kein anderes Docker-Image macht das.

</details>

### Nur Full-Image (zusätzliche Pakete)

Das Full-Image enthält alles oben Genannte, plus:

<details>
<summary><strong>Zusätzliche npm-Pakete — Deployment, ORMs, Performance</strong></summary>

| Paket | Wofür |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers-Deployment |
| `vercel` | Vercel-Deployment |
| `netlify-cli` | Netlify-Deployment |
| `az` | Azure CLI für Cloud-Deployment und -Management |
| `prisma`, `drizzle-kit` | Die zwei beliebtesten Node.js-ORMs |
| `pm2` | Produktions-Prozessmanager |
| `eas-cli` | Expo / React Native-Builds |
| `lighthouse`, `@lhci/cli` | Performance-Auditing (Chromium ist bereits vorhanden) |
| `sharp-cli` | Bildverarbeitungs-CLI |
| `json-server`, `http-server` | Mock-REST-APIs, statische Dateibereitstellung |
| `@marp-team/marp-cli` | Markdown zu Präsentationsfolien |

</details>

<details>
<summary><strong>Zusätzliche Python-Pakete — PDFs, Datenvisualisierung, Web-Frameworks</strong></summary>

| Paket | Wofür |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Jede wichtige PDF-Bibliothek. Erstellen, lesen, konvertieren, zusammenführen. |
| `xlsxwriter`, `xlrd` | Excel-Formate jenseits von openpyxl |
| `matplotlib`, `seaborn` | Datenvisualisierung und Diagramme |
| `python-pptx` | PowerPoint-Generierung |
| `fastapi`, `uvicorn` | Python-Web-Framework |

</details>

<details>
<summary><strong>Zusätzliche System-Pakete — Medien, Dokumente</strong></summary>

| Paket | Wofür |
|---------|---------------|
| `pandoc` | Zwischen beliebigen Dokumentformaten konvertieren (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Video- und Audioverarbeitung (extrahieren, konvertieren, transcodieren) |
| `libvips-dev` | Hochleistungs-Bildverarbeitungsbibliothek |

</details>

> **Slim-Nutzer:** Fehlt ein Paket? Frag Claude. Es installiert npm/pip-Pakete in Sekunden. System-Pakete (pandoc, ffmpeg) dauern 1-2 Minuten. Du bekommst dieselben Fähigkeiten — das Full-Image hat einfach null Wartezeit.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :robot: AI CLI Providers

Acht KI-CLIs. Ein Container. Kein anderes Docker-Image bietet dir das.

| Anbieter | Befehl | Authentifizierung | Abonnement möglich? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI Web-UI (OAuth) | **Ja** — Max/Pro-Plan oder API-Key |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY`-Umgebungsvariable | API-Key (Pay-per-use) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` oder `codex login --device-auth` | **Ja** — ChatGPT Plus/Pro/Team/Enterprise oder API-Key |
| **Cursor** | `cursor` | `CURSOR_API_KEY`-Umgebungsvariable | API-Key |
| **TaskMaster AI** | `task-master` | Verwendet vorhandene KI-Anbieter-Keys | Funktioniert mit konfigurierten Keys |
| **Junie** | `junie` | JetBrains AI-Abonnement | JetBrains-Konto erforderlich |
| **OpenCode** | `opencode` | Konfiguration über TUI | Unterstützt OpenRouter und mehrere Anbieter; nur Full-Image |
| **Pi Coding Agent** | `pi` | Über Pi konfigurieren | Unterstützt mehrere Anbieter |

> Claude Code ist die primäre CLI. Die anderen sind da, weil man manchmal eine zweite Meinung möchte, oder die Stärken eines bestimmten Modells, oder man Ausgaben vergleicht. Alle mit einem `Tab`-Druck zur Verfügung zu haben ist der ganze Punkt.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :mag: Desloppify

Desloppify ist in beiden Images als `desloppify` enthalten. Standardmaessig bleibt es passiv: HolyClaude startet keine Scans, erstellt kein `.desloppify/`, bearbeitet keine `.gitignore` und aendert keine gemounteten Workspaces, solange du Desloppify nicht selbst ausfuehrst.

```bash
desloppify scan --path .
desloppify next
```

Nach einem Scan fuege `.desloppify/` zur `.gitignore` dieses Projekts hinzu.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` schaltet nur die automatische globale Skill-Einrichtung aus; die CLI bleibt installiert. `all` bedeutet `claude,codex,gemini`. `opencode` ist nur im Full-Image verfuegbar und wird nicht in `all` aufgenommen. Kombiniere `claude` und `opencode` nicht automatisch, weil OpenCode Claude-kompatible Skills aus `~/.claude/skills` erkennen kann.

Manuelle Upstream-Ziele: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :llama: Using Ollama

HolyClaude funktioniert mit [Ollama](https://ollama.com) als Alternative zu einem Anthropic-Abonnement. Setze zwei Umgebungsvariablen und verwende lokale oder Cloud-Modelle.

Siehe die vollständige Einrichtungsanleitung: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ nach oben</a>
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

### Wie die Teile zusammenpassen

1. **Container startet** — `entrypoint.sh` läuft als root. Ordnet UID/GID deinem Host-Benutzer zu, stellt die gespeicherte Claude Code Session wieder her, bevor Bootstrap sie berührt, und prüft ob dies ein erster Start ist.

2. **Nur beim ersten Start** — `bootstrap.sh` läuft einmalig. Kopiert Standardeinstellungen, Memory-Template, konfiguriert Git-Identität. Erstellt eine Sentinel-Datei (`.holyclaude-bootstrapped`), sodass es nie wieder läuft. Deine Anpassungen sind ab diesem Punkt sicher.

3. **s6-overlay übernimmt als PID 1** — Das ist nicht supervisord. Es ist [s6-overlay](https://github.com/just-containers/s6-overlay), speziell für Docker gebaut. Überwacht CloudCLI, Xvfb und Claude Session Sync. Startet bei Absturz automatisch neu. Leitet Signale weiter. Bereinigt Zombie-Prozesse. Fährt sauber herunter.

4. **CloudCLI stellt die Web-UI bereit** — Port 3001. Browser-basierte Schnittstelle zu Claude Code mit Projektverwaltung, mehreren Sessions und Plugins (Projektstatistiken + Web-Terminal inklusive).

5. **Xvfb stellt ein Kompatibilitätsdisplay bereit** — Xvfb bleibt unter `:99` für Tools verfügbar, die ein sichtbares Display verwenden. Modernes Headless-Chromium, Playwright und Lighthouse benötigen Xvfb nicht grundsätzlich.

Siehe [docs/architecture.md](docs/architecture.md) für den vollständigen technischen Tiefen-Einblick — einschließlich warum wir s6 statt supervisord gewählt haben, warum Plugins ins Image eingebaut sind und warum `runuser` statt `su`.

<p align="right">
  <a href="#top">↑ nach oben</a>
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
  <a href="#top">↑ nach oben</a>
</p>

---

## :floppy_disk: Data & Persistence

| Was | Wo (Container) | Wo (Host) | Überlebt Rebuild? |
|------|-------------------|-------------|-------------------|
| Einstellungen, Zugangsdaten, API-Keys | `/home/claude/.claude` | `./data/claude` | **Ja** |
| Claude Code Session (OAuth, Onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Ja** |
| Dein Code und deine Projekte | `/workspace` | `./workspace` | **Ja** |
| CloudCLI-Konto | `/home/claude/.cloudcli` | *(standardmäßig nur Container — siehe unten)* | Nein (Opt-in verfügbar) |

HolyClaude stellt die gespeicherte Claude Code Session wieder her, bevor der Start eine frische Standarddatei erstellen kann. So ersetzen Rebuilds und Recreates keine echte OAuth/API-Session durch Onboarding-Status.

### Was `docker compose down && docker compose up` überlebt:
- Deine Anthropic-Authentifizierung und API-Keys
- Claude Code-Einstellungen, Memory (`CLAUDE.md`) und OAuth-Session (kein erneutes Login)
- Dein gesamter Code in `./workspace`
- Git-Konfiguration
- Codex-, Gemini- und Cursor-CLI-Auth (seit v1.1.7)

### Was du wiederholen musst (10 Sekunden):
- CloudCLI-Web-Konto — schnelle Anmeldung, das war's (außer du aktivierst die Persistenz unten)

### Ersten-Start-Setup erneut auslösen:
```bash
# Delete the sentinel file — NOT the whole folder
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Lösche niemals `./data/claude/` vollständig.** Dort leben deine Zugangsdaten. Lösche die Sentinel-Datei, wenn du einen frischen Bootstrap willst. Lösche bestimmte Konfigurationsdateien, wenn du Einstellungen zurücksetzen möchtest. Aber vernichte niemals den gesamten Ordner.

### CloudCLI-Konto persistieren (optional, nur lokaler Speicher)

Standardmäßig ist die CloudCLI-Kontodatenbank (`~/.cloudcli`) container-lokal und wird beim Rebuild gelöscht. Das Konto neu zu erstellen dauert 10 Sekunden, also lassen die meisten Leute es so.

Wenn du willst, dass es Rebuilds überlebt, füge ein **named Docker volume** zu deiner compose-Datei hinzu:

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

> **Mache KEIN Bind-Mount von `./data/cloudcli` auf einem Netzwerk-Share (NAS, SMB/CIFS, NFS).** CloudCLI speichert sein Konto in SQLite, und SQLites File-Locking funktioniert auf Netzwerk-Mounts nicht. Du wirst ständig `database is locked`-Fehler bekommen. Named Volumes leben auf dem lokalen Dateisystem des Docker-Engines, deshalb funktioniert das — Bind-Mounts auf ein NAS werden nicht funktionieren.

Ein Bind-Mount zu einem lokalen SSD-Pfad ist auch in Ordnung, halte ihn nur von jedem Netzwerk-Share fern.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :lock: Permissions

Claude Code läuft standardmäßig im **`acceptEdits`**-Modus. Das ist die im Image gelieferte Einstellung:

| Aktion | Erlaubt? |
|--------|----------|
| Dateien lesen | Ja |
| Dateien bearbeiten / erstellen | Ja |
| Shell-Befehle ausführen | **Fragt zuerst** |
| Pakete installieren | **Fragt zuerst** |

### Vollständige Umgehung? (Power-User)

So betreibe ich es persönlich. Bearbeite `./data/claude/settings.json` auf deinem Host:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Bypass-Modus bedeutet, dass Claude Befehle ohne Bestätigung ausführt.** Er ist leistungsstark, kann aber auch schnell destruktive Befehle ausführen. Behalte den gelieferten Standard `acceptEdits`, außer du vertraust dem Workspace und jedem Prompt.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :shield: Fernzugriff & Exposition

HolyClaude bindet CloudCLI an Port `3001`. Standardmäßig ist das nur lokal — gut für den Betrieb auf deinem Laptop oder einem Heimserver, auf den du per SSH zugreifst.

**In dem Moment, in dem du von außerhalb deines Netzwerks darauf zugreifen willst, lies diesen Abschnitt.**

### Kein Port-Forwarding ins öffentliche Internet

Ich sage es direkt: Schlag kein Loch in deinen Router und exponiere `3001` nicht ins offene Internet. Nicht mal mit einem Passwort. Warum:

- CloudCLI exponiert eine vollständige Shell über das Web-Terminal-Plugin
- Es kann beliebigen Code ausführen, Pakete installieren und dein gesamtes `/workspace` lesen/schreiben
- Es hält deine Anthropic-OAuth-Tokens und API-Keys
- Basic-Auth-Passwörter werden gebrute-forced, credential-gestuffed und aus Logs extrahiert
- Ein geleaktes Passwort = jemand anderes hat eine bezahlte Claude-Code-Instanz auf deiner Maschine mit deinem Geld

Ein Passwort ist eine Bodenschwelle, keine Tür. Behandle HolyClaude wie eine SSH-Session: niemals im offenen Internet ohne einen ordentlichen Tunnel davor.

### Nutze stattdessen einen ordentlichen Tunnel

Das sind die zwei Optionen, die ich wirklich empfehle:

| Option | Für wen | Warum |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Persönliche Nutzung, kleine Teams | WireGuard-Mesh-VPN. Installiere Tailscale auf deinem Server + Laptop/Telefon, und du erreichst `http://holyclaude:3001` von überall, als wärst du im LAN. Keine offenen Ports, kein DNS, keine Zertifikate. Kostenlos für persönliche Nutzung. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Teilen mit anderen, öffentlicher Hostname | Cloudflare proxied die Verbindung, sodass Port `3001` geschlossen bleibt. Du bekommst eine echte Domain mit HTTPS, und kannst Cloudflare Access (Google/GitHub SSO) davor schalten. Das kostenlose Tier deckt die meiste persönliche Nutzung ab. |

Beide geben dir:
- Null offene Ports an deinem Router
- Verschlüsselter Transport von Ende zu Ende
- Echte identitätsbasierte Auth (kein geteiltes Passwort)
- Audit-Logs

### Wenn du darauf bestehst, es direkt zu exponieren (bitte nicht)

Wenn du den Tunnel absolut überspringen musst (Self-Hosting-Tutorial, isoliertes Lab-Netzwerk, was auch immer), mindestens:

1. **Stelle einen Reverse Proxy davor** (Caddy, nginx, Traefik) mit echtem TLS
2. **Füge IP-Allowlisting** auf Firewall- oder Proxy-Ebene hinzu — nur deine bekannten IPs
3. **Behalte den gelieferten Standard `acceptEdits`**, außer du hast einen klaren Grund für `bypassPermissions`
4. **Rotiere deine Anthropic-Zugangsdaten**, wenn etwas seltsam aussieht
5. **Betreibe hinter Cloudflare Access oder ähnlichem SSO**, nicht Basic Auth

Selbst mit all dem ist die Angriffsfläche riesig. Nutze Tailscale oder Cloudflare Tunnel. Sie sind kostenlos, brauchen fünf Minuten zum Einrichten, und das ist, was ich persönlich nutze.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :bell: Notifications

Geh von deinem Computer weg und erfahre, wenn Claude fertig ist. Verwendet [Apprise](https://github.com/caronc/apprise) für Benachrichtigungen — unterstützt 100+ Dienste einschließlich Discord, Telegram, Slack, E-Mail, Pushover, Gotify und mehr.

**Zum Aktivieren:**

1. Füge eine oder mehrere `NOTIFY_*`-Variablen zur compose `environment` hinzu:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Im Container: `touch ~/.claude/notify-on`

Siehe [Konfigurationsdokumentation](docs/configuration.md#notifications-apprise) für alle unterstützten Variablen und URL-Formate.

**Zum Deaktivieren:** `rm ~/.claude/notify-on`

**Ereignisse, die Benachrichtigungen auslösen:**
| Ereignis | Was passiert ist |
|-------|--------------|
| `stop` | Claude hat die aktuelle Aufgabe abgeschlossen |
| `error` | Ein Tool-Use-Fehler ist aufgetreten |

> Vollständig still, wenn nicht konfiguriert. Keine `NOTIFY_*`-Variablen gesetzt? Keine Flag-Datei? Null Netzwerkanfragen. Null Log-Spam. Null Overhead.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d
```

Deine Daten bleiben in `./data/claude` und `./workspace` erhalten — beim Upgrade wird nur der Container ersetzt, nicht deine Dateien.

Führe `cloudcli update` oder `npm install -g @cloudcli-ai/cloudcli@latest` nicht im Container aus. HolyClaude enthält eine gepatchte CloudCLI-Laufzeit; aktualisiere mit `docker compose pull && docker compose up -d`.

Um eine bestimmte Version statt `latest` zu fixieren:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI zeigt falsches Standardverzeichnis</strong></summary>

CloudCLI öffnet `/home/claude` statt `/workspace`.

**Ursache:** Ein angepasstes oder geändertes CloudCLI-Service-Skript hat `WORKSPACES_ROOT=/workspace` nicht gesetzt, bevor CloudCLI gestartet wurde.

**Lösung:** Bereits in HolyClaude behandelt. Das s6-Run-Skript setzt `WORKSPACES_ROOT=/workspace` direkt in der Prozessumgebung.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Ursache:** SQLite-Datenbanken auf SMB/CIFS-Netzwerk-Mounts. CIFS unterstützt das Datei-Level-Locking nicht, das SQLite benötigt.

**Lösung:** SQLite-Datenbanken nicht auf Netzwerk-Shares speichern. HolyClaude hält `.cloudcli` aus genau diesem Grund im container-lokalen Speicher. Wenn du eigene SQLite-Datenbanken in `/workspace` auf einem NAS hast, verschiebe sie auf einen lokalen Pfad.
</details>

<details>
<summary><strong>Chromium stürzt ab / leere Seiten / Tab-Fehler</strong></summary>

**Ursache:** Unzureichender Shared Memory. Docker-Standard ist 64 MB.

**Lösung:** Stelle sicher, dass `shm_size: 2g` in deiner compose-Datei steht. Für intensive Browser-Nutzung (viele Tabs, komplexe Seiten) erhöhe auf `4g`.
</details>

<details>
<summary><strong>Dateibeobachter erkennen keine Änderungen (Hot-Reload defekt)</strong></summary>

**Ursache:** SMB/CIFS-Netzwerk-Mounts unterstützen `inotify` nicht.

**Lösung:** Aktiviere Polling in deiner compose-Umgebung:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Hinweis: Polling verwendet mehr CPU als inotify. Nur bei Netzwerk-Mounts aktivieren.
</details>

<details>
<summary><strong>Permission-denied-Fehler</strong></summary>

**Ursache:** Container-UID/GID stimmt nicht mit Host-Dateibesitz überein.

**Lösung:**
```bash
# On your host machine
id -u  # → this is your PUID
id -g  # → this is your PGID
```
In deiner compose-Datei setzen:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker erstellt .claude.json als Verzeichnis</strong></summary>

**Ursache:** Wenn eine Bind-Mount-Zieldatei vor dem Container-Start nicht existiert, erstellt Docker sie hilfreicherweise als Verzeichnis. Danke, Docker.

**Lösung:** Bereits behandelt — `entrypoint.sh` stellt zuerst die gespeicherte Session-Datei wieder her oder erstellt eine sichere Standarddatei, wenn keine gespeicherte Session existiert.
</details>

Siehe [docs/troubleshooting.md](docs/troubleshooting.md) für die vollständige Anleitung einschließlich aller SMB/CIFS-Eigenheiten und der vollständigen Geschichte der gefundenen und behobenen Bugs.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :warning: Known Issues

Das sind keine HolyClaude-Bugs — es sind Upstream-Probleme oder bewusste Kompromisse.

| Problem | Warum | Workaround |
|-------|-----|------------|
| "Continue in Shell"-Schaltfläche defekt | CloudCLI-Upstream-Bug (Race Condition bei Terminal-Init) | Stattdessen das **Web Terminal**-Plugin verwenden (vorinstalliert) |
| Cursor CLI "Command timeout" | Kein API-Key konfiguriert — nur kosmetisch, beeinträchtigt nichts | `CURSOR_API_KEY` setzen oder ignorieren |
| CloudCLI-Konto bei Rebuild verloren | SQLite kann auf Netzwerk-Mounts nicht persistieren — bewusster Kompromiss | Konto neu erstellen (~10 Sekunden) |
| Web-Push-Benachrichtigungen "not supported" | Browser-Einschränkung in CloudCLI, Standardverhalten | Stattdessen Apprise-Benachrichtigungen verwenden (siehe [Benachrichtigungen](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :hammer_and_wrench: Building Locally

Möchtest du das Image selbst bauen statt von Docker Hub zu ziehen? Los geht's:

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

Verwende dann `image: holyclaude` statt `image: coderluii/holyclaude:latest` in deiner compose-Datei.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :bar_chart: Alternatives

Wie schneidet HolyClaude im Vergleich zu anderen Ansätzen ab?

| Ansatz | Web-UI | Multi-KI | Vorkonfigurierte Tools | Headless-Browser | Ein-Befehl-Setup | Persistenz |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | 50+ Tools | Chromium + Xvfb + Playwright | `docker compose up` | Bind Mounts |
| Claude Code (Bare Metal) | Nein | Nein | Selbst installieren | Selbst installieren | Mehrstufige Installation | Manuell |
| Claude Code + oh-my-openagent | Nein | Ja (Multi-Modell) | Einige | Nein | npm install | Manuell |
| DIY Docker + Claude Code | Vielleicht | Vielleicht | Was auch immer du hinzufügst | Wenn du es konfigurierst | Wenn du das Dockerfile schreibst | Wenn du Volumes einrichtest |
| Cursor IDE | Eingebaut | Nur Cursor | IDE-gebündelt | Nein | App herunterladen | App-Daten |

HolyClaude konkurriert nicht mit Coding-Agenten — es ist die **Infrastrukturschicht**, die sie alle besser funktionieren lässt. Es ist der Container, in dem du sie ausführst.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :rocket: Roadmap

Was als nächstes kommt:

| Status | Feature |
|--------|---------|
| 🔜 | **ARM-native Builds** — optimierte native ARM64-Images, nicht nur emuliert |
| 🔜 | **VS Code-Tunnel-Integration** — eingebauter VS Code Server oder Tunnel für die Verbindung vom VS Code Desktop |
| 🔜 | **Benachrichtigungs-Routing** — verschiedene Benachrichtigungsziele pro Ereignistyp (Fehler zu Telegram, Abschlüsse zu Discord) |

Hast du eine Idee? [Starte eine Diskussion](https://github.com/CoderLuii/HolyClaude/discussions) oder [fordere ein Feature an](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :trophy: Built with HolyClaude

Baust du etwas mit HolyClaude? Wir würden es gerne sehen.

Öffne ein Issue mit dem `showcase`-Label oder reiche einen PR ein, um dein Projekt hier hinzuzufügen:

<!-- Add your project: [Project Name](url) — one-line description -->

*Sei der Erste, der sein Projekt hier hinzufügt.*

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :handshake: Contributing

Beiträge willkommen. Dieses Projekt entstand aus echter täglicher Nutzung und wird besser, wenn mehr Menschen es nutzen und Grenzfälle finden.

1. Fork it
2. Branch it (`git checkout -b feature/something`)
3. Commit it
4. Push it
5. PR it

Bugs, Feature-Anfragen, Fragen: [Issue öffnen](https://github.com/CoderLuii/HolyClaude/issues).

### Kontakt aufnehmen

| Kanal | Verwenden für |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Fragen, Setup zeigen, Ideen |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Bug-Berichte, Feature- & Paketanfragen |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Sicherheitslücken-Berichte (privat) |

### Möchtest du ein Tool hinzugefügt haben?

Verwende die [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml)-Issue-Vorlage. Gib den Paketnamen, die Installationsmethode und die Zielvariante (full/slim) an.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :heart: Support

HolyClaude ist kostenlos, Open Source und wird von einem Entwickler gepflegt, der es täglich nutzt.

Wenn es dir Zeit gespart hat, so kannst du helfen:

- **Dieses Repo mit einem Stern versehen** — das ist der einzige größte Beitrag zur Sichtbarkeit
- **Teilen** — einem Freund erzählen, posten, tweeten
- **Issues öffnen** — Bug-Berichte und Feature-Anfragen machen HolyClaude für alle besser
- **Beitragen** — PRs sind immer willkommen

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :scroll: Third-Party Software

Das HolyClaude Docker-Image enthält Drittanbieter-Software, jeweils unter ihrer eigenen Lizenz. Wesentliche Komponenten:

| Komponente | Lizenz | Quelle |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Siehe [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) für vollständige Details einschließlich Änderungshinweisen. HolyClaudes eigener Quellcode ist MIT-lizenziert.

<p align="right">
  <a href="#top">↑ nach oben</a>
</p>

---

## :page_facing_up: License

MIT — siehe [LICENSE](LICENSE). Verwende es, wie du möchtest.

<p align="right">
  <a href="#top">↑ nach oben</a>
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

Gebaut von [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Dieser Container ist das, was ich täglich nutze. Wenn er dir auch nur die Hälfte der Setup-Zeit spart, die er mir gespart hat, wäre ein Stern schön.

</div>
