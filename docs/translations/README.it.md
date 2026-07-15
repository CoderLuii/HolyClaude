🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | **Italiano** | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Smetti di configurare. Inizia a costruire.

Un comando. Una workstation di sviluppo AI completa. Claude Code, interfaccia web, browser headless, 8 CLI AI, 50+ strumenti di sviluppo — containerizzati e pronti all'uso.

**Avresti passato 2 ore a configurare tutto manualmente. Oppure puoi semplicemente fare `docker compose up`.**

**Funziona con il tuo abbonamento Claude Code esistente.** Piano Max/Pro, chiave API — qualunque cosa tu abbia, funziona e basta.

---

## Cos'è questo?

Lo sai com'è. Vuoi Claude Code. Ma lo vuoi anche nel browser. Con un browser headless per screenshot e test. Con Playwright configurato. Con tutte le CLI AI. Con TypeScript, Python, strumenti di deployment, client per database, GitHub CLI.

Allora cominci a installare le cose. Una per una. Poi Chromium non si avvia perché la memoria condivisa di Docker è 64MB. Poi Xvfb non è configurato. Poi l'UID all'interno del container non corrisponde al tuo host e tutto restituisce "permission denied". Poi ti accorgi che l'installer di Claude Code si blocca quando WORKDIR è di proprietà di root. Poi SQLite si blocca sul mount NAS. E poi—

**HolyClaude è il container che ho costruito dopo aver risolto ognuno di questi problemi.**

Lo uso ogni giorno sul mio server da settimane. Ogni bug è stato individuato, diagnosticato e corretto. Ogni caso limite è stato gestito. Ogni "perché non funziona in Docker" ha trovato risposta.

Lo scarichi. Lo avvii. Apri il browser. Costruisci.

### :credit_card: Usa il tuo abbonamento esistente

**Questo esegue la vera Claude Code CLI.** Non un wrapper. Non un proxy. Non un imitatore.

Il tuo account Anthropic esistente funziona direttamente:
- **Piano Claude Max/Pro** — autenticati tramite l'interfaccia web (OAuth), esattamente come con Claude Code desktop
- **Chiave API Anthropic** — impostala tramite l'interfaccia web, stessa fatturazione di sempre
- **Nessun costo aggiuntivo** — HolyClaude è gratuito e open source. Paghi solo Anthropic per quello che usi, come già fai.

> HolyClaude non tocca le tue credenziali. Sono conservate localmente nel tuo volume bind-mounted (`./data/claude/`), esattamente come sarebbe su bare metal.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## Indice dei contenuti

| | Sezione |
|---|---|
| :zap: | [Avvio rapido](#zap-quick-start) |
| :computer: | [Piattaforme supportate](#computer-platform-support) |
| :star2: | [Perché HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Abbonamento e autenticazione](#credit_card-subscription--authentication) |
| :package: | [Varianti dell'immagine](#package-image-variants) |
| :whale: | [Docker Compose — Rapido](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Completo](#whale2-docker-compose--full) |
| :wrench: | [Variabili d'ambiente](#wrench-environment-variables) |
| :rocket: | [Cosa c'è dentro](#rocket-whats-inside) |
| :robot: | [Provider CLI AI](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Usare Ollama](#llama-using-ollama) |
| :building_construction: | [Architettura](#building_construction-architecture) |
| :file_folder: | [Struttura del progetto](#file_folder-project-structure) |
| :floppy_disk: | [Dati e persistenza](#floppy_disk-data--persistence) |
| :lock: | [Permessi](#lock-permissions) |
| :shield: | [Accesso remoto ed esposizione](#shield-remote-access--exposure) |
| :bell: | [Notifiche](#bell-notifications) |
| :arrows_counterclockwise: | [Aggiornamento](#arrows_counterclockwise-upgrading) |
| :construction: | [Risoluzione dei problemi](#construction-troubleshooting) |
| :warning: | [Problemi noti](#warning-known-issues) |
| :hammer_and_wrench: | [Build locale](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Alternative](#bar_chart-alternatives) |
| :rocket: | [Roadmap](#rocket-roadmap) |
| :trophy: | [Costruito con HolyClaude](#trophy-built-with-holyclaude) |
| :handshake: | [Contribuire](#handshake-contributing) |
| :heart: | [Supporto](#heart-support) |
| :scroll: | [Software di terze parti](#scroll-third-party-software) |
| :page_facing_up: | [Licenza](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :zap: Avvio rapido

**1.** Crea una cartella per HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Crea un file `docker-compose.yaml`. Copia uno dei template qui sotto:
- [Template rapido](#whale-docker-compose--quick) — minimale, zero configurazione, funziona subito
- [Template completo](#whale2-docker-compose--full) — tutte le opzioni, completamente documentato

**3.** Scarica e avvia:

```bash
docker compose up -d
```

**4.** Apri l'interfaccia web:

```
http://localhost:3001
```

**5.** Crea un account CloudCLI (ci vogliono 10 secondi), accedi con il tuo account Anthropic e sei operativo.

> Nessun file `.env`. Nessuna pre-configurazione. Nessun bisogno di leggere 40 pagine di documentazione prima di iniziare. Funziona e basta.

> **Vuoi raggiungerlo dall'esterno della tua rete?** Non fare port-forward. Vedi [Accesso remoto ed esposizione](#shield-remote-access--exposure) — usa Tailscale o Cloudflare Tunnel invece.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :computer: Piattaforme supportate

| Piattaforma | Stato | Note |
|----------|--------|-------|
| Linux (amd64) | ✅ Completamente supportato | Prestazioni native, consigliato |
| Linux (arm64) | ✅ Completamente supportato | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Completamente supportato | Apple Silicon e Intel tramite Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Completamente supportato | Richiede backend WSL2 |
| Synology / QNAP NAS | ✅ Completamente supportato | Usa `CHOKIDAR_USEPOLLING=true` per mount SMB |
| Kubernetes | 🔜 Prossimamente | Helm chart in programma |

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :star2: Perché HolyClaude

L'ho costruito perché ero stanco di ripetere la stessa configurazione ogni volta. Installare Claude Code, collegare un'interfaccia web, configurare Chromium in Docker, risolvere problemi di permessi, fare debug della supervisione dei processi. Ogni. Volta.

Così ho creato un container che fa tutto. E poi ho incontrato ogni possibile bug al posto tuo.

| | HolyClaude | Farlo da soli |
|---|---|---|
| **Configurazione** | 30 secondi | 1-2 ore (se va bene) |
| **Claude Code** | Pre-installato, pre-configurato, pronto | Installa, configura, fai debug del blocco dell'installer, correggi WORKDIR |
| **Interfaccia web** | CloudCLI incluso con plugin | Trova un'interfaccia web, installala, configurala, collegala a Claude |
| **Browser headless** | Chromium + Xvfb + Playwright, configurati | Installa Chromium, installa Xvfb, configura il display :99, correggi shm, sandbox, seccomp... |
| **CLI AI** | 8 provider, un container | Installa ognuna separatamente su 3 package manager |
| **Strumenti di sviluppo** | 50+ strumenti, pronti | `apt-get install` / `npm i -g` / `pip install` per la prossima ora |
| **Gestione dei processi** | s6-overlay (riavvio automatico, shutdown controllato) | Scrivi la tua configurazione supervisord o spera che il restart di Docker funzioni |
| **Persistenza** | Bind mount, le credenziali sopravvivono a tutto | Capire i volumi Docker, fare debug di "perché questa è una directory e non un file" |
| **Aggiornamenti** | `docker pull && docker compose up -d` | Aggiorna 50 strumenti manualmente, prega che non si rompa nulla |
| **Multi-arch** | AMD64 + ARM64 | Prega che il tuo Dockerfile compili su ARM |

**L'ultima riga di ogni configurazione manuale è "funziona sulla mia macchina."** HolyClaude funziona su ogni macchina.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :credit_card: Abbonamento e autenticazione

HolyClaude esegue la **Claude Code CLI ufficiale** di Anthropic. Il tuo account esistente funziona immediatamente.

### Cosa funziona:

| Metodo di autenticazione | Come | Costo |
|----------------------|-----|------|
| **Piano Claude Max/Pro** (abbonamento) | Accedi tramite l'interfaccia web CloudCLI — stesso flusso OAuth del desktop | Il tuo abbonamento esistente, nessun costo aggiuntivo |
| **Chiave API Anthropic** | Incolla la tua chiave API nell'interfaccia web | Pay-per-use, stessa fatturazione Anthropic |

### Cosa non funziona:

| | Perché |
|---|---|
| Chiave API OpenAI per Claude | Aziende diverse, API diverse. Le chiavi OpenAI funzionano con la **Codex CLI** (anch'essa pre-installata) |

> **Abbonati ChatGPT Plus/Pro:** Il tuo abbonamento funziona con la **Codex CLI**. Esegui `codex login --device-auth` all'interno del container per autenticarti con il tuo account ChatGPT.

### Altre CLI AI incluse:

| CLI | Cosa ti serve |
|-----|--------------|
| Gemini CLI | Chiave API Google AI (`GEMINI_API_KEY`) |
| OpenAI Codex | Chiave API OpenAI (`OPENAI_API_KEY`) o abbonamento ChatGPT Plus/Pro (`codex login --device-auth`) |
| Cursor | Chiave API Cursor (`CURSOR_API_KEY`) |
| TaskMaster AI | Usa le tue chiavi AI provider (Anthropic, OpenAI, ecc.) |
| Junie | Account JetBrains (abbonamento JetBrains AI) |
| OpenCode | Configura tramite TUI `opencode` (supporta OpenRouter e più provider) |
| Pi Coding Agent | Configura tramite `pi` (supporta più provider) |

> **HolyClaude è gratuito e open source.** Paghi solo i tuoi provider AI per l'utilizzo, come già fai. Non intercettiamo, non facciamo proxy e non tocchiamo le tue credenziali. Vivono nel tuo bind mount locale.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :package: Varianti dell'immagine

Due versioni. Stessa qualità. Scegli il tuo peso.

| Tag | Cosa ottieni | Ideale per |
|-----|-------------|----------|
| **`latest`** | Tutto pre-installato — ogni strumento, ogni libreria, ogni CLI | La maggior parte degli utenti. Zero tempo di attesa. Claude non deve mai fermarsi per installare qualcosa. |
| **`slim`** | Solo gli strumenti di base — Claude installa gli extra su richiesta | VPS piccoli, disco limitato, banda a consumo |
| `X.Y.Z` | Immagine completa, versione fissa | Stabilità in produzione — controlli tu quando aggiornare |
| `X.Y.Z-slim` | Immagine slim, versione fissa | Produzione + footprint ridotto |

```bash
# Completa — batterie incluse (consigliata)
docker pull coderluii/holyclaude

# Slim — leggera ed efficiente
docker pull coderluii/holyclaude:slim
```

> **`latest` è sempre l'immagine completa.** Utenti slim: non preoccupatevi — quando chiedete a Claude di fare qualcosa che richiede uno strumento mancante, lo installa in pochi secondi. Ottieni le stesse funzionalità, solo con un download iniziale più piccolo.
>
> Docker Hub mostra la dimensione compressa del download: `latest` è circa 4,1 GB e `slim` circa 2,4 GB. Docker, Synology Container Manager e i filesystem NAS possono mostrare una dimensione maggiore dopo l'estrazione dei layer.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :whale: Docker Compose — Rapido

Il template "voglio solo che funzioni". Copia questo intero blocco in un file `docker-compose.yaml`:

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

Poi:

```bash
docker compose up -d
```

Apri `http://localhost:3001`. Crea un account CloudCLI. Accedi con il tuo account Anthropic. Costruisci qualcosa.

**Questa è tutta la configurazione. Hai finito.**

> **Perché queste capacità del browser?** Questa release mantiene il profilo browser attuale di HolyClaude. `SYS_ADMIN` e `seccomp=unconfined` aumentano i privilegi di processo e riducono l'isolamento; `SYS_PTRACE` serve per il debug. Mantieni questo profilo com'è per v1.5.0 e tratta l'hardening come una modifica separata.

> **Perché `shm_size: 2g`?** Docker assegna ai container 64MB di memoria condivisa per impostazione predefinita. HolyClaude conserva 2GB come valore predefinito mantenuto per questa release perché Chromium usa molto `/dev/shm` per il rendering delle schede. A 64MB, le schede vanno in crash; se usi molto il browser, sali a 4GB.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :whale2: Docker Compose — Completo

Stessa immagine, ogni opzione esposta. Copia questo intero blocco in un file `docker-compose.yaml`:

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

Poi:

```bash
docker compose up -d
```

Se vuoi cambiare la porta lato host o i percorsi bind-mount senza modificare il compose, copia `.env.example` in `.env` e imposta:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Questi valori vengono letti da Docker Compose sull'host. Non sono variabili d'ambiente del container.

### Cosa controlla ogni sezione:

| Sezione | Cosa fa | Quando cambiarla |
|---------|-------------|-------------------|
| **Timezone** | Orologio del container | Sempre — imposta il tuo fuso orario locale |
| **Performance** | Limite di memoria Node.js | Solo se incorri in errori OOM su progetti grandi |
| **User mapping** | Permessi dei file tra container e host | Se ricevi errori "permission denied" (`id -u` e `id -g` sul tuo host) |
| **SMB/CIFS** | Modalità polling del file watcher | Solo se i tuoi volumi si trovano su NAS o condivisione di rete |
| **Notifications** | Avvisi push tramite Apprise (Discord, Telegram, Slack, Email, 100+ servizi) | Se vuoi allontanarti e sapere quando Claude ha finito |
| **AI providers** | Chiavi API per Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Se vuoi usare CLI AI diverse da Claude |

> **Ogni singola variabile d'ambiente è opzionale.** Il container funziona perfettamente con solo `TZ=UTC`. Tutto il resto ha valori predefiniti ragionevoli o viene gestito tramite l'interfaccia web.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :wrench: Variabili d'ambiente

Il riferimento completo. Ogni variabile, il suo valore predefinito, cosa fa.

| Variabile | Predefinito | Cosa fa |
|----------|---------|--------------|
| `TZ` | `UTC` | Fuso orario del container |
| `PUID` | `1000` | ID utente del container per rimappatura Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | ID gruppo del container per rimappatura Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Limite memoria heap Node.js in MB |
| `GIT_USER_NAME` | `HolyClaude User` | Autore dei commit Git (impostato una volta al primo avvio) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Email dei commit Git (impostata una volta al primo avvio) |
| `CHOKIDAR_USEPOLLING` | *(non impostato)* | Imposta a `1` per SMB/CIFS — abilita i file watcher in polling |
| `WATCHFILES_FORCE_POLLING` | *(non impostato)* | Imposta a `true` per SMB/CIFS — abilita il polling Python |
| `NOTIFY_DISCORD` | *(non impostato)* | URL webhook Discord per le notifiche |
| `NOTIFY_TELEGRAM` | *(non impostato)* | URL bot Telegram per le notifiche |
| `NOTIFY_PUSHOVER` | *(non impostato)* | URL Pushover per le notifiche |
| `NOTIFY_SLACK` | *(non impostato)* | URL webhook Slack per le notifiche |
| `NOTIFY_EMAIL` | *(non impostato)* | URL email (SMTP) per le notifiche |
| `NOTIFY_GOTIFY` | *(non impostato)* | URL Gotify per le notifiche |
| `NOTIFY_URLS` | *(non impostato)* | Catch-all — [URL Apprise](https://github.com/caronc/apprise/wiki) separati da virgola |
| `ANTHROPIC_API_KEY` | *(non impostato)* | Chiave API Anthropic (alternativa all'OAuth dell'interfaccia web) |
| `ANTHROPIC_AUTH_TOKEN` | *(non impostato)* | Token di autenticazione Anthropic (alternativa alla chiave API) |
| `ANTHROPIC_BASE_URL` | *(non impostato)* | Endpoint API Anthropic personalizzato (proxy, deployment privati) |
| `CLAUDE_CODE_USE_BEDROCK` | *(non impostato)* | Imposta a `1` per usare il backend Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | *(non impostato)* | Imposta a `1` per usare il backend Google Vertex AI |
| `GEMINI_API_KEY` | *(non impostato)* | Chiave API Google Gemini |
| `OPENAI_API_KEY` | *(non impostato)* | Chiave API OpenAI (per Codex CLI, oppure usa `codex login --device-auth` per abbonamento ChatGPT) |
| `CURSOR_API_KEY` | *(non impostato)* | Chiave API Cursor |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Setup globale opzionale degli skill Desloppify. Valori: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` o sottoinsiemi separati da virgole |
| `OLLAMA_HOST` | *(non impostato)* | URL endpoint Ollama (es. `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :rocket: Cosa c'è dentro

Questo non è un container minimale. Questa è un'intera workstation di sviluppo.

### Entrambe le varianti (full + slim)

<details>
<summary><strong>Node.js 26 + pacchetti npm globali</strong></summary>

| Pacchetto | A cosa serve |
|---------|---------------|
| `typescript`, `tsx` | Compilazione ed esecuzione TypeScript |
| `pnpm` | Package manager veloce e con poco utilizzo disco |
| `vite`, `esbuild` | Strumenti di build ultra-rapidi |
| `eslint`, `prettier` | Qualità del codice e formattazione |
| `serve`, `nodemon` | Server di file statici, server di sviluppo con riavvio automatico |
| `concurrently` | Esegui più script in parallelo |
| `dotenv-cli` | Carica variabili d'ambiente da file `.env` |

</details>

<details>
<summary><strong>Pacchetti Python 3</strong></summary>

| Pacchetto | A cosa serve |
|---------|---------------|
| `requests`, `httpx` | Client HTTP |
| `beautifulsoup4`, `lxml` | Web scraping e parsing HTML |
| `Pillow` | Elaborazione immagini (pre-compilato — nessuna attesa) |
| `pandas`, `numpy` | Manipolazione dati (pre-compilati — davvero, non vuoi fare pip install di questi a runtime) |
| `openpyxl` | Lettura/scrittura file Excel |
| `python-docx` | Lettura/scrittura documenti Word |
| `jinja2`, `markdown` | Templating e rendering markdown |
| `pyyaml`, `python-dotenv` | Parsing file di configurazione |
| `rich`, `click`, `tqdm` | CLI eleganti e barre di avanzamento |
| `desloppify`, `bandit`, `tree-sitter` | Scansioni qualita codice, controlli sicurezza Python, analisi codice con parser |
| `playwright` | Automazione browser (Chromium già configurato e pronto) |

</details>

<details>
<summary><strong>Strumenti di sistema</strong></summary>

| Strumento | A cosa serve |
|------|---------------|
| `git`, `gh` | Controllo versione + GitHub CLI (PR, issue, release dal terminale) |
| `ripgrep` (`rg`), `fd`, `fzf` | Ricerca ultra-veloce — Claude li usa continuamente |
| `bat`, `tree`, `jq` | Cat migliore (syntax highlighting), alberi di directory, elaborazione JSON |
| `curl`, `wget` | Download HTTP |
| `tmux` | Terminal multiplexer — esegui cose in background |
| `htop`, `lsof`, `strace` | Monitoraggio processi e debug |
| `imagemagick` | Conversione immagini (`convert`, `identify`, `mogrify`) |
| `chromium` | Browser headless — screenshot, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Interfaccia diretta con database |
| `openssh-client`, `openssh-server`, `mosh` | SSH in uscita e accesso SSH/Mosh opzionale al container |

</details>

<details>
<summary><strong>CLI AI — ogni provider principale</strong></summary>

| CLI | Comando | A cosa serve |
|-----|---------|---------------|
| **Claude Code** | `claude` | Il protagonista principale — ci stai girando dentro |
| **Gemini CLI** | `gemini` | Agente di coding AI di Google |
| **OpenAI Codex** | `codex` | Agente di coding di OpenAI |
| **Cursor** | `cursor` | Agente AI di Cursor |
| **TaskMaster AI** | `task-master` | Pianificazione e orchestrazione dei task |
| **Junie** | `junie` | Agente di coding AI di JetBrains |
| **OpenCode** | `opencode` | Agente AI open source (OpenRouter e più provider) |
| **Pi Coding Agent** | `pi` | Harness agente minimale (più provider) |

Otto CLI AI. Un container. Passa da una all'altra istantaneamente. Nessun'altra immagine Docker fa questo.

</details>

### Solo immagine full (pacchetti aggiuntivi)

L'immagine full include tutto quanto sopra, più:

<details>
<summary><strong>Pacchetti npm aggiuntivi — deployment, ORM, performance</strong></summary>

| Pacchetto | A cosa serve |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Deployment Cloudflare Workers |
| `vercel` | Deployment Vercel |
| `netlify-cli` | Deployment Netlify |
| `az` | Azure CLI per deployment e gestione cloud |
| `prisma`, `drizzle-kit` | I due ORM Node.js più popolari |
| `pm2` | Process manager per produzione |
| `eas-cli` | Build Expo / React Native |
| `lighthouse`, `@lhci/cli` | Audit delle performance (Chromium è già disponibile) |
| `sharp-cli` | CLI per elaborazione immagini |
| `json-server`, `http-server` | Mock REST API, server di file statici |
| `@marp-team/marp-cli` | Da Markdown a presentazioni |

</details>

<details>
<summary><strong>Pacchetti Python aggiuntivi — PDF, visualizzazione dati, framework web</strong></summary>

| Pacchetto | A cosa serve |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Ogni libreria PDF principale. Generali, leggili, convertili, uniscili. |
| `xlsxwriter`, `xlrd` | Formati Excel oltre a quanto copre openpyxl |
| `matplotlib`, `seaborn` | Visualizzazione dati e grafici |
| `python-pptx` | Generazione PowerPoint |
| `fastapi`, `uvicorn` | Framework web Python |

</details>

<details>
<summary><strong>Pacchetti di sistema aggiuntivi — media, documenti</strong></summary>

| Pacchetto | A cosa serve |
|---------|---------------|
| `pandoc` | Converti tra qualsiasi formato di documento (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Elaborazione video e audio (estrai, converti, trascrivi) |
| `libvips-dev` | Libreria di elaborazione immagini ad alte prestazioni |

</details>

> **Utenti slim:** Manca un pacchetto? Chiedi a Claude. Installa pacchetti npm/pip in pochi secondi. I pacchetti di sistema (pandoc, ffmpeg) richiedono 1-2 minuti. Ottieni le stesse funzionalità — l'immagine full ha semplicemente zero tempo di attesa.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :robot: Provider CLI AI

Otto CLI AI. Un container. Nessun'altra immagine Docker ti offre questo.

| Provider | Comando | Come autenticarsi | Abbonamento supportato? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | Interfaccia web CloudCLI (OAuth) | **Sì** — piano Max/Pro o chiave API |
| **Gemini CLI** | `gemini` | Variabile d'ambiente `GEMINI_API_KEY` | Chiave API (pay-per-use) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` oppure `codex login --device-auth` | **Sì** — ChatGPT Plus/Pro/Team/Enterprise o chiave API |
| **Cursor** | `cursor` | Variabile d'ambiente `CURSOR_API_KEY` | Chiave API |
| **TaskMaster AI** | `task-master` | Usa le chiavi AI provider esistenti | Funziona con le chiavi configurate |
| **Junie** | `junie` | Abbonamento JetBrains AI | Account JetBrains richiesto |
| **OpenCode** | `opencode` | Configura tramite TUI | Supporta OpenRouter e più provider; solo full image |
| **Pi Coding Agent** | `pi` | Configura tramite Pi | Supporta più provider |

> Claude Code è la CLI principale. Le altre sono disponibili perché a volte vuoi un secondo parere, o i punti di forza di un modello specifico, o stai confrontando output. Averle tutte a portata di `Tab` è il punto centrale.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :mag: Desloppify

Desloppify e incluso in entrambe le immagini come comando `desloppify`. Per default e passivo: HolyClaude non esegue scansioni, non crea `.desloppify/`, non modifica `.gitignore` e non cambia workspace montati finche non esegui Desloppify tu.

```bash
desloppify scan --path .
desloppify next
```

Dopo una scansione, aggiungi `.desloppify/` al `.gitignore` di quel progetto.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` disattiva solo il setup globale automatico degli skill; la CLI resta installata. `all` significa `claude,codex,gemini`. `opencode` e solo per l'immagine full e non e incluso in `all`. Non combinare `claude` e `opencode` nel setup automatico, perche OpenCode puo gia scoprire skill compatibili con Claude da `~/.claude/skills`.

Target upstream manuali: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ torna su</a>
</p>

---

## :llama: Usare Ollama

HolyClaude funziona con [Ollama](https://ollama.com) come alternativa a un abbonamento Anthropic. Imposta due variabili d'ambiente e usa modelli locali o cloud.

Consulta la guida completa: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :building_construction: Architettura

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

### Come si incastrano i pezzi

1. **Il container si avvia** — `entrypoint.sh` viene eseguito come root. Rimappa UID/GID per corrispondere al tuo utente host, ripristina la sessione Claude Code salvata prima che bootstrap possa toccarla e verifica se è il primo avvio.

2. **Solo al primo avvio** — `bootstrap.sh` viene eseguito una volta. Copia le impostazioni predefinite, il template di memoria, configura l'identità git. Crea un file sentinella (`.holyclaude-bootstrapped`) così non viene mai eseguito di nuovo. Le tue personalizzazioni sono al sicuro da quel momento in poi.

3. **s6-overlay prende il controllo come PID 1** — Non è supervisord. È [s6-overlay](https://github.com/just-containers/s6-overlay), progettato appositamente per Docker. Supervisiona CloudCLI, Xvfb e la sincronizzazione della sessione Claude. Riavvia automaticamente in caso di crash. Gestisce i segnali. Riepiloga i processi zombi. Si spegne in modo controllato.

4. **CloudCLI serve l'interfaccia web** — Porta 3001. Interfaccia basata su browser per Claude Code con gestione progetti, sessioni multiple e plugin (statistiche progetto + terminale web inclusi).

5. **Xvfb fornisce un display di compatibilità** — Xvfb resta disponibile su `:99` per gli strumenti che usano un display visibile. Chromium headless moderno, Playwright e Lighthouse non richiedono sempre Xvfb.

Consulta [docs/architecture.md](docs/architecture.md) per l'approfondimento tecnico completo — incluso perché abbiamo scelto s6 al posto di supervisord, perché i plugin sono integrati nell'immagine e perché `runuser` invece di `su`.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :file_folder: Struttura del progetto

```
holyclaude/
├── .github/                 # Workflow CI/CD, template issue e PR
│   ├── FUNDING.yml          # Link sponsor/donazioni
│   ├── ISSUE_TEMPLATE/      # Bug report, feature request, package request
│   ├── pull_request_template.md
│   ├── SECURITY.md          # Policy di sicurezza
│   └── workflows/           # Automazione build e push Docker
├── assets/                  # Immagini logo e banner
├── config/                  # Configurazione Claude Code
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # Documentazione estesa
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # Script del ciclo di vita del container
│   ├── bootstrap.sh         # Configurazione al primo avvio
│   ├── entrypoint.sh        # Entrypoint del container
│   └── notify.py            # Helper notifiche (Apprise)
├── s6-overlay/              # Supervisione processi (servizi s6-rc)
├── Dockerfile               # Build single-stage
├── docker-compose.yaml      # Avvio rapido (configurazione minimale)
├── docker-compose.full.yaml # Configurazione completa (tutte le opzioni)
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :floppy_disk: Dati e persistenza

| Cosa | Dove (container) | Dove (host) | Sopravvive al rebuild? |
|------|-------------------|-------------|-------------------|
| Impostazioni, credenziali, chiavi API | `/home/claude/.claude` | `./data/claude` | **Sì** |
| Sessione Claude Code (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Sì** |
| Il tuo codice e progetti | `/workspace` | `./workspace` | **Sì** |
| Account CloudCLI | `/home/claude/.cloudcli` | *(solo container per default — vedi sotto)* | No (opt-in disponibile) |

HolyClaude ripristina la sessione Claude Code salvata prima che l'avvio possa creare un nuovo file predefinito. Cosi rebuild e recreate non sostituiscono una vera sessione OAuth/API con lo stato di onboarding.

### Cosa sopravvive a `docker compose down && docker compose up`:
- La tua autenticazione Anthropic e le chiavi API
- Impostazioni Claude Code, memoria (`CLAUDE.md`) e sessione OAuth (senza ri-login)
- Tutto il tuo codice in `./workspace`
- Configurazione Git
- Auth di Codex, Gemini e Cursor CLI (dalla v1.1.7)

### Cosa dovrai rifare (10 secondi):
- Account web CloudCLI — registrazione rapida, tutto qui (a meno che non attivi la persistenza qui sotto)

### Riattivare la configurazione del primo avvio:
```bash
# Elimina il file sentinella — NON l'intera cartella
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Non eliminare mai `./data/claude/` per intero.** Lì vivono le tue credenziali. Elimina il file sentinella se vuoi un bootstrap pulito. Elimina file di configurazione specifici se vuoi ripristinare le impostazioni. Ma non cancellare mai l'intera cartella.

### Persistere l'account CloudCLI (opzionale, solo storage locale)

Per default, il database dell'account CloudCLI (`~/.cloudcli`) è locale al container e viene cancellato al rebuild. Ricreare l'account richiede 10 secondi, quindi la maggior parte delle persone lo lascia così.

Se vuoi che sopravviva ai rebuild, aggiungi un **named Docker volume** al tuo compose file:

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

> **NON fare bind-mount di `./data/cloudcli` su una condivisione di rete (NAS, SMB/CIFS, NFS).** CloudCLI memorizza il suo account in SQLite, e il file locking di SQLite si rompe sui mount di rete. Avrai errori `database is locked` in continuazione. I named volume vivono sul filesystem locale del Docker engine, ecco perché funziona — i bind mount che puntano a un NAS non funzioneranno.

Un bind mount verso un percorso SSD locale va bene, tienilo solo lontano da qualsiasi condivisione di rete.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :lock: Permessi

Claude Code viene eseguito in modalità **`acceptEdits`** per impostazione predefinita. Questa è l'impostazione inclusa nell'immagine:

| Azione | Consentita? |
|--------|----------|
| Leggere file | Sì |
| Modificare / creare file | Sì |
| Eseguire comandi shell | **Ti chiede prima** |
| Installare pacchetti | **Ti chiede prima** |

### Vuoi il bypass completo? (utenti avanzati)

È come lo uso personalmente. Modifica `./data/claude/settings.json` sul tuo host:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **La modalità bypass significa che Claude esegue comandi senza conferma.** È potente, ma può anche eseguire rapidamente comandi distruttivi. Mantieni il valore predefinito `acceptEdits` incluso nell'immagine a meno che tu non ti fidi del workspace e di ogni prompt.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :shield: Accesso remoto ed esposizione

HolyClaude lega CloudCLI alla porta `3001`. Per default è solo locale — perfetto per girare sul tuo laptop o un server domestico a cui accedi via SSH.

**Nel momento in cui vuoi raggiungerlo dall'esterno della tua rete, leggi questa sezione.**

### Non fare port-forward verso l'internet pubblico

Lo dico chiaramente: non aprire un buco nel tuo router ed esporre `3001` all'internet aperto. Nemmeno con una password. Ecco perché:

- CloudCLI espone una shell completa tramite il plugin terminal web
- Può eseguire codice arbitrario, installare pacchetti e leggere/scrivere tutto il tuo `/workspace`
- Detiene i tuoi token OAuth Anthropic e le chiavi API
- Le password di autenticazione base vengono forzate, credential-stuffed ed estratte dai log
- Una password trapelata = qualcun altro ha un'istanza Claude Code a pagamento che gira sulla tua macchina con i tuoi soldi

Una password è un dosso, non una porta. Tratta HolyClaude come tratteresti una sessione SSH: mai sull'internet aperto senza un tunnel adeguato davanti.

### Usa un tunnel adeguato invece

Queste sono le due opzioni che raccomando davvero:

| Opzione | Per chi | Perché |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Uso personale, piccoli team | VPN mesh WireGuard. Installa Tailscale sul tuo server + laptop/telefono, e raggiungi `http://holyclaude:3001` da qualsiasi posto come se fossi sulla LAN. Nessuna porta aperta, nessun DNS, nessun certificato. Gratuito per uso personale. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Condivisione con altri, hostname pubblico | Cloudflare fa da proxy alla connessione, quindi la porta `3001` rimane chiusa. Ottieni un dominio reale con HTTPS, e puoi mettere Cloudflare Access (Google/GitHub SSO) davanti. Il tier gratuito copre la maggior parte dell'uso personale. |

Entrambi ti danno:
- Zero porte aperte sul tuo router
- Trasporto cifrato end-to-end
- Autenticazione reale basata sull'identità (non una password condivisa)
- Log di audit

### Se insisti ad esporlo direttamente (per favore non farlo)

Se devi assolutamente saltare il tunnel (tutorial di self-hosting, rete di lab isolata, qualunque cosa), come minimo assoluto:

1. **Metti un reverse proxy davanti** (Caddy, nginx, Traefik) con TLS reale
2. **Aggiungi IP allowlisting** a livello di firewall o proxy — solo i tuoi IP noti
3. **Mantieni il valore predefinito `acceptEdits` incluso nell'immagine**, a meno che tu non abbia un motivo chiaro per usare `bypassPermissions`
4. **Ruota le tue credenziali Anthropic** se qualcosa sembra strano
5. **Esegui dietro Cloudflare Access o SSO simile**, non autenticazione base

Anche con tutto questo, la superficie di rischio è enorme. Usa Tailscale o Cloudflare Tunnel. Sono gratuiti, richiedono cinque minuti per configurarsi, e sono quello che uso personalmente.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :bell: Notifiche

Allontanati dal computer e sappi quando Claude ha finito. Usa [Apprise](https://github.com/caronc/apprise) per le notifiche — supporta 100+ servizi tra cui Discord, Telegram, Slack, Email, Pushover, Gotify e molti altri.

**Per abilitare:**

1. Aggiungi una o più variabili `NOTIFY_*` all'`environment` del tuo compose:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. All'interno del container: `touch ~/.claude/notify-on`

Consulta la [documentazione di configurazione](docs/configuration.md#notifications-apprise) per tutte le variabili supportate e i formati URL.

**Per disabilitare:** `rm ~/.claude/notify-on`

**Eventi che attivano le notifiche:**
| Evento | Cosa è successo |
|-------|--------------|
| `stop` | Claude ha completato il task corrente |
| `error` | Si è verificato un errore nell'uso di uno strumento |

> Completamente silenzioso quando non configurato. Nessuna variabile `NOTIFY_*` impostata? Nessun file flag? Zero chiamate di rete. Zero spam nei log. Zero overhead.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :arrows_counterclockwise: Aggiornamento

```bash
# Scarica l'immagine più recente
docker compose pull

# Ricrea il container con la nuova immagine
docker compose up -d
```

I tuoi dati persistono in `./data/claude` e `./workspace` — l'aggiornamento sostituisce solo il container, non i tuoi file.

Non eseguire `cloudcli update` o `npm install -g @cloudcli-ai/cloudcli@latest` dentro il container. HolyClaude include un runtime CloudCLI patchato; aggiorna con `docker compose pull && docker compose up -d`.

Per fissare una versione specifica invece di `latest`:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :construction: Risoluzione dei problemi

<details>
<summary><strong>CloudCLI mostra la directory predefinita sbagliata</strong></summary>

CloudCLI si apre su `/home/claude` invece di `/workspace`.

**Causa:** Uno script di servizio CloudCLI personalizzato o modificato non ha impostato `WORKSPACES_ROOT=/workspace` prima di avviare CloudCLI.

**Soluzione:** Già gestita in HolyClaude. Lo script di esecuzione s6 imposta `WORKSPACES_ROOT=/workspace` direttamente nell'ambiente del processo.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Causa:** Database SQLite su mount di rete SMB/CIFS. CIFS non supporta il locking a livello di file richiesto da SQLite.

**Soluzione:** Non conservare database SQLite su condivisioni di rete. HolyClaude mantiene `.cloudcli` nello storage locale del container esattamente per questo motivo. Se hai database SQLite personali in `/workspace` su un NAS, spostali in un percorso locale.
</details>

<details>
<summary><strong>Chromium va in crash / pagine bianche / errori di tab</strong></summary>

**Causa:** Memoria condivisa insufficiente. Docker imposta un limite predefinito di 64MB.

**Soluzione:** Assicurati di avere `shm_size: 2g` nel tuo file compose. Per uso intensivo del browser (molte tab, pagine complesse), aumenta a `4g`.
</details>

<details>
<summary><strong>I file watcher non rilevano i cambiamenti (hot reload non funziona)</strong></summary>

**Causa:** I mount di rete SMB/CIFS non supportano `inotify`.

**Soluzione:** Abilita il polling nell'ambiente del tuo compose:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Nota: Il polling usa più CPU di inotify. Abilitalo solo su mount di rete.
</details>

<details>
<summary><strong>Errori "permission denied"</strong></summary>

**Causa:** UID/GID del container non corrisponde alla proprietà dei file sull'host.

**Soluzione:**
```bash
# Sul tuo host
id -u  # → questo è il tuo PUID
id -g  # → questo è il tuo PGID
```
Impostali nel tuo file compose:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker crea .claude.json come directory</strong></summary>

**Causa:** Se un file di destinazione di un bind-mount non esiste prima dell'avvio del container, Docker lo crea generosamente come directory. Grazie, Docker.

**Soluzione:** Già gestita — `entrypoint.sh` ripristina prima il file di sessione salvato oppure crea un file predefinito sicuro quando non esiste una sessione salvata.
</details>

Consulta [docs/troubleshooting.md](docs/troubleshooting.md) per la guida completa, incluse tutte le problematiche SMB/CIFS e la storia completa dei bug incontrati e risolti.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :warning: Problemi noti

Questi non sono bug di HolyClaude — sono problemi upstream o compromessi intenzionali.

| Problema | Perché | Soluzione alternativa |
|-------|-----|------------|
| Pulsante "Continue in Shell" non funziona | Bug upstream di CloudCLI (race condition nell'inizializzazione del terminale) | Usa invece il plugin **Web Terminal** (pre-installato) |
| Cursor CLI "Command timeout" | Nessuna chiave API configurata — solo estetico, non influisce su nulla | Imposta `CURSOR_API_KEY` o ignoralo |
| Account CloudCLI perso al rebuild | SQLite non può persistere su mount di rete — compromesso intenzionale | Ricrea l'account (~10 secondi) |
| Notifiche push web "not supported" | Limitazione del browser in CloudCLI, comportamento standard | Usa invece le notifiche Apprise (vedi [Notifiche](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :hammer_and_wrench: Build locale

Vuoi costruire l'immagine tu stesso invece di scaricarla da Docker Hub? Vai pure:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# Build immagine full
docker build -t holyclaude .

# Build immagine slim
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# Build per ARM (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

Poi usa `image: holyclaude` invece di `image: coderluii/holyclaude:latest` nel tuo file compose.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :bar_chart: Alternative

Come si confronta HolyClaude con altri approcci?

| Approccio | Interfaccia web | Multi-AI | Strumenti pre-configurati | Browser headless | Configurazione con un comando | Persistenza |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLI | 50+ strumenti | Chromium + Xvfb + Playwright | `docker compose up` | Bind mount |
| Claude Code (bare metal) | No | No | Installa tu stesso | Installa tu stesso | Installazione multi-step | Manuale |
| Claude Code + oh-my-openagent | No | Sì (multi-modello) | Alcuni | No | npm install | Manuale |
| DIY Docker + Claude Code | Forse | Forse | Quello che aggiungi | Se lo configuri | Se scrivi il Dockerfile | Se imposti i volumi |
| Cursor IDE | Integrata | Solo Cursor | Inclusi nell'IDE | No | Scarica l'app | Dati dell'app |

HolyClaude non compete con gli agenti di coding — è il **layer infrastrutturale** che li fa funzionare meglio a tutti. È il container in cui li esegui.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :rocket: Roadmap

Cosa verrà dopo:

| Stato | Funzionalità |
|--------|---------|
| 🔜 | **Build native ARM** — immagini ARM64 native ottimizzate, non solo emulate |
| 🔜 | **Integrazione tunnel VS Code** — VS Code Server integrato o tunnel per la connessione da VS Code desktop |
| 🔜 | **Routing delle notifiche** — destinazioni di notifica diverse per tipo di evento (errori su Telegram, completamenti su Discord) |

Hai un'idea? [Avvia una discussione](https://github.com/CoderLuii/HolyClaude/discussions) o [richiedi una funzionalità](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :trophy: Costruito con HolyClaude

Stai usando HolyClaude per costruire qualcosa? Ci piacerebbe vederlo.

Apri una issue con il label `showcase` o invia una PR per aggiungere il tuo progetto qui:

<!-- Add your project: [Project Name](url) — one-line description -->

*Sii il primo ad aggiungere il tuo progetto qui.*

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :handshake: Contribuire

I contributi sono benvenuti. Questo progetto è nato dall'uso quotidiano reale e migliora quando più persone lo usano e trovano casi limite.

1. Fai un fork
2. Crea un branch (`git checkout -b feature/qualcosa`)
3. Fai il commit
4. Fai il push
5. Apri una PR

Bug, richieste di funzionalità, domande: [apri una issue](https://github.com/CoderLuii/HolyClaude/issues).

### Contatti

| Canale | Per |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Domande, mostra la tua configurazione, idee |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Segnalazioni bug, richieste di funzionalità e pacchetti |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Segnalazioni di vulnerabilità (private) |

### Vuoi aggiungere uno strumento?

Usa il template di issue [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml). Includi il nome del pacchetto, il metodo di installazione e quale variante (full/slim) dovrebbe essere il target.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :heart: Supporto

HolyClaude è gratuito, open source e mantenuto da un singolo sviluppatore che lo usa ogni giorno.

Se ti ha fatto risparmiare tempo, ecco come puoi aiutare:

- **Metti una stella a questo repo** — è la singola cosa più importante che puoi fare per la visibilità
- **Condividilo** — dillo a un amico, postalo, twittalo
- **Apri issue** — segnalazioni di bug e richieste di funzionalità rendono HolyClaude migliore per tutti
- **Contribuisci** — le PR sono sempre benvenute

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :scroll: Software di terze parti

L'immagine Docker di HolyClaude include software di terze parti, ognuno con la propria licenza. Componenti principali:

| Componente | Licenza | Sorgente |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Consulta [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) per tutti i dettagli, inclusi gli avvisi di modifica. Il codice sorgente di HolyClaude è distribuito con licenza MIT.

<p align="right">
  <a href="#top">↑ torna in cima</a>
</p>

---

## :page_facing_up: Licenza

MIT — vedi [LICENSE](LICENSE). Usalo come vuoi.

<p align="right">
  <a href="#top">↑ torna in cima</a>
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

Costruito da [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Questo container è quello che uso ogni giorno. Se ti fa risparmiare anche solo metà del tempo di configurazione che ha fatto risparmiare a me, una stella sarebbe gradita.

</div>
