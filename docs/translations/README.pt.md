🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | **Português** | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Pare de configurar. Comece a construir.

Um comando. Estação de trabalho completa para desenvolvimento com IA. Claude Code, interface web, navegador headless, 8 CLIs de IA, mais de 50 ferramentas de desenvolvimento, tudo containerizado e pronto para uso.

**Você ia gastar 2 horas configurando isso manualmente. Ou pode simplesmente executar `docker compose up`.**

**Funciona com sua assinatura existente do Claude Code.** Plano Max/Pro, chave de API, seja o que for, funciona direto.

---

## O que é isso?

Você conhece a história. Você quer o Claude Code. Mas também quer ele no navegador. Com um navegador headless para capturas de tela e testes. Com o Playwright configurado. Com todos os CLIs de IA. Com TypeScript, Python, ferramentas de deploy, clientes de banco de dados, GitHub CLI.

Então você começa a instalar as coisas. Uma por uma. Aí o Chromium não inicia porque a memória compartilhada do Docker tem 64MB. Aí o Xvfb não está configurado. Aí o UID dentro do container não bate com o do host e tudo dá "permission denied". Aí você percebe que o instalador do Claude Code trava quando o WORKDIR pertence ao root. Aí o SQLite trava na montagem do seu NAS. Aí...

**HolyClaude é o container que eu construí depois de resolver cada um desses problemas.**

Venho usando isso diariamente no meu próprio servidor há semanas. Cada bug foi encontrado, diagnosticado e corrigido. Cada caso extremo foi tratado. Cada "por que isso não funciona no Docker" foi respondido.

Você puxa. Você executa. Você abre o navegador. Você constrói.

### :credit_card: Use Sua Assinatura Existente

**Isso executa o Claude Code CLI oficial.** Não é um wrapper. Não é um proxy. Não é uma cópia.

Sua conta Anthropic existente funciona diretamente:
- **Plano Claude Max/Pro** — autentique pela interface web (OAuth), igual ao Claude Code desktop
- **Chave de API Anthropic** — configure pela interface web, com o mesmo faturamento de sempre
- **Sem custo adicional** — HolyClaude é gratuito e open source. Você só paga à Anthropic pelo que usar, como já faz.

> HolyClaude não toca nas suas credenciais. Elas ficam armazenadas localmente no seu volume bind-mounted (`./data/claude/`), igual a como seria no metal puro.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## Índice

| | Seção |
|---|---|
| :zap: | [Início Rápido](#zap-quick-start) |
| :computer: | [Suporte a Plataformas](#computer-platform-support) |
| :star2: | [Por que HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Assinatura e Autenticação](#credit_card-subscription--authentication) |
| :package: | [Variantes de Imagem](#package-image-variants) |
| :whale: | [Docker Compose — Rápido](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Completo](#whale2-docker-compose--full) |
| :wrench: | [Variáveis de Ambiente](#wrench-environment-variables) |
| :rocket: | [O que tem dentro](#rocket-whats-inside) |
| :robot: | [Provedores de CLI de IA](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Usando Ollama](#llama-using-ollama) |
| :building_construction: | [Arquitetura](#building_construction-architecture) |
| :file_folder: | [Estrutura do Projeto](#file_folder-project-structure) |
| :floppy_disk: | [Dados e Persistência](#floppy_disk-data--persistence) |
| :lock: | [Permissões](#lock-permissions) |
| :shield: | [Acesso Remoto e Exposição](#shield-remote-access--exposure) |
| :bell: | [Notificações](#bell-notifications) |
| :arrows_counterclockwise: | [Atualizando](#arrows_counterclockwise-upgrading) |
| :construction: | [Solução de Problemas](#construction-troubleshooting) |
| :warning: | [Problemas Conhecidos](#warning-known-issues) |
| :hammer_and_wrench: | [Build Local](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Alternativas](#bar_chart-alternatives) |
| :rocket: | [Roadmap](#rocket-roadmap) |
| :trophy: | [Construído com HolyClaude](#trophy-built-with-holyclaude) |
| :handshake: | [Contribuindo](#handshake-contributing) |
| :heart: | [Suporte](#heart-support) |
| :scroll: | [Software de Terceiros](#scroll-third-party-software) |
| :page_facing_up: | [Licença](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :zap: Quick Start

**1.** Crie uma pasta para o HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Crie um arquivo `docker-compose.yaml`. Copie um dos templates abaixo:
- [Template rápido](#whale-docker-compose--quick) — mínimo, sem configuração, funciona direto
- [Template completo](#whale2-docker-compose--full) — todas as opções, totalmente documentado

**3.** Baixe e inicie:

```bash
docker compose up -d
```

**4.** Abra a interface web:

```
http://localhost:3001
```

**5.** Crie uma conta no CloudCLI (leva 10 segundos), entre com sua conta Anthropic e está no ar.

> Sem arquivos `.env`. Sem pré-configuração. Sem ler 40 páginas de documentação antes de começar. Simplesmente funciona.

> **Quer acessar de fora da sua rede?** Não faça port-forward. Veja [Acesso Remoto e Exposição](#shield-remote-access--exposure) — use Tailscale ou Cloudflare Tunnel.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :computer: Platform Support

| Plataforma | Status | Notas |
|----------|--------|-------|
| Linux (amd64) | ✅ Totalmente suportado | Performance nativa, recomendado |
| Linux (arm64) | ✅ Totalmente suportado | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Totalmente suportado | Apple Silicon e Intel via Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Totalmente suportado | Requer backend WSL2 |
| Synology / QNAP NAS | ✅ Totalmente suportado | Use `CHOKIDAR_USEPOLLING=true` para montagens SMB |
| Kubernetes | 🔜 Em breve | Helm chart planejado |

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :star2: Why HolyClaude

Eu construí isso porque estava cansado de refazer a mesma configuração toda vez. Instalar o Claude Code, conectar uma interface web, configurar o Chromium no Docker, corrigir problemas de permissão, depurar supervisão de processos. Toda vez.

Então criei um container que faz tudo isso. E depois encontrei cada bug possível para que você não precise.

| | HolyClaude | Fazendo você mesmo |
|---|---|---|
| **Configuração** | 30 segundos | 1-2 horas (se correr bem) |
| **Claude Code** | Pré-instalado, pré-configurado, pronto | Instale, configure, depure o travamento do instalador, corrija o WORKDIR |
| **Interface Web** | CloudCLI incluído com plugins | Encontre uma interface web, instale, configure, conecte ao Claude |
| **Navegador headless** | Chromium + Xvfb + Playwright, configurado | Instale o Chromium, instale o Xvfb, configure o display :99, corrija shm, corrija sandbox, corrija seccomp... |
| **CLIs de IA** | 8 provedores, um container | Instale cada um separadamente em 3 gerenciadores de pacotes |
| **Ferramentas de desenvolvimento** | Mais de 50 ferramentas, prontas | `apt-get install` / `npm i -g` / `pip install` pela próxima hora |
| **Gerenciamento de processos** | s6-overlay (reinicialização automática, desligamento gracioso) | Escreva sua própria configuração do supervisord ou torça para que o restart do Docker funcione |
| **Persistência** | Bind mounts, credenciais sobrevivem a tudo | Descubra os volumes do Docker, depure "por que isso é um diretório e não um arquivo" |
| **Atualizações** | `docker pull && docker compose up -d` | Atualize 50 ferramentas manualmente, torça para nada quebrar |
| **Multi-arquitetura** | AMD64 + ARM64 | Torça para seu Dockerfile compilar no ARM |

**A última linha de toda configuração manual é "funciona na minha máquina."** HolyClaude funciona em qualquer máquina.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude executa o **Claude Code CLI oficial** da Anthropic. Sua conta existente funciona imediatamente.

### O que funciona:

| Método de autenticação | Como | Custo |
|----------------------|-----|------|
| **Plano Claude Max/Pro** (assinatura) | Entre pela interface web do CloudCLI — mesmo fluxo OAuth do desktop | Sua assinatura existente, sem custo extra |
| **Chave de API Anthropic** | Cole sua chave de API na interface web | Pagamento por uso, mesmo faturamento Anthropic |

### O que não funciona:

| | Por que |
|---|---|
| Chave de API OpenAI para Claude | Empresa diferente, API diferente. Chaves OpenAI funcionam com o **Codex CLI** (também pré-instalado) |

> **Assinantes do ChatGPT Plus/Pro:** Sua assinatura funciona com o **Codex CLI**. Execute `codex login --device-auth` dentro do container para autenticar com sua conta ChatGPT.

### Outros CLIs de IA incluídos:

| CLI | O que você precisa |
|-----|--------------|
| Gemini CLI | Chave de API do Google AI (`GEMINI_API_KEY`) |
| OpenAI Codex | Chave de API OpenAI (`OPENAI_API_KEY`) ou assinatura ChatGPT Plus/Pro (`codex login --device-auth`) |
| Cursor | Chave de API Cursor (`CURSOR_API_KEY`) |
| TaskMaster AI | Usa suas chaves de provedor de IA (Anthropic, OpenAI, etc.) |
| Junie | Conta JetBrains (assinatura JetBrains AI) |
| OpenCode | Configure via TUI do `opencode` (suporta OpenRouter e múltiplos provedores) |
| Pi Coding Agent | Configure via `pi` (suporta múltiplos provedores) |

> **HolyClaude é gratuito e open source.** Você só paga aos seus provedores de IA pelo uso, como já faz. Não fazemos proxy, interceptação nem tocamos nas suas credenciais. Elas ficam no seu bind mount local.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :package: Image Variants

Dois sabores. Mesma qualidade. Escolha seu peso.

| Tag | O que você recebe | Melhor para |
|-----|-------------|----------|
| **`latest`** | Tudo pré-instalado, cada ferramenta, biblioteca e CLI | A maioria dos usuários. Zero tempo de espera. Claude nunca precisa parar para instalar algo. |
| **`slim`** | Ferramentas principais apenas, Claude instala extras sob demanda | VPS menor, disco limitado, banda medida |
| `X.Y.Z` | Imagem completa, versão fixada | Estabilidade em produção, você controla quando atualizar |
| `X.Y.Z-slim` | Imagem slim, versão fixada | Produção com footprint pequeno |

```bash
# Completa — baterias incluídas (recomendado)
docker pull coderluii/holyclaude

# Slim — enxuta e eficiente
docker pull coderluii/holyclaude:slim
```

> **`latest` é sempre a imagem completa.** Usuários slim: não se preocupe, quando você pede ao Claude para fazer algo que precisa de uma ferramenta ausente, ele instala em segundos. Você tem as mesmas capacidades, apenas com um download inicial menor.
>
> O Docker Hub mostra o tamanho comprimido de transferência: `latest` fica em torno de 4,1 GB e `slim` em torno de 2,4 GB. Docker, Synology Container Manager e filesystems de NAS podem mostrar um tamanho maior depois que as camadas são extraídas.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :whale: Docker Compose — Quick

O template "só quero que funcione". Copie este bloco inteiro para um arquivo `docker-compose.yaml`:

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

Depois:

```bash
docker compose up -d
```

Abra `http://localhost:3001`. Crie uma conta CloudCLI. Entre com sua conta Anthropic. Construa algo.

**Essa é toda a configuração. Você terminou.**

> **Por que estas capacidades do navegador?** Esta versão mantém o perfil atual de navegador do HolyClaude. `SYS_ADMIN` e `seccomp=unconfined` ampliam privilégios de processo e reduzem o isolamento; `SYS_PTRACE` é para depuração. Mantenha esse perfil como está para a v1.5.0 e trate o hardening como uma mudança separada.

> **Por que `shm_size: 2g`?** O Docker dá aos containers 64MB de memória compartilhada por padrão. O HolyClaude mantém 2GB como o padrão retido para esta versão porque o Chromium usa muito `/dev/shm` para renderização de abas. Com 64MB, as abas travam; se usar muito o navegador, suba para 4GB.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :whale2: Docker Compose — Full

Mesma imagem, cada parâmetro exposto. Copie este bloco inteiro para um arquivo `docker-compose.yaml`:

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

Depois:

```bash
docker compose up -d
```

Se você quiser alterar a porta do host ou os caminhos de bind-mount sem editar o compose, copie `.env.example` para `.env` e defina:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Esses valores são lidos pelo Docker Compose no host. Não são variáveis de ambiente do container.

### O que cada seção controla:

| Seção | O que faz | Quando alterar |
|---------|-------------|-------------------|
| **Timezone** | Relógio do container | Sempre, defina para seu TZ local |
| **Performance** | Limite de memória do Node.js | Somente se você tiver erros OOM em projetos grandes |
| **Mapeamento de usuário** | Permissões de arquivo entre container e host | Se você receber "permission denied" (`id -u` e `id -g` no seu host) |
| **SMB/CIFS** | Modo de polling do file watcher | Somente se seus volumes estiverem em NAS ou compartilhamento de rede |
| **Notificações** | Alertas push via Apprise (Discord, Telegram, Slack, Email, mais de 100 serviços) | Se você quiser se afastar e saber quando Claude terminar |
| **Provedores de IA** | Chaves de API para Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Se quiser usar CLIs de IA além do Claude |

> **Cada variável de ambiente é opcional.** O container funciona perfeitamente com apenas `TZ=UTC`. Todo o resto tem padrões sensatos ou é tratado pela interface web.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :wrench: Environment Variables

A referência completa. Cada variável, seu padrão e o que faz.

| Variável | Padrão | O que faz |
|----------|---------|--------------|
| `TZ` | `UTC` | Timezone do container |
| `PUID` | `1000` | ID de usuario do container para remapeamento Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | ID de grupo do container para remapeamento Docker; Podman rootless usa `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Limite de memória heap do Node.js em MB |
| `GIT_USER_NAME` | `HolyClaude User` | Autor do commit Git (definido uma vez na primeira inicialização) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Email do commit Git (definido uma vez na primeira inicialização) |
| `CHOKIDAR_USEPOLLING` | *(não definido)* | Defina como `1` para SMB/CIFS, habilita file watchers por polling |
| `WATCHFILES_FORCE_POLLING` | *(não definido)* | Defina como `true` para SMB/CIFS, habilita polling Python |
| `NOTIFY_DISCORD` | *(não definido)* | URL de webhook Discord para notificações |
| `NOTIFY_TELEGRAM` | *(não definido)* | URL do bot Telegram para notificações |
| `NOTIFY_PUSHOVER` | *(não definido)* | URL Pushover para notificações |
| `NOTIFY_SLACK` | *(não definido)* | URL de webhook Slack para notificações |
| `NOTIFY_EMAIL` | *(não definido)* | Email (SMTP) URL para notificações |
| `NOTIFY_GOTIFY` | *(não definido)* | URL Gotify para notificações |
| `NOTIFY_URLS` | *(não definido)* | Catch-all, [URLs Apprise](https://github.com/caronc/apprise/wiki) separadas por vírgula |
| `ANTHROPIC_API_KEY` | *(não definido)* | Chave de API Anthropic (alternativa ao OAuth da interface web) |
| `ANTHROPIC_AUTH_TOKEN` | *(não definido)* | Token de autenticação Anthropic (alternativa à chave de API) |
| `ANTHROPIC_BASE_URL` | *(não definido)* | Endpoint personalizado da API Anthropic (proxies, deployments privados) |
| `CLAUDE_CODE_USE_BEDROCK` | *(não definido)* | Defina como `1` para usar backend Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | *(não definido)* | Defina como `1` para usar backend Google Vertex AI |
| `GEMINI_API_KEY` | *(não definido)* | Chave de API Google Gemini |
| `OPENAI_API_KEY` | *(não definido)* | Chave de API OpenAI (para Codex CLI, ou use `codex login --device-auth` para assinatura ChatGPT) |
| `CURSOR_API_KEY` | *(não definido)* | Chave de API Cursor |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Configuracao global opcional de skills Desloppify. Valido: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` ou subconjuntos separados por virgula |
| `OLLAMA_HOST` | *(não definido)* | URL do endpoint Ollama (ex.: `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :rocket: What's Inside

Este não é um container mínimo. Esta é uma estação de trabalho de desenvolvimento completa.

### Ambas as variantes (full + slim)

<details>
<summary><strong>Node.js 26 + pacotes globais npm</strong></summary>

| Pacote | Para que serve |
|---------|---------------|
| `typescript`, `tsx` | Compilação e execução TypeScript |
| `pnpm` | Gerenciador de pacotes rápido e eficiente em disco |
| `vite`, `esbuild` | Ferramentas de build extremamente rápidas |
| `eslint`, `prettier` | Qualidade de código e formatação |
| `serve`, `nodemon` | Servidor de arquivos estáticos, servidor de desenvolvimento com reinicialização automática |
| `concurrently` | Executar múltiplos scripts em paralelo |
| `dotenv-cli` | Carregar variáveis de ambiente de arquivos `.env` |

</details>

<details>
<summary><strong>Pacotes Python 3</strong></summary>

| Pacote | Para que serve |
|---------|---------------|
| `requests`, `httpx` | Clientes HTTP |
| `beautifulsoup4`, `lxml` | Web scraping e parsing HTML |
| `Pillow` | Processamento de imagens (pré-compilado, sem espera) |
| `pandas`, `numpy` | Manipulação de dados (pré-compilado, sério, você não vai querer instalar com pip em tempo de execução) |
| `openpyxl` | Leitura/escrita de arquivos Excel |
| `python-docx` | Leitura/escrita de documentos Word |
| `jinja2`, `markdown` | Templating e renderização markdown |
| `pyyaml`, `python-dotenv` | Parsing de arquivos de configuração |
| `rich`, `click`, `tqdm` | CLIs bonitos e barras de progresso |
| `desloppify`, `bandit`, `tree-sitter` | Scans de qualidade de codigo, verificacoes de seguranca Python, analise de codigo com parser |
| `playwright` | Automação de navegador (Chromium já configurado e pronto) |

</details>

<details>
<summary><strong>Ferramentas de sistema</strong></summary>

| Ferramenta | Para que serve |
|------|---------------|
| `git`, `gh` | Controle de versão + GitHub CLI (PRs, issues, releases pelo terminal) |
| `ripgrep` (`rg`), `fd`, `fzf` | Busca extremamente rápida, Claude usa esses constantemente |
| `bat`, `tree`, `jq` | Cat melhorado (syntax highlighting), árvores de diretórios, processamento JSON |
| `curl`, `wget` | Downloads HTTP |
| `tmux` | Multiplexador de terminal, execute coisas em segundo plano |
| `htop`, `lsof`, `strace` | Monitoramento de processos e depuração |
| `imagemagick` | Conversão de imagens (`convert`, `identify`, `mogrify`) |
| `chromium` | Navegador headless, capturas de tela, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Acesso direto a bancos de dados |
| `openssh-client`, `openssh-server`, `mosh` | SSH de saída e acesso SSH/Mosh opcional ao contêiner |

</details>

<details>
<summary><strong>CLIs de IA, todos os principais provedores</strong></summary>

| CLI | Comando | Para que serve |
|-----|---------|---------------|
| **Claude Code** | `claude` | O evento principal, você está rodando dentro deste |
| **Gemini CLI** | `gemini` | Agente de codificação IA do Google |
| **OpenAI Codex** | `codex` | Agente de codificação da OpenAI |
| **Cursor** | `cursor` | Agente IA do Cursor |
| **TaskMaster AI** | `task-master` | Planejamento e orquestração de tarefas |
| **Junie** | `junie` | Agente de codificação IA da JetBrains |
| **OpenCode** | `opencode` | Agente IA open source (OpenRouter e múltiplos provedores) |
| **Pi Coding Agent** | `pi` | Harness de agente minimalista (múltiplos provedores) |

Oito CLIs de IA. Um container. Mude entre eles instantaneamente. Nenhuma outra imagem Docker faz isso.

</details>

### Somente imagem completa (pacotes adicionais)

A imagem completa inclui tudo acima, mais:

<details>
<summary><strong>Pacotes npm adicionais, deploy, ORMs, performance</strong></summary>

| Pacote | Para que serve |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Deploy no Cloudflare Workers |
| `vercel` | Deploy na Vercel |
| `netlify-cli` | Deploy na Netlify |
| `az` | Azure CLI para deploy e gerenciamento na nuvem |
| `prisma`, `drizzle-kit` | Os dois ORMs Node.js mais populares |
| `pm2` | Gerenciador de processos para produção |
| `eas-cli` | Builds Expo / React Native |
| `lighthouse`, `@lhci/cli` | Auditoria de performance (Chromium já está lá) |
| `sharp-cli` | CLI de processamento de imagens |
| `json-server`, `http-server` | APIs REST mock, servidor de arquivos estáticos |
| `@marp-team/marp-cli` | Markdown para slides de apresentação |

</details>

<details>
<summary><strong>Pacotes Python adicionais, PDFs, visualização de dados, frameworks web</strong></summary>

| Pacote | Para que serve |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Todas as principais bibliotecas PDF. Gere, leia, converta, mescle. |
| `xlsxwriter`, `xlrd` | Formatos Excel além do que o openpyxl cobre |
| `matplotlib`, `seaborn` | Visualização de dados e gráficos |
| `python-pptx` | Geração de PowerPoint |
| `fastapi`, `uvicorn` | Framework web Python |

</details>

<details>
<summary><strong>Pacotes de sistema adicionais, mídia e documentos</strong></summary>

| Pacote | Para que serve |
|---------|---------------|
| `pandoc` | Converta entre qualquer formato de documento (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Processamento de vídeo e áudio (extrair, converter, transcodificar) |
| `libvips-dev` | Biblioteca de processamento de imagens de alta performance |

</details>

> **Usuários slim:** Falta algum pacote? Pergunte ao Claude. Ele instala pacotes npm/pip em segundos. Pacotes de sistema (pandoc, ffmpeg) levam 1-2 minutos. Você tem as mesmas capacidades, a imagem completa apenas tem zero tempo de espera.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :robot: AI CLI Providers

Oito CLIs de IA. Um container. Nenhuma outra imagem Docker oferece isso.

| Provedor | Comando | Como autenticar | Assinatura funciona? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | Interface web CloudCLI (OAuth) | **Sim** — plano Max/Pro ou chave de API |
| **Gemini CLI** | `gemini` | Variável de ambiente `GEMINI_API_KEY` | Chave de API (pagamento por uso) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` ou `codex login --device-auth` | **Sim** — ChatGPT Plus/Pro/Team/Enterprise ou chave de API |
| **Cursor** | `cursor` | Variável de ambiente `CURSOR_API_KEY` | Chave de API |
| **TaskMaster AI** | `task-master` | Usa chaves de provedor de IA existentes | Funciona com chaves configuradas |
| **Junie** | `junie` | Assinatura JetBrains AI | Conta JetBrains obrigatória |
| **OpenCode** | `opencode` | Configure via TUI | Suporta OpenRouter e múltiplos provedores; somente full image |
| **Pi Coding Agent** | `pi` | Configure via Pi | Suporta múltiplos provedores |

> O Claude Code é o CLI principal. Os outros estão lá porque às vezes você quer uma segunda opinião, ou os pontos fortes de um modelo específico, ou está comparando resultados. Ter todos eles a um `Tab` de distância é o ponto central.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :mag: Desloppify

Desloppify vem nas duas imagens como o comando `desloppify`. Por padrao ele e passivo: HolyClaude nao executa scans, nao cria `.desloppify/`, nao edita `.gitignore` e nao altera workspaces montados a menos que voce rode Desloppify.

```bash
desloppify scan --path .
desloppify next
```

Depois de escanear um projeto, adicione `.desloppify/` ao `.gitignore` desse projeto.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` desativa apenas o setup global automatico de skills; a CLI continua instalada. `all` significa `claude,codex,gemini`. `opencode` e somente para a imagem full e nao entra em `all`. Nao combine `claude` e `opencode` no setup automatico, porque OpenCode tambem descobre skills compativeis com Claude em `~/.claude/skills`.

Targets upstream manuais: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :llama: Using Ollama

HolyClaude funciona com [Ollama](https://ollama.com) como alternativa a uma assinatura Anthropic. Defina duas variáveis de ambiente e use modelos locais ou na nuvem.

Veja o guia completo de configuração: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
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

### Como as peças se encaixam

1. **Container inicia** — `entrypoint.sh` executa como root. Remapeia UID/GID para corresponder ao usuário do host, restaura a sessão salva do Claude Code antes que o bootstrap possa tocá-la e verifica se é a primeira inicialização.

2. **Somente na primeira inicialização** — `bootstrap.sh` executa uma vez. Copia configurações padrão, template de memória, configura identidade git. Cria um arquivo sentinel (`.holyclaude-bootstrapped`) para nunca executar novamente. Suas customizações estão seguras a partir desse ponto.

3. **s6-overlay assume como PID 1** — Não é supervisord. É o [s6-overlay](https://github.com/just-containers/s6-overlay), construído especificamente para Docker. Supervisiona CloudCLI, Xvfb e a sincronização da sessão Claude. Reinicia automaticamente em caso de crash. Encaminha sinais. Recolhe processos zumbis. Desliga graciosamente.

4. **CloudCLI serve a interface web** — Porta 3001. Interface baseada em navegador para o Claude Code com gerenciamento de projetos, múltiplas sessões e plugins (estatísticas de projeto + terminal web incluídos).

5. **Xvfb fornece um display de compatibilidade** — O Xvfb continua disponível em `:99` para ferramentas que usam um display visível. Chromium headless moderno, Playwright e Lighthouse não exigem Xvfb em todos os casos.

Veja [docs/architecture.md](docs/architecture.md) para o mergulho técnico completo, incluindo por que escolhemos s6 em vez de supervisord, por que plugins estão integrados à imagem e por que `runuser` em vez de `su`.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
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
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :floppy_disk: Data & Persistence

| O quê | Onde (container) | Onde (host) | Sobrevive a rebuild? |
|------|-------------------|-------------|-------------------|
| Configurações, credenciais, chaves de API | `/home/claude/.claude` | `./data/claude` | **Sim** |
| Sessão Claude Code (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Sim** |
| Seu código e projetos | `/workspace` | `./workspace` | **Sim** |
| Conta CloudCLI | `/home/claude/.cloudcli` | *(somente container por padrão — veja abaixo)* | Não (opt-in disponível) |

HolyClaude restaura a sessão salva do Claude Code antes que a inicialização possa criar um novo arquivo padrão. Assim rebuilds e recreates não substituem uma sessão OAuth/API real por estado de onboarding.

### O que sobrevive a `docker compose down && docker compose up`:
- Sua autenticação Anthropic e chaves de API
- Configurações e memória do Claude Code (`CLAUDE.md`) e sessão OAuth (sem re-login)
- Todo seu código em `./workspace`
- Configuração Git
- Auth do Codex, Gemini e Cursor CLI (desde v1.1.7)

### O que você vai refazer (10 segundos):
- Conta web CloudCLI, cadastro rápido, só isso (a menos que ative a persistência abaixo)

### Acionando novamente a configuração de primeiro boot:
```bash
# Delete o arquivo sentinel — NÃO a pasta inteira
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Nunca delete `./data/claude/` inteiramente.** É lá que suas credenciais ficam. Delete o arquivo sentinel se quiser um bootstrap limpo. Delete arquivos de configuração específicos para resetar configurações. Mas nunca destrua a pasta inteira.

### Persistindo a conta CloudCLI (opcional, apenas armazenamento local)

Por padrão, o banco de dados da conta CloudCLI (`~/.cloudcli`) é local ao container e é apagado no rebuild. Recriar a conta leva 10 segundos, então a maioria das pessoas deixa assim.

Se quiser que sobreviva aos rebuilds, adicione um **named Docker volume** ao seu compose file:

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

> **NÃO faça bind-mount de `./data/cloudcli` em um compartilhamento de rede (NAS, SMB/CIFS, NFS).** O CloudCLI armazena sua conta em SQLite, e o file locking do SQLite quebra em mounts de rede. Você vai ter erros `database is locked` o tempo todo. Named volumes vivem no filesystem local do Docker engine, por isso funciona — bind mounts apontando para um NAS não vão funcionar.

Um bind mount para um caminho SSD local também funciona, só mantenha fora de qualquer compartilhamento de rede.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :lock: Permissions

O Claude Code roda no modo **`acceptEdits`** por padrão. Esta é a configuração enviada na imagem:

| Ação | Permitido? |
|--------|----------|
| Ler arquivos | Sim |
| Editar / criar arquivos | Sim |
| Executar comandos shell | **Pergunta primeiro** |
| Instalar pacotes | **Pergunta primeiro** |

### Quer bypass total? (usuários avançados)

É assim que eu pessoalmente uso. Edite `./data/claude/settings.json` no seu host:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Modo bypass significa que Claude executa comandos sem confirmação.** É poderoso, mas também pode executar comandos destrutivos rapidamente. Mantenha o padrão enviado `acceptEdits` a menos que confie no workspace e em cada prompt.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :shield: Acesso Remoto e Exposição

HolyClaude vincula o CloudCLI à porta `3001`. Por padrão isso é só local — ótimo para rodar no seu laptop ou num servidor doméstico que você acessa via SSH.

**No momento em que quiser acessar de fora da sua rede, leia esta seção.**

### Não faça port-forward para a internet pública

Vou ser direto: não abra um buraco no seu roteador e exponha `3001` para a internet aberta. Nem com senha. Por quê:

- O CloudCLI expõe um shell completo pelo plugin de terminal web
- Pode executar código arbitrário, instalar pacotes e ler/escrever todo o seu `/workspace`
- Guarda seus tokens OAuth da Anthropic e chaves de API
- Senhas de autenticação básica são quebradas por brute-force, credential stuffing e extraídas de logs
- Uma senha vazada = outra pessoa tem uma instância Claude Code paga rodando na sua máquina com seu dinheiro

Uma senha é um quebra-molas, não uma porta. Trate o HolyClaude como trataria uma sessão SSH: nunca na internet aberta sem um tunnel adequado na frente.

### Use um tunnel adequado

Estas são as duas opções que realmente recomendo:

| Opção | Para quem | Por quê |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Uso pessoal, times pequenos | VPN mesh WireGuard. Instale o Tailscale no seu servidor + laptop/celular, e você acessa `http://holyclaude:3001` de qualquer lugar como se estivesse na LAN. Sem portas abertas, sem DNS, sem certificados. Gratuito para uso pessoal. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Compartilhar com outros, hostname público | O Cloudflare faz proxy da conexão, então a porta `3001` fica fechada. Você ganha um domínio real com HTTPS, e pode colocar o Cloudflare Access (Google/GitHub SSO) na frente. O tier gratuito cobre a maioria do uso pessoal. |

Ambos te dão:
- Zero portas abertas no seu roteador
- Transporte criptografado de ponta a ponta
- Autenticação real baseada em identidade (não uma senha compartilhada)
- Logs de auditoria

### Se insistir em expor diretamente (por favor não faça)

Se absolutamente precisar pular o tunnel (tutorial de self-hosting, rede de lab isolada, o que for), no mínimo absoluto:

1. **Coloque um reverse proxy na frente** (Caddy, nginx, Traefik) com TLS real
2. **Adicione IP allowlisting** no firewall ou proxy — só seus IPs conhecidos
3. **Mantenha o padrão enviado `acceptEdits`**, a menos que você tenha um motivo claro para usar `bypassPermissions`
4. **Rotacione suas credenciais Anthropic** se algo parecer errado
5. **Execute atrás do Cloudflare Access ou SSO similar**, não autenticação básica

Mesmo com tudo isso, a superfície de risco é enorme. Use Tailscale ou Cloudflare Tunnel. São gratuitos, levam cinco minutos para configurar, e são o que eu uso pessoalmente.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :bell: Notifications

Saia do computador e saiba quando Claude terminar. Usa [Apprise](https://github.com/caronc/apprise) para notificações, com suporte a mais de 100 serviços incluindo Discord, Telegram, Slack, Email, Pushover, Gotify e mais.

**Para habilitar:**

1. Adicione uma ou mais variáveis `NOTIFY_*` ao `environment` do seu compose:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Dentro do container: `touch ~/.claude/notify-on`

Veja a [documentação de configuração](docs/configuration.md#notifications-apprise) para todas as variáveis e formatos de URL suportados.

**Para desabilitar:** `rm ~/.claude/notify-on`

**Eventos que acionam notificações:**
| Evento | O que aconteceu |
|-------|--------------|
| `stop` | Claude terminou a tarefa atual |
| `error` | Uma falha de uso de ferramenta ocorreu |

> Completamente silencioso quando não configurado. Sem variáveis `NOTIFY_*`? Sem arquivo flag? Zero chamadas de rede. Zero spam de log. Zero overhead.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# Baixe a imagem mais recente
docker compose pull

# Recrie o container com a nova imagem
docker compose up -d
```

Seus dados persistem em `./data/claude` e `./workspace`, atualizar apenas substitui o container, não seus arquivos.

Não execute `cloudcli update` nem `npm install -g @cloudcli-ai/cloudcli@latest` dentro do container. HolyClaude inclui um runtime CloudCLI com patches; atualize com `docker compose pull && docker compose up -d`.

Para fixar uma versão específica em vez de `latest`:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI mostra diretório padrão incorreto</strong></summary>

CloudCLI abre em `/home/claude` em vez de `/workspace`.

**Causa:** Um script de serviço CloudCLI customizado ou modificado não definiu `WORKSPACES_ROOT=/workspace` antes de iniciar o CloudCLI.

**Correção:** Já tratado no HolyClaude. O script de execução s6 define `WORKSPACES_ROOT=/workspace` diretamente no ambiente do processo.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Causa:** Bancos de dados SQLite em montagens de rede SMB/CIFS. O CIFS não suporta o bloqueio de arquivo em nível de arquivo que o SQLite requer.

**Correção:** Não armazene bancos de dados SQLite em compartilhamentos de rede. HolyClaude mantém `.cloudcli` em armazenamento local do container exatamente por esse motivo. Se você tiver seus próprios bancos de dados SQLite em `/workspace` em um NAS, mova-os para um caminho local.
</details>

<details>
<summary><strong>Chromium trava / páginas em branco / falhas de aba</strong></summary>

**Causa:** Memória compartilhada insuficiente. O Docker padrão é 64MB.

**Correção:** Certifique-se de que `shm_size: 2g` está no seu arquivo compose. Para uso intenso de navegador (muitas abas, páginas complexas), aumente para `4g`.
</details>

<details>
<summary><strong>File watchers não detectando mudanças (hot reload quebrado)</strong></summary>

**Causa:** Montagens de rede SMB/CIFS não suportam `inotify`.

**Correção:** Habilite polling no ambiente do seu compose:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Nota: Polling usa mais CPU que inotify. Habilite somente em montagens de rede.
</details>

<details>
<summary><strong>Erros de "permission denied"</strong></summary>

**Causa:** O UID/GID do container não corresponde à propriedade dos arquivos do host.

**Correção:**
```bash
# No seu host
id -u  # → este é seu PUID
id -g  # → este é seu PGID
```
Defina no seu arquivo compose:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker cria .claude.json como diretório</strong></summary>

**Causa:** Se um arquivo alvo de bind-mount não existir antes do início do container, o Docker o cria como diretório. Obrigado, Docker.

**Correção:** Já tratado, o `entrypoint.sh` restaura primeiro o arquivo de sessão salvo ou cria um arquivo padrão seguro quando não existe sessão salva.
</details>

Veja [docs/troubleshooting.md](docs/troubleshooting.md) para o guia completo incluindo todos os problemas de SMB/CIFS e o histórico completo de bugs que encontramos e corrigimos.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :warning: Known Issues

Estes não são bugs do HolyClaude, são problemas upstream ou trade-offs intencionais.

| Problema | Por que | Solução alternativa |
|-------|-----|------------|
| Botão "Continue in Shell" quebrado | Bug upstream do CloudCLI (race condition na inicialização do terminal) | Use o plugin **Web Terminal** (pré-instalado) |
| Cursor CLI "Command timeout" | Nenhuma chave de API configurada, apenas cosmético, não afeta nada | Defina `CURSOR_API_KEY` ou ignore |
| Conta CloudCLI perdida no rebuild | SQLite não consegue persistir em montagens de rede, trade-off intencional | Recrie a conta (~10 segundos) |
| Notificações push web "not supported" | Limitação do navegador no CloudCLI, comportamento padrão | Use notificações Apprise (veja [Notificações](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :hammer_and_wrench: Building Locally

Quer construir a imagem você mesmo em vez de baixar do Docker Hub? Vá em frente:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# Build imagem completa
docker build -t holyclaude .

# Build imagem slim
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# Build para ARM (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

Depois use `image: holyclaude` em vez de `image: coderluii/holyclaude:latest` no seu arquivo compose.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :bar_chart: Alternatives

Como o HolyClaude se compara a outras abordagens?

| Abordagem | Interface Web | Multi-IA | Ferramentas pré-configuradas | Navegador headless | Setup com um comando | Persistência |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | Mais de 50 ferramentas | Chromium + Xvfb + Playwright | `docker compose up` | Bind mounts |
| Claude Code (metal puro) | Não | Não | Instale você mesmo | Instale você mesmo | Instalação multi-etapa | Manual |
| Claude Code + oh-my-openagent | Não | Sim (multi-modelo) | Alguns | Não | npm install | Manual |
| DIY Docker + Claude Code | Talvez | Talvez | O que você adicionar | Se você configurar | Se você escrever o Dockerfile | Se você configurar volumes |
| Cursor IDE | Integrado | Somente Cursor | Incluído na IDE | Não | Download do app | Dados do app |

HolyClaude não compete com agentes de codificação, é a **camada de infraestrutura** que faz todos eles funcionarem melhor. É o container dentro do qual você os executa.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :rocket: Roadmap

O que vem a seguir:

| Status | Recurso |
|--------|---------|
| 🔜 | **Builds ARM nativos** — imagens ARM64 nativas otimizadas, não apenas emuladas |
| 🔜 | **Integração VS Code tunnel** — VS Code Server integrado ou tunnel para conexão do VS Code desktop |
| 🔜 | **Roteamento de notificações** — diferentes destinos de notificação por tipo de evento (erros para Telegram, conclusões para Discord) |

Tem uma ideia? [Inicie uma discussão](https://github.com/CoderLuii/HolyClaude/discussions) ou [solicite um recurso](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :trophy: Built with HolyClaude

Usando HolyClaude para construir algo? Adoraríamos ver.

Abra uma issue com o label `showcase` ou envie um PR para adicionar seu projeto aqui:

<!-- Add your project: [Project Name](url) — one-line description -->

*Seja o primeiro a adicionar seu projeto aqui.*

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :handshake: Contributing

Contribuições são bem-vindas. Este projeto nasceu do uso diário real e melhora quando mais pessoas o usam e encontram casos extremos.

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/something`)
3. Faça o commit
4. Faça o push
5. Abra um PR

Bugs, solicitações de recursos, dúvidas: [abra uma issue](https://github.com/CoderLuii/HolyClaude/issues).

### Entre em contato

| Canal | Use para |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Dúvidas, mostre sua configuração, ideias |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Relatórios de bug, solicitações de recursos e pacotes |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Relatórios de vulnerabilidade (privado) |

### Quer uma ferramenta adicionada?

Use o template de issue [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml). Inclua o nome do pacote, método de instalação e qual variante (full/slim) deve ser o alvo.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :heart: Support

HolyClaude é gratuito, open source e mantido por um único desenvolvedor que o usa todos os dias.

Se ele economizou seu tempo, veja como você pode ajudar:

- **Dê uma estrela neste repositório** — é a coisa mais impactante que você pode fazer pela visibilidade
- **Compartilhe** — conte a um amigo, poste, tuíte
- **Abra issues** — relatórios de bug e solicitações de recursos tornam o HolyClaude melhor para todos
- **Contribua** — PRs são sempre bem-vindos

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :scroll: Third-Party Software

A imagem Docker do HolyClaude inclui software de terceiros, cada um sob sua própria licença. Componentes notáveis:

| Componente | Licença | Fonte |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Veja [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) para detalhes completos incluindo avisos de modificação. O próprio código-fonte do HolyClaude é licenciado sob MIT.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
</p>

---

## :page_facing_up: License

MIT — veja [LICENSE](LICENSE). Use como quiser.

<p align="right">
  <a href="#top">↑ voltar ao topo</a>
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

Construído por [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Este container é o que uso todos os dias. Se ele te economizou ao menos metade do tempo de configuração que me economizou, uma estrela seria ótima.

</div>
