🌍 [English](../../README.md) | **Español** | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Deja de configurar. Empieza a construir.

Un solo comando. Estacion de trabajo de IA completa. Claude Code, interfaz web, navegador headless, 8 CLIs de IA, mas de 50 herramientas de desarrollo, todo en contenedor y listo para usar.

**Ibas a pasar 2 horas configurando esto manualmente. O simplemente puedes hacer `docker compose up`.**

**Funciona con tu suscripcion existente de Claude Code.** Plan Max/Pro, clave de API, lo que tengas, simplemente funciona.

---

## ¿Que es esto?

Ya conoces la historia. Quieres Claude Code. Pero tambien lo quieres en el navegador. Con un navegador headless para capturas de pantalla y pruebas. Con Playwright configurado. Con cada CLI de IA. Con TypeScript, Python, herramientas de despliegue, clientes de base de datos, GitHub CLI.

Entonces empiezas a instalar cosas. Una por una. Luego Chromium no arranca porque la memoria compartida de Docker es de 64MB. Luego Xvfb no esta configurado. Luego el UID dentro del contenedor no coincide con el de tu host y todo da error de permisos. Luego te das cuenta de que el instalador de Claude Code se cuelga cuando WORKDIR es propiedad de root. Luego SQLite se bloquea en tu montaje NAS. Luego...

**HolyClaude es el contenedor que construi despues de resolver cada uno de esos problemas.**

Llevo semanas ejecutando esto diariamente en mi propio servidor. Cada error ha sido encontrado, diagnosticado y corregido. Cada caso extremo ha sido tratado. Cada "por que no funciona esto en Docker" tiene respuesta.

Lo descargas. Lo ejecutas. Abres el navegador. Construyes.

### :credit_card: Usa tu suscripcion existente

**Esto ejecuta el CLI oficial de Claude Code** de Anthropic. No es un wrapper. No es un proxy. No es una copia barata.

Tu cuenta de Anthropic existente funciona directamente:
- **Plan Claude Max/Pro** — autenticate a traves de la interfaz web (OAuth), igual que en Claude Code de escritorio
- **Clave de API de Anthropic** — configurala a traves de la interfaz web, la misma facturacion de siempre
- **Sin costo adicional** — HolyClaude es gratuito y de codigo abierto. Solo pagas a Anthropic por lo que usas, como ya lo haces.

> HolyClaude no toca tus credenciales. Se almacenan localmente en tu volumen bind-mounted (`./data/claude/`), igual que estarian en bare metal.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## Tabla de contenidos

| | Seccion |
|---|---|
| :zap: | [Inicio rapido](#zap-inicio-rapido) |
| :computer: | [Plataformas compatibles](#computer-plataformas-compatibles) |
| :star2: | [Por que HolyClaude](#star2-por-que-holyclaude) |
| :credit_card: | [Suscripcion y autenticacion](#credit_card-suscripcion-y-autenticacion) |
| :package: | [Variantes de imagen](#package-variantes-de-imagen) |
| :whale: | [Docker Compose — Rapido](#whale-docker-compose--rapido) |
| :whale2: | [Docker Compose — Completo](#whale2-docker-compose--completo) |
| :wrench: | [Variables de entorno](#wrench-variables-de-entorno) |
| :rocket: | [Que hay dentro](#rocket-que-hay-dentro) |
| :robot: | [Proveedores de CLI de IA](#robot-proveedores-de-cli-de-ia) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Usar Ollama](#llama-usar-ollama) |
| :building_construction: | [Arquitectura](#building_construction-arquitectura) |
| :file_folder: | [Estructura del proyecto](#file_folder-estructura-del-proyecto) |
| :floppy_disk: | [Datos y persistencia](#floppy_disk-datos-y-persistencia) |
| :lock: | [Permisos](#lock-permisos) |
| :shield: | [Acceso remoto y exposición](#shield-acceso-remoto-y-exposición) |
| :bell: | [Notificaciones](#bell-notificaciones) |
| :arrows_counterclockwise: | [Actualizar](#arrows_counterclockwise-actualizar) |
| :construction: | [Solucion de problemas](#construction-solucion-de-problemas) |
| :warning: | [Problemas conocidos](#warning-problemas-conocidos) |
| :hammer_and_wrench: | [Compilar localmente](#hammer_and_wrench-compilar-localmente) |
| :bar_chart: | [Alternativas](#bar_chart-alternativas) |
| :rocket: | [Hoja de ruta](#rocket-hoja-de-ruta) |
| :trophy: | [Construido con HolyClaude](#trophy-construido-con-holyclaude) |
| :handshake: | [Contribuir](#handshake-contribuir) |
| :heart: | [Apoyo](#heart-apoyo) |
| :scroll: | [Software de terceros](#scroll-software-de-terceros) |
| :page_facing_up: | [Licencia](#page_facing_up-licencia) |

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :zap: Inicio rapido

**1.** Crea una carpeta para HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Crea un archivo `docker-compose.yaml`. Copia una de las plantillas de abajo:
- [Plantilla rapida](#whale-docker-compose--rapido) — minima, sin configuracion, funciona de inmediato
- [Plantilla completa](#whale2-docker-compose--completo) — todas las opciones, completamente documentada

**3.** Descarga e inicia:

```bash
docker compose up -d
```

**4.** Abre la interfaz web:

```
http://localhost:3001
```

**5.** Crea una cuenta de CloudCLI (tarda 10 segundos), inicia sesion con tu cuenta de Anthropic, y ya estas en marcha.

> Sin archivos `.env`. Sin pre-configuracion. Sin leer 40 paginas de documentacion antes de poder empezar. Simplemente funciona.

> **¿Quieres acceder desde fuera de tu red?** No hagas port-forward. Mira [Acceso remoto y exposición](#shield-acceso-remoto-y-exposición) — usa Tailscale o Cloudflare Tunnel en su lugar.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :computer: Plataformas compatibles

| Plataforma | Estado | Notas |
|----------|--------|-------|
| Linux (amd64) | ✅ Totalmente compatible | Rendimiento nativo, recomendado |
| Linux (arm64) | ✅ Totalmente compatible | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Totalmente compatible | Apple Silicon e Intel a traves de Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Totalmente compatible | Requiere backend WSL2 |
| Synology / QNAP NAS | ✅ Totalmente compatible | Usa `CHOKIDAR_USEPOLLING=true` para montajes SMB |
| Kubernetes | 🔜 Proximo | Chart de Helm planificado |

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :star2: Por que HolyClaude

Construi esto porque estaba cansado de repetir la misma configuracion cada vez. Instalar Claude Code, conectar una interfaz web, configurar Chromium en Docker, solucionar problemas de permisos, depurar la supervision de procesos. Siempre lo mismo.

Asi que hice un contenedor que lo hace todo. Y luego encontre cada error posible para que tu no tengas que hacerlo.

| | HolyClaude | Hacerlo tu mismo |
|---|---|---|
| **Configuracion** | 30 segundos | 1-2 horas (si todo va bien) |
| **Claude Code** | Pre-instalado, pre-configurado, listo | Instalar, configurar, depurar el instalador colgado, arreglar WORKDIR |
| **Interfaz web** | CloudCLI incluido con plugins | Buscar una interfaz web, instalarla, configurarla, conectarla a Claude |
| **Navegador headless** | Chromium + Xvfb + Playwright, configurado | Instalar Chromium, instalar Xvfb, configurar display :99, arreglar shm, arreglar sandbox, arreglar seccomp... |
| **CLIs de IA** | 8 proveedores, un contenedor | Instalar cada uno por separado en 3 gestores de paquetes |
| **Herramientas de dev** | Mas de 50 herramientas, listas | `apt-get install` / `npm i -g` / `pip install` durante la proxima hora |
| **Gestion de procesos** | s6-overlay (reinicio automatico, apagado elegante) | Escribir tu propia configuracion de supervisord o confiar en que el reinicio de Docker funcione |
| **Persistencia** | Bind mounts, las credenciales sobreviven todo | Descifrar los volumenes de Docker, depurar "por que esto es un directorio y no un archivo" |
| **Actualizaciones** | `docker pull && docker compose up -d` | Actualizar 50 herramientas manualmente, rezar para que nada se rompa |
| **Multi-arquitectura** | AMD64 + ARM64 | Rezar para que tu Dockerfile compile en ARM |

**La ultima fila de cada configuracion manual es "funciona en mi maquina."** HolyClaude funciona en todas las maquinas.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :credit_card: Suscripcion y autenticacion

HolyClaude ejecuta el **CLI oficial de Claude Code** de Anthropic. Tu cuenta existente funciona desde el primer momento.

### Lo que funciona:

| Metodo de autenticacion | Como | Costo |
|----------------------|-----|------|
| **Plan Claude Max/Pro** (suscripcion) | Inicia sesion a traves de la interfaz web de CloudCLI, el mismo flujo OAuth que en el escritorio | Tu suscripcion existente, sin cargo adicional |
| **Clave de API de Anthropic** | Pega tu clave de API en la interfaz web | Pago por uso, la misma facturacion de Anthropic |

### Lo que no funciona:

| | Por que |
|---|---|
| Clave de API de OpenAI para Claude | Empresa diferente, API diferente. Las claves de OpenAI funcionan con el **Codex CLI** (tambien pre-instalado) |

> **Suscriptores de ChatGPT Plus/Pro:** Tu suscripcion funciona con el **Codex CLI**. Ejecuta `codex login --device-auth` dentro del contenedor para autenticarte con tu cuenta de ChatGPT.

### Otros CLIs de IA incluidos:

| CLI | Lo que necesitas |
|-----|--------------|
| Gemini CLI | Clave de API de Google AI (`GEMINI_API_KEY`) |
| OpenAI Codex | Clave de API de OpenAI (`OPENAI_API_KEY`) o suscripcion ChatGPT Plus/Pro (`codex login --device-auth`) |
| Cursor | Clave de API de Cursor (`CURSOR_API_KEY`) |
| TaskMaster AI | Usa las claves de tu proveedor de IA (Anthropic, OpenAI, etc.) |
| Junie | Cuenta de JetBrains (suscripcion JetBrains AI) |
| OpenCode | Configurar via TUI de `opencode` (admite OpenRouter y multiples proveedores) |
| Pi Coding Agent | Configurar mediante `pi` (admite multiples proveedores) |

> **HolyClaude es gratuito y de codigo abierto.** Solo pagas a tus proveedores de IA por el uso, igual que ya lo haces. No hacemos proxy, no interceptamos ni tocamos tus credenciales. Viven en tu bind mount local.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :package: Variantes de imagen

Dos sabores. La misma calidad. Elige tu categoria de peso.

| Etiqueta | Lo que obtienes | Mejor para |
|-----|-------------|----------|
| **`latest`** | Todo pre-instalado: cada herramienta, cada libreria, cada CLI | La mayoria de usuarios. Sin tiempo de espera. Claude nunca tiene que detenerse a instalar algo. |
| **`slim`** | Solo las herramientas principales — Claude instala extras bajo demanda | VPS pequeno, disco limitado, ancho de banda medido |
| `X.Y.Z` | Imagen completa, version fijada | Estabilidad en produccion — tu controlas cuando actualizar |
| `X.Y.Z-slim` | Imagen slim, version fijada | Produccion + huella pequena |

```bash
# Completa — baterias incluidas (recomendada)
docker pull coderluii/holyclaude

# Slim — ligera y rapida
docker pull coderluii/holyclaude:slim
```

> **`latest` es siempre la imagen completa.** Usuarios de slim: no te preocupes — cuando le pides a Claude que haga algo que necesita una herramienta que falta, la instala en segundos. Obtienes las mismas capacidades, solo con una descarga inicial mas pequena.
>
> Docker Hub muestra el tamaño comprimido de descarga: `latest` ronda los 4.1 GB y `slim` ronda los 2.4 GB. Docker, Synology Container Manager y los sistemas de archivos NAS pueden mostrar un tamaño mayor después de extraer las capas.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :whale: Docker Compose — Rapido

La plantilla "solo quiero que funcione". Copia este bloque completo en un archivo `docker-compose.yaml`:

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

Luego:

```bash
docker compose up -d
```

Abre `http://localhost:3001`. Crea una cuenta de CloudCLI. Inicia sesion con tu cuenta de Anthropic. Construye algo.

**Eso es toda la configuracion. Ya terminaste.**

> **¿Por que estas capacidades del navegador?** Este lanzamiento conserva el perfil actual de navegador de HolyClaude. `SYS_ADMIN` y `seccomp=unconfined` amplian privilegios de proceso y reducen el aislamiento; `SYS_PTRACE` es para depuracion. Mantén este perfil tal como está para v1.5.0 y trata el endurecimiento como un cambio aparte.

> **¿Por que `shm_size: 2g`?** Docker otorga a los contenedores 64MB de memoria compartida por defecto. HolyClaude conserva 2GB como el valor predeterminado retenido para este lanzamiento porque Chromium usa `/dev/shm` intensamente para el renderizado de pestanas. Con 64MB, las pestanas se cuelgan; si el navegador se usa mucho, subelo a 4GB.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :whale2: Docker Compose — Completo

La misma imagen, con cada opcion expuesta. Copia este bloque completo en un archivo `docker-compose.yaml`:

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

Luego:

```bash
docker compose up -d
```

Si quieres cambiar el puerto del lado del host o las rutas de bind-mount sin editar compose, copia `.env.example` a `.env` y configura:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Estos valores los lee Docker Compose en el host. No son variables de entorno del contenedor.

### Lo que controla cada seccion:

| Seccion | Lo que hace | Cuando cambiarlo |
|---------|-------------|-------------------|
| **Zona horaria** | Reloj del contenedor | Siempre — establece tu zona horaria local |
| **Rendimiento** | Limite de memoria de Node.js | Solo si encuentras errores OOM en proyectos grandes |
| **Mapeo de usuario** | Permisos de archivo entre contenedor y host | Si obtienes "permission denied" (`id -u` e `id -g` en tu host) |
| **SMB/CIFS** | Modo de sondeo del observador de archivos | Solo si tus volumenes estan en un NAS o recurso compartido de red |
| **Notificaciones** | Alertas push via Apprise (Discord, Telegram, Slack, Email, mas de 100 servicios) | Si quieres alejarte y saber cuando Claude ha terminado |
| **Proveedores de IA** | Claves de API para Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Si quieres usar CLIs de IA distintos de Claude |

> **Absolutamente todas las variables de entorno son opcionales.** El contenedor funciona perfectamente con solo `TZ=UTC`. Todo lo demas tiene valores predeterminados sensatos o se gestiona a traves de la interfaz web.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :wrench: Variables de entorno

La referencia completa. Cada variable, su valor predeterminado y lo que hace.

| Variable | Predeterminado | Lo que hace |
|----------|---------|--------------|
| `TZ` | `UTC` | Zona horaria del contenedor |
| `PUID` | `1000` | ID de usuario del contenedor para remapeo Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | ID de grupo del contenedor para remapeo Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Limite de memoria del heap de Node.js en MB |
| `GIT_USER_NAME` | `HolyClaude User` | Autor de commit de Git (se establece una vez en el primer arranque) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Email de commit de Git (se establece una vez en el primer arranque) |
| `CHOKIDAR_USEPOLLING` | *(no definido)* | Establece en `1` para SMB/CIFS — activa observadores de archivos por sondeo |
| `WATCHFILES_FORCE_POLLING` | *(no definido)* | Establece en `true` para SMB/CIFS — activa sondeo de Python |
| `NOTIFY_DISCORD` | *(no definido)* | URL de webhook de Discord para notificaciones |
| `NOTIFY_TELEGRAM` | *(no definido)* | URL del bot de Telegram para notificaciones |
| `NOTIFY_PUSHOVER` | *(no definido)* | URL de Pushover para notificaciones |
| `NOTIFY_SLACK` | *(no definido)* | URL de webhook de Slack para notificaciones |
| `NOTIFY_EMAIL` | *(no definido)* | URL de email (SMTP) para notificaciones |
| `NOTIFY_GOTIFY` | *(no definido)* | URL de Gotify para notificaciones |
| `NOTIFY_URLS` | *(no definido)* | Comodin — [URLs de Apprise](https://github.com/caronc/apprise/wiki) separadas por comas |
| `ANTHROPIC_API_KEY` | *(no definido)* | Clave de API de Anthropic (alternativa al OAuth de la interfaz web) |
| `ANTHROPIC_AUTH_TOKEN` | *(no definido)* | Token de autenticacion de Anthropic (alternativa a la clave de API) |
| `ANTHROPIC_BASE_URL` | *(no definido)* | Endpoint personalizado de la API de Anthropic (proxies, despliegues privados) |
| `CLAUDE_CODE_USE_BEDROCK` | *(no definido)* | Establece en `1` para usar el backend de Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | *(no definido)* | Establece en `1` para usar el backend de Google Vertex AI |
| `GEMINI_API_KEY` | *(no definido)* | Clave de API de Google Gemini |
| `OPENAI_API_KEY` | *(no definido)* | Clave de API de OpenAI (para Codex CLI, o usa `codex login --device-auth` para suscripcion de ChatGPT) |
| `CURSOR_API_KEY` | *(no definido)* | Clave de API de Cursor |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Configuracion global opcional de skills de Desloppify. Valido: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` o subconjuntos separados por comas |
| `OLLAMA_HOST` | *(no definido)* | URL del endpoint de Ollama (ej., `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :rocket: Que hay dentro

Este no es un contenedor minimalista. Es una estacion de trabajo de desarrollo completa.

### Ambas variantes (full + slim)

<details>
<summary><strong>Node.js 26 + paquetes globales de npm</strong></summary>

| Paquete | Para que sirve |
|---------|---------------|
| `typescript`, `tsx` | Compilacion y ejecucion de TypeScript |
| `pnpm` | Gestor de paquetes rapido y eficiente en disco |
| `vite`, `esbuild` | Herramientas de compilacion ultrarapidas |
| `eslint`, `prettier` | Calidad de codigo y formato |
| `serve`, `nodemon` | Servidor de archivos estaticos, servidor de dev con reinicio automatico |
| `concurrently` | Ejecutar multiples scripts en paralelo |
| `dotenv-cli` | Cargar variables de entorno desde archivos `.env` |

</details>

<details>
<summary><strong>Paquetes de Python 3</strong></summary>

| Paquete | Para que sirve |
|---------|---------------|
| `requests`, `httpx` | Clientes HTTP |
| `beautifulsoup4`, `lxml` | Web scraping y analisis de HTML |
| `Pillow` | Procesamiento de imagenes (pre-compilado — sin esperas) |
| `pandas`, `numpy` | Manipulacion de datos (pre-compilados — en serio, no quieres hacer pip install de estos en tiempo de ejecucion) |
| `openpyxl` | Leer/escribir archivos Excel |
| `python-docx` | Leer/escribir documentos Word |
| `jinja2`, `markdown` | Plantillas y renderizado de markdown |
| `pyyaml`, `python-dotenv` | Analisis de archivos de configuracion |
| `rich`, `click`, `tqdm` | CLIs elegantes y barras de progreso |
| `desloppify`, `bandit`, `tree-sitter` | Escaneos de calidad de codigo, checks de seguridad Python, analisis de codigo con parser |
| `playwright` | Automatizacion de navegador (Chromium ya configurado y listo) |

</details>

<details>
<summary><strong>Herramientas del sistema</strong></summary>

| Herramienta | Para que sirve |
|------|---------------|
| `git`, `gh` | Control de versiones + GitHub CLI (PRs, issues, releases desde la terminal) |
| `ripgrep` (`rg`), `fd`, `fzf` | Busqueda ultrarapida — Claude los usa constantemente |
| `bat`, `tree`, `jq` | Mejor cat (resaltado de sintaxis), arboles de directorios, procesamiento de JSON |
| `curl`, `wget` | Descargas HTTP |
| `tmux` | Multiplexor de terminal — ejecuta cosas en segundo plano |
| `htop`, `lsof`, `strace` | Monitorizacion de procesos y depuracion |
| `imagemagick` | Conversion de imagenes (`convert`, `identify`, `mogrify`) |
| `chromium` | Navegador headless — capturas de pantalla, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Conectarse a bases de datos directamente |
| `openssh-client`, `openssh-server`, `mosh` | SSH de salida y acceso SSH/Mosh opcional al contenedor |

</details>

<details>
<summary><strong>CLIs de IA — cada proveedor principal</strong></summary>

| CLI | Comando | Para que sirve |
|-----|---------|---------------|
| **Claude Code** | `claude` | El evento principal — estas ejecutandote dentro de este |
| **Gemini CLI** | `gemini` | El agente de codificacion de IA de Google |
| **OpenAI Codex** | `codex` | El agente de codificacion de OpenAI |
| **Cursor** | `cursor` | El agente de IA de Cursor |
| **TaskMaster AI** | `task-master` | Planificacion y orquestacion de tareas |
| **Junie** | `junie` | El agente de codificacion de IA de JetBrains |
| **OpenCode** | `opencode` | Agente de IA de codigo abierto (OpenRouter y multiples proveedores) |
| **Pi Coding Agent** | `pi` | Harness de agente minimalista (multiples proveedores) |

Ocho CLIs de IA. Un contenedor. Cambia entre ellos al instante. Ninguna otra imagen Docker hace esto.

</details>

### Solo imagen completa (paquetes adicionales)

La imagen completa incluye todo lo anterior, mas:

<details>
<summary><strong>Paquetes adicionales de npm — despliegue, ORMs, rendimiento</strong></summary>

| Paquete | Para que sirve |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Despliegue en Cloudflare Workers |
| `vercel` | Despliegue en Vercel |
| `netlify-cli` | Despliegue en Netlify |
| `az` | CLI de Azure para despliegue y gestion en la nube |
| `prisma`, `drizzle-kit` | Los dos ORMs mas populares de Node.js |
| `pm2` | Gestor de procesos para produccion |
| `eas-cli` | Compilaciones de Expo / React Native |
| `lighthouse`, `@lhci/cli` | Auditoria de rendimiento (Chromium ya esta disponible) |
| `sharp-cli` | CLI de procesamiento de imagenes |
| `json-server`, `http-server` | APIs REST simuladas, servicio de archivos estaticos |
| `@marp-team/marp-cli` | Markdown a diapositivas de presentacion |

</details>

<details>
<summary><strong>Paquetes adicionales de Python — PDFs, visualizacion de datos, frameworks web</strong></summary>

| Paquete | Para que sirve |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Cada libreria PDF importante. Generalos, leelos, conviertelos, unelos. |
| `xlsxwriter`, `xlrd` | Formatos Excel mas alla de lo que cubre openpyxl |
| `matplotlib`, `seaborn` | Visualizacion de datos y graficos |
| `python-pptx` | Generacion de PowerPoint |
| `fastapi`, `uvicorn` | Framework web de Python |

</details>

<details>
<summary><strong>Paquetes adicionales del sistema — multimedia, documentos</strong></summary>

| Paquete | Para que sirve |
|---------|---------------|
| `pandoc` | Convertir entre cualquier formato de documento (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Procesamiento de video y audio (extraer, convertir, transcodificar) |
| `libvips-dev` | Libreria de procesamiento de imagenes de alto rendimiento |

</details>

> **Usuarios de slim:** ¿Falta un paquete? Preguntale a Claude. Instala paquetes npm/pip en segundos. Los paquetes del sistema (pandoc, ffmpeg) tardan 1-2 minutos. Obtienes las mismas capacidades — la imagen completa simplemente tiene cero tiempo de espera.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :robot: Proveedores de CLI de IA

Ocho CLIs de IA. Un contenedor. Ninguna otra imagen Docker te da esto.

| Proveedor | Comando | Como autenticarse | ¿Funciona con suscripcion? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | Interfaz web de CloudCLI (OAuth) | **Si** — plan Max/Pro o clave de API |
| **Gemini CLI** | `gemini` | Variable de entorno `GEMINI_API_KEY` | Clave de API (pago por uso) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` o `codex login --device-auth` | **Si** — ChatGPT Plus/Pro/Team/Enterprise o clave de API |
| **Cursor** | `cursor` | Variable de entorno `CURSOR_API_KEY` | Clave de API |
| **TaskMaster AI** | `task-master` | Usa las claves de proveedor de IA existentes | Funciona con las claves configuradas |
| **Junie** | `junie` | Suscripcion JetBrains AI | Se requiere cuenta de JetBrains |
| **OpenCode** | `opencode` | Configurar via TUI | Admite OpenRouter y multiples proveedores; solo full image |
| **Pi Coding Agent** | `pi` | Configurar mediante Pi | Admite multiples proveedores |

> Claude Code es el CLI principal. Los demas estan ahi porque a veces quieres una segunda opinion, o las fortalezas de un modelo especifico, o estas comparando resultados. Tenerlos todos a un `Tab` de distancia es todo el punto.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :mag: Desloppify

Desloppify viene en ambas imagenes como el comando `desloppify`. Por defecto es pasivo: HolyClaude no ejecuta escaneos, no crea `.desloppify/`, no edita `.gitignore` y no cambia workspaces montados salvo que ejecutes Desloppify tu mismo.

```bash
desloppify scan --path .
desloppify next
```

Despues de escanear un proyecto, agrega `.desloppify/` al `.gitignore` de ese proyecto.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` solo desactiva la configuracion global automatica de skills; la CLI sigue instalada. `all` significa `claude,codex,gemini`. `opencode` es solo para la imagen full y no se incluye en `all`. No combines `claude` y `opencode` automaticamente, porque OpenCode tambien puede descubrir skills compatibles con Claude desde `~/.claude/skills`.

Targets manuales soportados por upstream: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :llama: Usar Ollama

HolyClaude funciona con [Ollama](https://ollama.com) como alternativa a una suscripcion de Anthropic. Configura dos variables de entorno y usa modelos locales o en la nube.

Consulta la guia de configuracion completa: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :building_construction: Arquitectura

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

### Como encajan las piezas

1. **El contenedor arranca** — `entrypoint.sh` se ejecuta como root. Reasigna UID/GID para que coincidan con tu usuario del host, restaura la sesion guardada de Claude Code antes de que bootstrap la toque y comprueba si es el primer arranque.

2. **Solo el primer arranque** — `bootstrap.sh` se ejecuta una vez. Copia la configuracion predeterminada, la plantilla de memoria, configura la identidad de git. Crea un archivo centinela (`.holyclaude-bootstrapped`) para que nunca vuelva a ejecutarse. Tus personalizaciones estan a salvo desde ese momento.

3. **s6-overlay toma el control como PID 1** — Esto no es supervisord. Es [s6-overlay](https://github.com/just-containers/s6-overlay), creado especificamente para Docker. Supervisa CloudCLI, Xvfb y la sincronizacion de sesion Claude. Reinicia automaticamente en caso de crash. Reenvía senales. Elimina procesos zombie. Se apaga con elegancia.

4. **CloudCLI sirve la interfaz web** — Puerto 3001. Interfaz basada en navegador para Claude Code con gestion de proyectos, multiples sesiones y plugins (estadisticas de proyecto + terminal web incluidos).

5. **Xvfb proporciona una pantalla de compatibilidad** — Xvfb sigue disponible en `:99` para las herramientas que usan una pantalla visible. Chromium headless moderno, Playwright y Lighthouse no requieren Xvfb en todos los casos.

Consulta [docs/architecture.md](docs/architecture.md) para el analisis tecnico completo, incluido por que elegimos s6 sobre supervisord, por que los plugins estan integrados en la imagen y por que `runuser` en lugar de `su`.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :file_folder: Estructura del proyecto

```
holyclaude/
├── .github/                 # Flujos de trabajo CI/CD, plantillas de issues y PRs
│   ├── FUNDING.yml          # Enlaces de patrocinio/donacion
│   ├── ISSUE_TEMPLATE/      # Reporte de bugs, solicitud de funciones, solicitud de paquetes
│   ├── pull_request_template.md
│   ├── SECURITY.md          # Politica de seguridad
│   └── workflows/           # Automatizacion de compilacion y publicacion de Docker
├── assets/                  # Imagenes de logo y banner
├── config/                  # Configuracion de Claude Code
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # Documentacion extendida
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # Scripts del ciclo de vida del contenedor
│   ├── bootstrap.sh         # Configuracion del primer arranque
│   ├── entrypoint.sh        # Punto de entrada del contenedor
│   └── notify.py            # Asistente de notificaciones (Apprise)
├── s6-overlay/              # Supervision de procesos (servicios s6-rc)
├── Dockerfile               # Compilacion de una sola etapa
├── docker-compose.yaml      # Inicio rapido (configuracion minima)
├── docker-compose.full.yaml # Configuracion completa (todas las opciones)
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :floppy_disk: Datos y persistencia

| Que | Donde (contenedor) | Donde (host) | ¿Sobrevive reconstruccion? |
|------|-------------------|-------------|-------------------|
| Configuracion, credenciales, claves de API | `/home/claude/.claude` | `./data/claude` | **Si** |
| Sesion de Claude Code (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Si** |
| Tu codigo y proyectos | `/workspace` | `./workspace` | **Si** |
| Cuenta de CloudCLI | `/home/claude/.cloudcli` | *(solo en el contenedor por defecto — ver abajo)* | No (opt-in disponible) |

HolyClaude restaura la sesion guardada de Claude Code antes de que el arranque pueda crear un archivo por defecto nuevo. Asi los rebuilds y recreates no reemplazan una sesion OAuth/API real con estado de onboarding.

### Lo que sobrevive `docker compose down && docker compose up`:
- Tu autenticacion de Anthropic y claves de API
- Configuracion y memoria de Claude Code (`CLAUDE.md`) y sesion OAuth (sin volver a iniciar sesion)
- Todo tu codigo en `./workspace`
- Configuracion de Git
- Auth de Codex, Gemini y Cursor CLI (desde v1.1.7)

### Lo que tendras que repetir (10 segundos):
- Cuenta web de CloudCLI — registro rapido, eso es todo (a menos que actives la persistencia abajo)

### Volver a activar la configuracion del primer arranque:
```bash
# Elimina el archivo centinela — NO toda la carpeta
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Nunca elimines `./data/claude/` por completo.** Ahi es donde viven tus credenciales. Elimina el archivo centinela si quieres un bootstrap nuevo. Elimina archivos de configuracion especificos si quieres restablecer ajustes. Pero nunca borres toda la carpeta.

### Persistir la cuenta de CloudCLI (opcional, solo almacenamiento local)

Por defecto, la base de datos de la cuenta de CloudCLI (`~/.cloudcli`) es local al contenedor y se borra al reconstruir. Volver a crear la cuenta tarda 10 segundos, asi que la mayoria de la gente lo deja asi.

Si quieres que sobreviva a las reconstrucciones, agrega un **named Docker volume** a tu compose file:

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

> **NO hagas bind-mount de `./data/cloudcli` en un recurso compartido de red (NAS, SMB/CIFS, NFS).** CloudCLI almacena su cuenta en SQLite, y el bloqueo de archivos de SQLite falla en montajes de red. Tendras errores de `database is locked` constantemente. Los named volumes viven en el sistema de archivos local del motor Docker, por eso esto funciona — los bind mounts apuntando a un NAS no funcionaran.

Un bind mount a una ruta SSD local tambien esta bien, solo mantelo fuera de cualquier recurso compartido de red.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :lock: Permisos

Claude Code se ejecuta en modo **`acceptEdits`** por defecto. Esta es la configuracion incluida en la imagen:

| Accion | ¿Permitido? |
|--------|----------|
| Leer archivos | Si |
| Editar / crear archivos | Si |
| Ejecutar comandos de shell | **Te pregunta primero** |
| Instalar paquetes | **Te pregunta primero** |

### ¿Quieres omision total? (usuarios avanzados)

Asi es como yo personalmente lo ejecuto. Edita `./data/claude/settings.json` en tu host:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **El modo de omision significa que Claude ejecuta comandos sin confirmacion.** Es potente, pero tambien puede ejecutar comandos destructivos rapidamente. Mantén el valor incluido `acceptEdits` salvo que confies en el workspace y en cada prompt.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :shield: Acceso remoto y exposición

HolyClaude vincula CloudCLI al puerto `3001`. Por defecto eso es solo local — perfecto para ejecutar en tu laptop o un servidor domestico al que accedes por SSH.

**En el momento en que quieras acceder desde fuera de tu red, lee esta seccion.**

### No hagas port-forward a la internet publica

Lo digo directamente: no abras un agujero en tu router y expongas `3001` a la internet abierta. Ni siquiera con contrasena. Por que:

- CloudCLI expone una shell completa a traves del plugin de terminal web
- Puede ejecutar codigo arbitrario, instalar paquetes y leer/escribir todo tu `/workspace`
- Guarda tus tokens OAuth de Anthropic y claves de API
- Las contrasenas de autenticacion basica se rompen por fuerza bruta, relleno de credenciales y se extraen de los logs
- Una contrasena filtrada = alguien mas tiene una instancia de Claude Code de pago corriendo en tu maquina con tu dinero

Una contrasena es un reductor de velocidad, no una puerta. Trata HolyClaude como tratarias una sesion SSH: nunca en la internet abierta sin un tunel adecuado delante.

### Usa un tunel adecuado en su lugar

Estas son las dos opciones que realmente recomiendo:

| Opcion | Para quien es | Por que |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Uso personal, equipos pequenos | VPN mesh WireGuard. Instala Tailscale en tu servidor + tu laptop/telefono, y accedes a `http://holyclaude:3001` desde cualquier lugar como si estuvieras en la LAN. Sin puertos abiertos, sin DNS, sin certificados. Gratis para uso personal. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Compartir con otros, hostname publico | Cloudflare proxea la conexion, asi que el puerto `3001` permanece cerrado. Obtienes un dominio real con HTTPS, y puedes poner Cloudflare Access (Google/GitHub SSO) delante. El nivel gratuito cubre la mayoria del uso personal. |

Ambos te dan:
- Cero puertos abiertos en tu router
- Transporte cifrado de extremo a extremo
- Autenticacion real basada en identidad (no una contrasena compartida)
- Registros de auditoria

### Si insistes en exponerlo directamente (por favor no lo hagas)

Si absolutamente tienes que saltarte el tunel (tutorial de self-hosting, red de laboratorio aislada, lo que sea), como minimo absoluto:

1. **Pon un reverse proxy delante** (Caddy, nginx, Traefik) con TLS real
2. **Agrega allowlisting de IP** a nivel de firewall o proxy — solo tus IPs conocidas
3. **Mantén el valor incluido `acceptEdits`**, salvo que tengas una razon clara para usar `bypassPermissions`
4. **Rota tus credenciales de Anthropic** si algo parece raro
5. **Ejecuta detras de Cloudflare Access o SSO similar**, no autenticacion basica

Incluso con todo eso, la superficie de riesgo es enorme. Usa Tailscale o Cloudflare Tunnel. Son gratuitos, tardan cinco minutos en configurarse, y son lo que yo uso personalmente.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :bell: Notificaciones

Alejate de tu computadora y enterate cuando Claude haya terminado. Usa [Apprise](https://github.com/caronc/apprise) para las notificaciones, compatible con mas de 100 servicios incluyendo Discord, Telegram, Slack, Email, Pushover, Gotify y mas.

**Para activar:**
1. Agrega una o mas variables `NOTIFY_*` al `environment` de tu compose:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Dentro del contenedor: `touch ~/.claude/notify-on`

Consulta la [documentacion de configuracion](docs/configuration.md#notifications-apprise) para todas las variables admitidas y formatos de URL.

**Para desactivar:** `rm ~/.claude/notify-on`

**Eventos que activan notificaciones:**
| Evento | Que ocurrio |
|-------|--------------|
| `stop` | Claude termino la tarea actual |
| `error` | Se produjo un error en el uso de una herramienta |

> Completamente silencioso cuando no esta configurado. ¿No hay variables `NOTIFY_*`? ¿No hay archivo de bandera? Cero llamadas de red. Cero spam en los logs. Cero sobrecarga.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :arrows_counterclockwise: Actualizar

```bash
# Descargar la ultima imagen
docker compose pull

# Recrear el contenedor con la nueva imagen
docker compose up -d
```

Tus datos persisten en `./data/claude` y `./workspace` — actualizar solo reemplaza el contenedor, no tus archivos.

No ejecutes `cloudcli update` ni `npm install -g @cloudcli-ai/cloudcli@latest` dentro del contenedor. HolyClaude incluye un runtime CloudCLI parcheado; actualiza con `docker compose pull && docker compose up -d`.

Para fijar una version especifica en lugar de `latest`:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :construction: Solucion de problemas

<details>
<summary><strong>CloudCLI muestra el directorio predeterminado incorrecto</strong></summary>

CloudCLI abre en `/home/claude` en lugar de `/workspace`.

**Causa:** Un script de servicio CloudCLI personalizado o modificado no definio `WORKSPACES_ROOT=/workspace` antes de iniciar CloudCLI.

**Solucion:** Ya esta gestionado en HolyClaude. El script de ejecucion de s6 establece `WORKSPACES_ROOT=/workspace` directamente en el entorno del proceso.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Causa:** Bases de datos SQLite en montajes de red SMB/CIFS. CIFS no admite el bloqueo de archivos a nivel que SQLite requiere.

**Solucion:** No almacenes bases de datos SQLite en recursos compartidos de red. HolyClaude mantiene `.cloudcli` en almacenamiento local del contenedor precisamente por esta razon. Si tienes tus propias bases de datos SQLite en `/workspace` en un NAS, muevedlas a una ruta local.
</details>

<details>
<summary><strong>Chromium se cuelga / paginas en blanco / fallos de pestanas</strong></summary>

**Causa:** Memoria compartida insuficiente. Docker usa 64MB por defecto.

**Solucion:** Asegurate de tener `shm_size: 2g` en tu archivo compose. Para uso intensivo del navegador (muchas pestanas, paginas complejas), aumenta a `4g`.
</details>

<details>
<summary><strong>Los observadores de archivos no detectan cambios (hot reload roto)</strong></summary>

**Causa:** Los montajes de red SMB/CIFS no admiten `inotify`.

**Solucion:** Activa el sondeo en el entorno de tu compose:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Nota: El sondeo usa mas CPU que inotify. Activalo solo en montajes de red.
</details>

<details>
<summary><strong>Errores de permiso denegado</strong></summary>

**Causa:** El UID/GID del contenedor no coincide con la propiedad de los archivos del host.

**Solucion:**
```bash
# En tu maquina host
id -u  # → este es tu PUID
id -g  # → este es tu PGID
```
Establecelos en tu archivo compose:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker crea .claude.json como un directorio</strong></summary>

**Causa:** Si un archivo destino de bind-mount no existe antes de que el contenedor arranque, Docker amablemente lo crea como directorio. Gracias, Docker.

**Solucion:** Ya esta gestionado — `entrypoint.sh` restaura primero el archivo de sesion guardado o crea un archivo por defecto seguro cuando no existe una sesion guardada.
</details>

Consulta [docs/troubleshooting.md](docs/troubleshooting.md) para la guia completa, incluidos todos los problemas de SMB/CIFS y el historial completo de errores que encontramos y corregimos.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :warning: Problemas conocidos

Estos no son errores de HolyClaude — son problemas upstream o compromisos intencionales.

| Problema | Por que | Solucion alternativa |
|-------|-----|------------|
| Boton "Continue in Shell" roto | Error upstream de CloudCLI (condicion de carrera en la inicializacion del terminal) | Usa el plugin **Web Terminal** en su lugar (pre-instalado) |
| Cursor CLI "Command timeout" | Sin clave de API configurada — solo cosmético, no afecta nada | Establece `CURSOR_API_KEY` o ignoralo |
| Cuenta de CloudCLI perdida al reconstruir | SQLite no puede persistir en montajes de red — compromiso intencional | Vuelve a crear la cuenta (~10 segundos) |
| Notificaciones push web "not supported" | Limitacion del navegador en CloudCLI, comportamiento estandar | Usa las notificaciones de Apprise en su lugar (ver [Notificaciones](#bell-notificaciones)) |

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :hammer_and_wrench: Compilar localmente

¿Quieres compilar la imagen tu mismo en lugar de descargarla de Docker Hub? Adelante:

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

Luego usa `image: holyclaude` en lugar de `image: coderluii/holyclaude:latest` en tu archivo compose.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :bar_chart: Alternativas

¿Como se compara HolyClaude con otros enfoques?

| Enfoque | Interfaz web | Multi-IA | Herramientas pre-configuradas | Navegador headless | Configuracion con un comando | Persistencia |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | Mas de 50 herramientas | Chromium + Xvfb + Playwright | `docker compose up` | Bind mounts |
| Claude Code (bare metal) | No | No | Instalar tu mismo | Instalar tu mismo | Instalacion en varios pasos | Manual |
| Claude Code + oh-my-openagent | No | Si (multi-modelo) | Algunos | No | npm install | Manual |
| DIY Docker + Claude Code | Tal vez | Tal vez | Lo que anadas | Si lo configuras | Si escribes el Dockerfile | Si configuras los volumenes |
| Cursor IDE | Integrada | Solo Cursor | Incluida en el IDE | No | Descargar la aplicacion | Datos de la app |

HolyClaude no compite con los agentes de codificacion — es la **capa de infraestructura** que hace que todos funcionen mejor. Es el contenedor dentro del cual los ejecutas.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :rocket: Hoja de ruta

Lo que viene a continuacion:

| Estado | Funcion |
|--------|---------|
| 🔜 | **Compilaciones nativas para ARM** — imagenes ARM64 nativas optimizadas, no solo emuladas |
| 🔜 | **Integracion de tunel VS Code** — VS Code Server o tunel integrado para conectarse desde VS Code de escritorio |
| 🔜 | **Enrutamiento de notificaciones** — diferentes destinos de notificacion por tipo de evento (errores a Telegram, finalizaciones a Discord) |

¿Tienes una idea? [Inicia una discusion](https://github.com/CoderLuii/HolyClaude/discussions) o [solicita una funcion](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :trophy: Construido con HolyClaude

¿Usas HolyClaude para construir algo? Nos encantaria verlo.

Abre un issue con la etiqueta `showcase` o envia un PR para agregar tu proyecto aqui:

<!-- Add your project: [Project Name](url) — one-line description -->

*Se el primero en agregar tu proyecto aqui.*

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :handshake: Contribuir

Las contribuciones son bienvenidas. Este proyecto nacio del uso diario real, y mejora cuando mas personas lo usan y encuentran casos extremos.

1. Haz un fork
2. Crea una rama (`git checkout -b feature/algo`)
3. Haz commit
4. Haz push
5. Abre un PR

Bugs, solicitudes de funciones, preguntas: [abre un issue](https://github.com/CoderLuii/HolyClaude/issues).

### Contacto

| Canal | Usar para |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Preguntas, muestra tu configuracion, ideas |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Reportes de bugs, solicitudes de funciones y paquetes |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Reportes de vulnerabilidades (privado) |

### ¿Quieres que se agregue una herramienta?

Usa la plantilla de issue [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml). Incluye el nombre del paquete, el metodo de instalacion y que variante (full/slim) deberia ser el objetivo.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :heart: Apoyo

HolyClaude es gratuito, de codigo abierto y mantenido por un solo desarrollador que lo usa todos los dias.

Si te ahorro tiempo, aqui tienes como puedes ayudar:

- **Dale una estrella a este repo** — es lo mas importante que puedes hacer por la visibilidad
- **Compartelo** — díselo a un amigo, publícalo, tuitéalo
- **Abre issues** — los reportes de bugs y las solicitudes de funciones hacen que HolyClaude mejore para todos
- **Contribuye** — los PRs siempre son bienvenidos

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :scroll: Software de terceros

La imagen Docker de HolyClaude incluye software de terceros, cada uno bajo su propia licencia. Componentes destacados:

| Componente | Licencia | Fuente |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Consulta [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) para obtener detalles completos, incluidos los avisos de modificacion. El codigo fuente propio de HolyClaude esta bajo licencia MIT.

<p align="right">
  <a href="#top">↑ volver arriba</a>
</p>

---

## :page_facing_up: Licencia

MIT — consulta [LICENSE](LICENSE). Usalo como quieras.

<p align="right">
  <a href="#top">↑ volver arriba</a>
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

Construido por [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Este contenedor es lo que uso todos los dias. Si te ahorra aunque sea la mitad del tiempo de configuracion que me ahorro a mi, una estrella seria de agradecer.

</div>
