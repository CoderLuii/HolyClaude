🌍 [English](../../README.md) | [Español](README.es.md) | **Français** | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [हिन्दी](README.hi.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

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

### Arrêtez de configurer. Commencez à construire.

Une commande. Un poste de travail IA complet. Claude Code, interface web, navigateur headless, 8 CLI IA, 50+ outils de développement — containerisé et prêt à l'emploi.

**Vous alliez passer 2 heures à tout installer manuellement. Ou vous pouvez simplement faire `docker compose up`.**

**Fonctionne avec votre abonnement Claude Code existant.** Plan Max/Pro, clé API — quoi que vous ayez, ça marche directement.

---

## C'est quoi exactement ?

Vous connaissez la chanson. Vous voulez Claude Code. Mais vous le voulez aussi dans un navigateur. Avec un navigateur headless pour les captures d'écran et les tests. Avec Playwright configuré. Avec tous les CLI IA. Avec TypeScript, Python, des outils de déploiement, des clients de bases de données, GitHub CLI.

Alors vous commencez à installer les choses. Une par une. Puis Chromium refuse de se lancer parce que la mémoire partagée de Docker fait 64 Mo. Puis Xvfb n'est pas configuré. Puis l'UID à l'intérieur du conteneur ne correspond pas à votre hôte et tout renvoie "permission denied". Puis vous réalisez que l'installateur de Claude Code se bloque quand WORKDIR appartient à root. Puis SQLite se bloque sur votre montage NAS. Puis —

**HolyClaude est le conteneur que j'ai construit après avoir résolu chacun de ces problèmes.**

Je l'utilise quotidiennement sur mon propre serveur depuis des semaines. Chaque bug a été rencontré, diagnostiqué et corrigé. Chaque cas limite a été traité. Chaque "pourquoi ça ne fonctionne pas dans Docker" a trouvé sa réponse.

Vous le téléchargez. Vous le lancez. Vous ouvrez votre navigateur. Vous construisez.

### :credit_card: Utilisez votre abonnement existant

**Ceci exécute le vrai Claude Code CLI** d'Anthropic. Pas un wrapper. Pas un proxy. Pas une copie.

Votre compte Anthropic existant fonctionne directement :
- **Plan Claude Max/Pro** — authentification via l'interface web (OAuth), identique à Claude Code sur le bureau
- **Clé API Anthropic** — saisissez votre clé API dans l'interface web, même facturation qu'habituellement
- **Aucun coût supplémentaire** — HolyClaude est gratuit et open source. Vous ne payez Anthropic que pour ce que vous utilisez, comme vous le faites déjà.

> HolyClaude ne touche pas à vos identifiants. Ils sont stockés localement dans votre volume bind-monté (`./data/claude/`), exactement comme ils le seraient sur un système nu.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## Table des matières

| | Section |
|---|---|
| :zap: | [Démarrage rapide](#zap-quick-start) |
| :computer: | [Compatibilité des plateformes](#computer-platform-support) |
| :star2: | [Pourquoi HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Abonnement et authentification](#credit_card-subscription--authentication) |
| :package: | [Variantes d'image](#package-image-variants) |
| :whale: | [Docker Compose — Rapide](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Complet](#whale2-docker-compose--full) |
| :wrench: | [Variables d'environnement](#wrench-environment-variables) |
| :rocket: | [Ce qui est inclus](#rocket-whats-inside) |
| :robot: | [Fournisseurs de CLI IA](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Utiliser Ollama](#llama-using-ollama) |
| :building_construction: | [Architecture](#building_construction-architecture) |
| :file_folder: | [Structure du projet](#file_folder-project-structure) |
| :floppy_disk: | [Données et persistance](#floppy_disk-data--persistence) |
| :lock: | [Permissions](#lock-permissions) |
| :shield: | [Accès distant et exposition](#shield-remote-access--exposure) |
| :bell: | [Notifications](#bell-notifications) |
| :arrows_counterclockwise: | [Mises à jour](#arrows_counterclockwise-upgrading) |
| :construction: | [Dépannage](#construction-troubleshooting) |
| :warning: | [Problèmes connus](#warning-known-issues) |
| :hammer_and_wrench: | [Compilation locale](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Alternatives](#bar_chart-alternatives) |
| :rocket: | [Feuille de route](#rocket-roadmap) |
| :trophy: | [Construit avec HolyClaude](#trophy-built-with-holyclaude) |
| :handshake: | [Contribuer](#handshake-contributing) |
| :heart: | [Support](#heart-support) |
| :scroll: | [Logiciels tiers](#scroll-third-party-software) |
| :page_facing_up: | [Licence](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :zap: Démarrage rapide

**1.** Créez un dossier pour HolyClaude :

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Créez un fichier `docker-compose.yaml`. Copiez l'un des modèles ci-dessous :
- [Modèle rapide](#whale-docker-compose--quick) — minimal, zéro configuration, fonctionne directement
- [Modèle complet](#whale2-docker-compose--full) — toutes les options, entièrement documenté

**3.** Téléchargez et démarrez :

```bash
docker compose up -d
```

**4.** Ouvrez l'interface web :

```
http://localhost:3001
```

**5.** Créez un compte CloudCLI (ça prend 10 secondes), connectez-vous avec votre compte Anthropic, et c'est parti.

> Pas de fichiers `.env`. Pas de préconfiguration. Pas besoin de lire 40 pages de documentation avant de pouvoir commencer. Ça fonctionne, c'est tout.

> **Vous voulez y accéder depuis l'extérieur de votre réseau ?** Ne faites pas de port-forward. Consultez [Accès distant et exposition](#shield-remote-access--exposure) — utilisez Tailscale ou Cloudflare Tunnel à la place.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :computer: Compatibilité des plateformes

| Plateforme | Statut | Notes |
|----------|--------|-------|
| Linux (amd64) | ✅ Entièrement supporté | Performances natives, recommandé |
| Linux (arm64) | ✅ Entièrement supporté | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Entièrement supporté | Apple Silicon et Intel via Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Entièrement supporté | Nécessite le backend WSL2 |
| Synology / QNAP NAS | ✅ Entièrement supporté | Utilisez `CHOKIDAR_USEPOLLING=true` pour les montages SMB |
| Kubernetes | 🔜 Bientôt disponible | Chart Helm prévu |

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :star2: Pourquoi HolyClaude

Je l'ai construit parce que j'en avais assez de refaire la même configuration à chaque fois. Installer Claude Code, connecter une interface web, configurer Chromium dans Docker, corriger les problèmes de permissions, déboguer la supervision des processus. À chaque fois.

Alors j'ai créé un conteneur qui fait tout ça. Et ensuite j'ai rencontré tous les bugs possibles pour que vous n'ayez pas à le faire.

| | HolyClaude | Le faire soi-même |
|---|---|---|
| **Configuration** | 30 secondes | 1 à 2 heures (si tout se passe bien) |
| **Claude Code** | Pré-installé, pré-configuré, prêt | Installer, configurer, déboguer le blocage de l'installateur, corriger WORKDIR |
| **Interface web** | CloudCLI inclus avec plugins | Trouver une interface web, l'installer, la configurer, la connecter à Claude |
| **Navigateur headless** | Chromium + Xvfb + Playwright, configuré | Installer Chromium, installer Xvfb, configurer l'affichage :99, corriger shm, corriger sandbox, corriger seccomp... |
| **CLI IA** | 8 fournisseurs, un seul conteneur | Installer chacun séparément via 3 gestionnaires de paquets |
| **Outils de dev** | 50+ outils, prêts | `apt-get install` / `npm i -g` / `pip install` pendant une heure |
| **Gestion des processus** | s6-overlay (redémarrage auto, arrêt propre) | Écrire votre propre config supervisord ou espérer que le restart Docker fonctionne |
| **Persistance** | Bind mounts, les identifiants survivent à tout | Comprendre les volumes Docker, déboguer "pourquoi c'est un répertoire et pas un fichier" |
| **Mises à jour** | `docker pull && docker compose up -d` | Mettre à jour 50 outils manuellement, prier pour que rien ne casse |
| **Multi-arch** | AMD64 + ARM64 | Prier que votre Dockerfile se compile sur ARM |

**La dernière ligne de chaque installation manuelle, c'est "ça marche sur ma machine."** HolyClaude marche sur toutes les machines.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :credit_card: Abonnement et authentification

HolyClaude exécute le **Claude Code CLI officiel** d'Anthropic. Votre compte existant fonctionne immédiatement.

### Ce qui fonctionne :

| Méthode d'authentification | Comment | Coût |
|----------------------|-----|------|
| **Plan Claude Max/Pro** (abonnement) | Connexion via l'interface web CloudCLI — même flux OAuth que sur le bureau | Votre abonnement existant, sans frais supplémentaires |
| **Clé API Anthropic** | Collez votre clé API dans l'interface web | Paiement à l'usage, même facturation Anthropic |

### Ce qui ne fonctionne pas :

| | Pourquoi |
|---|---|
| Clé API OpenAI pour Claude | Entreprises différentes, API différente. Les clés OpenAI fonctionnent avec le **Codex CLI** (également pré-installé) |

> **Abonnés ChatGPT Plus/Pro :** Votre abonnement fonctionne avec le **Codex CLI**. Exécutez `codex login --device-auth` à l'intérieur du conteneur pour vous authentifier avec votre compte ChatGPT.

### Autres CLI IA inclus :

| CLI | Ce dont vous avez besoin |
|-----|--------------|
| Gemini CLI | Clé API Google AI (`GEMINI_API_KEY`) |
| OpenAI Codex | Clé API OpenAI (`OPENAI_API_KEY`) ou abonnement ChatGPT Plus/Pro (`codex login --device-auth`) |
| Cursor | Clé API Cursor (`CURSOR_API_KEY`) |
| TaskMaster AI | Utilise vos clés de fournisseur IA (Anthropic, OpenAI, etc.) |
| Junie | Compte JetBrains (abonnement JetBrains AI) |
| OpenCode | Configurer via le TUI `opencode` (supporte OpenRouter et plusieurs fournisseurs) |
| Pi Coding Agent | Configurer via `pi` (supporte plusieurs fournisseurs) |

> **HolyClaude est gratuit et open source.** Vous ne payez vos fournisseurs IA que pour l'usage, comme vous le faites déjà. Nous ne proxifions pas, n'interceptons pas et ne touchons pas à vos identifiants. Ils vivent dans votre bind mount local.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :package: Variantes d'image

Deux saveurs. Même qualité. Choisissez votre catégorie de poids.

| Tag | Ce que vous obtenez | Idéal pour |
|-----|-------------|----------|
| **`latest`** | Tout pré-installé — chaque outil, chaque bibliothèque, chaque CLI | La plupart des utilisateurs. Zéro temps d'attente. Claude n'a jamais besoin de s'arrêter pour installer quelque chose. |
| **`slim`** | Outils de base uniquement — Claude installe les extras à la demande | VPS plus petit, disque limité, bande passante mesurée |
| `X.Y.Z` | Image complète, version épinglée | Stabilité en production — vous contrôlez quand mettre à jour |
| `X.Y.Z-slim` | Image slim, version épinglée | Production + empreinte réduite |

```bash
# Complet — batteries incluses (recommandé)
docker pull coderluii/holyclaude

# Slim — léger et efficace
docker pull coderluii/holyclaude:slim
```

> **`latest` est toujours l'image complète.** Utilisateurs de slim : pas d'inquiétude — quand vous demandez à Claude de faire quelque chose qui nécessite un outil manquant, il l'installe en quelques secondes. Vous obtenez les mêmes capacités, juste avec un téléchargement initial plus léger.
>
> Docker Hub affiche la taille compressée du téléchargement : `latest` fait environ 4,0 Gio et `slim` environ 2,1 Gio. Docker, Synology Container Manager et les systèmes de fichiers NAS peuvent afficher une taille plus grande après extraction des couches.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :whale: Docker Compose — Rapide

Le modèle "je veux juste que ça tourne". Copiez ce bloc entier dans un fichier `docker-compose.yaml` :

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

Ensuite :

```bash
docker compose up -d
```

Ouvrez `http://localhost:3001`. Créez un compte CloudCLI. Connectez-vous avec votre compte Anthropic. Construisez quelque chose.

**C'est toute la configuration. Vous avez terminé.**

> **Pourquoi ces capacités de navigateur ?** Cette version conserve le profil navigateur actuel de HolyClaude. `SYS_ADMIN` et `seccomp=unconfined` augmentent les privilèges de processus et réduisent l'isolation ; `SYS_PTRACE` sert au débogage. Gardez ce profil tel quel pour v1.5.0 et traitez le durcissement comme un changement séparé.

> **Pourquoi `shm_size: 2g` ?** Docker alloue 64 Mo de mémoire partagée aux conteneurs par défaut. HolyClaude conserve 2 Go comme valeur par défaut retenue pour cette version parce que Chromium utilise beaucoup `/dev/shm` pour le rendu des onglets. À 64 Mo, les onglets plantent ; si l'usage navigateur est intensif, montez à 4 Go.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :whale2: Docker Compose — Complet

Même image, chaque paramètre exposé. Copiez ce bloc entier dans un fichier `docker-compose.yaml` :

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

Ensuite :

```bash
docker compose up -d
```

Si vous souhaitez modifier le port côté hôte ou les chemins de bind-mount sans éditer le compose, copiez `.env.example` vers `.env` et définissez :

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

Ces valeurs sont lues par Docker Compose sur l'hôte. Ce ne sont pas des variables d'environnement du conteneur.

### Ce que contrôle chaque section :

| Section | Ce qu'elle fait | Quand la modifier |
|---------|-------------|-------------------|
| **Timezone** | Horloge du conteneur | Toujours — définissez votre fuseau horaire local |
| **Performance** | Plafond mémoire Node.js | Seulement si vous avez des erreurs OOM sur de grands projets |
| **User mapping** | Permissions de fichiers entre conteneur et hôte | Si vous obtenez "permission denied" (`id -u` et `id -g` sur votre hôte) |
| **SMB/CIFS** | Mode de surveillance des fichiers par polling | Seulement si vos volumes sont sur un NAS ou un partage réseau |
| **Notifications** | Alertes push via Apprise (Discord, Telegram, Slack, Email, 100+ services) | Si vous voulez vous éloigner et savoir quand Claude a terminé |
| **AI providers** | Clés API pour Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent | Si vous voulez utiliser des CLI IA autres que Claude |

> **Chaque variable d'environnement est optionnelle.** Le conteneur fonctionne parfaitement avec juste `TZ=UTC`. Tout le reste a des valeurs par défaut sensées ou est géré via l'interface web.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :wrench: Variables d'environnement

La référence complète. Chaque variable, sa valeur par défaut, ce qu'elle fait.

| Variable | Défaut | Ce qu'elle fait |
|----------|---------|--------------|
| `TZ` | `UTC` | Fuseau horaire du conteneur |
| `PUID` | `1000` | ID utilisateur du conteneur pour le remappage Docker; Podman rootless utilise `docker-compose.podman-rootless.yaml` |
| `PGID` | `1000` | ID de groupe du conteneur pour le remappage Docker; Podman rootless utilise `docker-compose.podman-rootless.yaml` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Limite mémoire heap Node.js en Mo |
| `GIT_USER_NAME` | `HolyClaude User` | Auteur des commits Git (défini une fois au premier démarrage) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Email des commits Git (défini une fois au premier démarrage) |
| `CHOKIDAR_USEPOLLING` | *(non défini)* | Définissez à `1` pour SMB/CIFS — active les observateurs de fichiers par polling |
| `WATCHFILES_FORCE_POLLING` | *(non défini)* | Définissez à `true` pour SMB/CIFS — active le polling Python |
| `NOTIFY_DISCORD` | *(non défini)* | URL du webhook Discord pour les notifications |
| `NOTIFY_TELEGRAM` | *(non défini)* | URL du bot Telegram pour les notifications |
| `NOTIFY_PUSHOVER` | *(non défini)* | URL Pushover pour les notifications |
| `NOTIFY_SLACK` | *(non défini)* | URL du webhook Slack pour les notifications |
| `NOTIFY_EMAIL` | *(non défini)* | URL Email (SMTP) pour les notifications |
| `NOTIFY_GOTIFY` | *(non défini)* | URL Gotify pour les notifications |
| `NOTIFY_URLS` | *(non défini)* | Attrape-tout — [URLs Apprise](https://github.com/caronc/apprise/wiki) séparées par des virgules |
| `ANTHROPIC_API_KEY` | *(non défini)* | Clé API Anthropic (alternative à l'OAuth via interface web) |
| `ANTHROPIC_AUTH_TOKEN` | *(non défini)* | Token d'authentification Anthropic (alternative à la clé API) |
| `ANTHROPIC_BASE_URL` | *(non défini)* | Endpoint API Anthropic personnalisé (proxies, déploiements privés) |
| `CLAUDE_CODE_USE_BEDROCK` | *(non défini)* | Définissez à `1` pour utiliser le backend Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | *(non défini)* | Définissez à `1` pour utiliser le backend Google Vertex AI |
| `GEMINI_API_KEY` | *(non défini)* | Clé API Google Gemini |
| `OPENAI_API_KEY` | *(non défini)* | Clé API OpenAI (pour Codex CLI, ou utilisez `codex login --device-auth` pour l'abonnement ChatGPT) |
| `CURSOR_API_KEY` | *(non défini)* | Clé API Cursor |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Configuration globale optionnelle des skills Desloppify. Valeurs: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` ou sous-ensembles separes par des virgules |
| `OLLAMA_HOST` | *(non défini)* | URL de l'endpoint Ollama (ex. `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :rocket: Ce qui est inclus

Ce n'est pas un conteneur minimal. C'est un poste de travail de développement complet.

### Les deux variantes (full + slim)

<details>
<summary><strong>Node.js 26 + paquets npm globaux</strong></summary>

| Paquet | À quoi ça sert |
|---------|---------------|
| `typescript`, `tsx` | Compilation et exécution TypeScript |
| `pnpm` | Gestionnaire de paquets rapide et économe en espace disque |
| `vite`, `esbuild` | Outils de build ultra-rapides |
| `eslint`, `prettier` | Qualité du code et formatage |
| `serve`, `nodemon` | Serveur de fichiers statiques, redémarrage automatique du serveur de développement |
| `concurrently` | Exécuter plusieurs scripts en parallèle |
| `dotenv-cli` | Charger des variables d'environnement depuis des fichiers `.env` |

</details>

<details>
<summary><strong>Paquets Python 3</strong></summary>

| Paquet | À quoi ça sert |
|---------|---------------|
| `requests`, `httpx` | Clients HTTP |
| `beautifulsoup4`, `lxml` | Web scraping et parsing HTML |
| `Pillow` | Traitement d'images (pré-compilé — pas d'attente) |
| `pandas`, `numpy` | Manipulation de données (pré-compilés — sérieusement, vous ne voulez pas les installer avec pip au runtime) |
| `openpyxl` | Lecture/écriture de fichiers Excel |
| `python-docx` | Lecture/écriture de documents Word |
| `jinja2`, `markdown` | Templating et rendu markdown |
| `pyyaml`, `python-dotenv` | Parsing de fichiers de configuration |
| `rich`, `click`, `tqdm` | Beaux CLIs et barres de progression |
| `desloppify`, `bandit`, `tree-sitter` | Scans de qualite du code, controles de securite Python, analyse de code avec parser |
| `playwright` | Automatisation de navigateur (Chromium déjà configuré et prêt) |

</details>

<details>
<summary><strong>Outils système</strong></summary>

| Outil | À quoi ça sert |
|------|---------------|
| `git`, `gh` | Contrôle de version + GitHub CLI (PRs, issues, releases depuis le terminal) |
| `ripgrep` (`rg`), `fd`, `fzf` | Recherche ultra-rapide — Claude les utilise constamment |
| `bat`, `tree`, `jq` | Meilleur cat (coloration syntaxique), arborescences de répertoires, traitement JSON |
| `curl`, `wget` | Téléchargements HTTP |
| `tmux` | Multiplexeur de terminal — exécuter des choses en arrière-plan |
| `htop`, `lsof`, `strace` | Surveillance des processus et débogage |
| `imagemagick` | Conversion d'images (`convert`, `identify`, `mogrify`) |
| `chromium` | Navigateur headless — captures d'écran, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | Communication directe avec les bases de données |
| `openssh-client`, `openssh-server`, `mosh` | SSH sortant et accès SSH/Mosh optionnel au conteneur |

</details>

<details>
<summary><strong>CLI IA — tous les grands fournisseurs</strong></summary>

| CLI | Commande | À quoi ça sert |
|-----|---------|---------------|
| **Claude Code** | `claude` | L'événement principal — vous tournez à l'intérieur de celui-ci |
| **Gemini CLI** | `gemini` | Agent de codage IA de Google |
| **OpenAI Codex** | `codex` | Agent de codage d'OpenAI |
| **Cursor** | `cursor` | Agent IA de Cursor |
| **TaskMaster AI** | `task-master` | Planification de tâches et orchestration |
| **Junie** | `junie` | Agent de codage IA de JetBrains |
| **OpenCode** | `opencode` | Agent IA open source (OpenRouter et plusieurs fournisseurs) |
| **Pi Coding Agent** | `pi` | Harnais agent minimal (plusieurs fournisseurs) |

Huit CLI IA. Un seul conteneur. Passez de l'un à l'autre instantanément. Aucune autre image Docker ne fait ça.

</details>

### Image complète uniquement (paquets supplémentaires)

L'image complète inclut tout ce qui précède, plus :

<details>
<summary><strong>Paquets npm supplémentaires — déploiement, ORMs, performance</strong></summary>

| Paquet | À quoi ça sert |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Déploiement Cloudflare Workers |
| `vercel` | Déploiement Vercel |
| `netlify-cli` | Déploiement Netlify |
| `az` | CLI Azure pour le déploiement cloud et la gestion |
| `prisma`, `drizzle-kit` | Les deux ORMs Node.js les plus populaires |
| `pm2` | Gestionnaire de processus en production |
| `eas-cli` | Builds Expo / React Native |
| `lighthouse`, `@lhci/cli` | Audit de performance (Chromium est déjà là) |
| `sharp-cli` | CLI de traitement d'images |
| `json-server`, `http-server` | APIs REST mock, service de fichiers statiques |
| `@marp-team/marp-cli` | Markdown vers diapositives de présentation |

</details>

<details>
<summary><strong>Paquets Python supplémentaires — PDFs, visualisation de données, frameworks web</strong></summary>

| Paquet | À quoi ça sert |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Toutes les grandes bibliothèques PDF. Générez-les, lisez-les, convertissez-les, fusionnez-les. |
| `xlsxwriter`, `xlrd` | Formats Excel au-delà de ce que couvre openpyxl |
| `matplotlib`, `seaborn` | Visualisation de données et graphiques |
| `python-pptx` | Génération de présentations PowerPoint |
| `fastapi`, `uvicorn` | Framework web Python |

</details>

<details>
<summary><strong>Paquets système supplémentaires — médias, documents</strong></summary>

| Paquet | À quoi ça sert |
|---------|---------------|
| `pandoc` | Convertir entre n'importe quel format de document (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Traitement vidéo et audio (extraire, convertir, transcoder) |
| `libvips-dev` | Bibliothèque de traitement d'images haute performance |

</details>

> **Utilisateurs slim :** Il manque un paquet ? Demandez à Claude. Il installe les paquets npm/pip en quelques secondes. Les paquets système (pandoc, ffmpeg) prennent 1 à 2 minutes. Vous obtenez les mêmes capacités — l'image complète a juste zéro temps d'attente.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :robot: Fournisseurs de CLI IA

Huit CLI IA. Un seul conteneur. Aucune autre image Docker ne vous donne ça.

| Fournisseur | Commande | Comment s'authentifier | Abonnement fonctionne ? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | Interface web CloudCLI (OAuth) | **Oui** — Plan Max/Pro ou clé API |
| **Gemini CLI** | `gemini` | Variable d'env `GEMINI_API_KEY` | Clé API (paiement à l'usage) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` ou `codex login --device-auth` | **Oui** — ChatGPT Plus/Pro/Team/Enterprise ou clé API |
| **Cursor** | `cursor` | Variable d'env `CURSOR_API_KEY` | Clé API |
| **TaskMaster AI** | `task-master` | Utilise les clés de fournisseur IA existantes | Fonctionne avec les clés configurées |
| **Junie** | `junie` | Abonnement JetBrains AI | Compte JetBrains requis |
| **OpenCode** | `opencode` | Configurer via TUI | Supporte OpenRouter et plusieurs fournisseurs; image full seulement |
| **Pi Coding Agent** | `pi` | Configurer via Pi | Supporte plusieurs fournisseurs |

> Claude Code est le CLI principal. Les autres sont là parce que vous voulez parfois un deuxième avis, ou les points forts d'un modèle spécifique, ou que vous comparez des sorties. Les avoir tous à un `Tab` de distance, c'est tout l'intérêt.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :mag: Desloppify

Desloppify est fourni dans les deux images via la commande `desloppify`. Par defaut, il reste passif: HolyClaude ne lance pas de scan, ne cree pas `.desloppify/`, ne modifie pas `.gitignore` et ne touche pas aux workspaces montes sauf si vous lancez Desloppify vous-meme.

```bash
desloppify scan --path .
desloppify next
```

Apres un scan, ajoutez `.desloppify/` au `.gitignore` du projet concerne.

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` desactive seulement la configuration globale automatique des skills; la CLI reste installee. `all` signifie `claude,codex,gemini`. `opencode` est reserve a l'image full et n'est pas inclus dans `all`. Ne combinez pas `claude` et `opencode` en configuration automatique, car OpenCode peut deja decouvrir les skills compatibles Claude depuis `~/.claude/skills`.

Cibles upstream manuelles: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :llama: Utiliser Ollama

HolyClaude fonctionne avec [Ollama](https://ollama.com) comme alternative à un abonnement Anthropic. Définissez deux variables d'environnement et utilisez des modèles locaux ou cloud.

Consultez le guide de configuration complet : **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ retour en haut</a>
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

### Comment les pièces s'assemblent

1. **Le conteneur démarre** — `entrypoint.sh` s'exécute en tant que root. Remapping de l'UID/GID pour correspondre à votre utilisateur hôte, restauration de la session Claude Code enregistrée avant que bootstrap puisse la toucher, vérification s'il s'agit d'un premier démarrage.

2. **Premier démarrage uniquement** — `bootstrap.sh` s'exécute une seule fois. Copie les paramètres par défaut, le modèle de mémoire, configure l'identité git. Crée un fichier sentinelle (`.holyclaude-bootstrapped`) pour qu'il ne s'exécute plus jamais. Vos personnalisations sont protégées à partir de ce moment.

3. **s6-overlay prend le contrôle en tant que PID 1** — Ce n'est pas supervisord. C'est [s6-overlay](https://github.com/just-containers/s6-overlay), conçu spécifiquement pour Docker. Supervise CloudCLI, Xvfb et la synchronisation de session Claude. Redémarre automatiquement en cas de crash. Transmet les signaux. Récolte les zombies. S'arrête proprement.

4. **CloudCLI sert l'interface web** — Port 3001. Interface basée sur navigateur pour Claude Code avec gestion de projets, sessions multiples et plugins (stats de projet + terminal web inclus).

5. **Xvfb fournit un affichage de compatibilité** — Xvfb reste disponible sur `:99` pour les outils qui utilisent un affichage visible. Chromium headless moderne, Playwright et Lighthouse n'ont pas systématiquement besoin de Xvfb.

Consultez [docs/architecture.md](docs/architecture.md) pour la plongée technique complète — notamment pourquoi nous avons choisi s6 plutôt que supervisord, pourquoi les plugins sont intégrés dans l'image, et pourquoi `runuser` plutôt que `su`.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :file_folder: Structure du projet

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
  <a href="#top">↑ retour en haut</a>
</p>

---

## :floppy_disk: Données et persistance

| Quoi | Où (conteneur) | Où (hôte) | Survit à la reconstruction ? |
|------|-------------------|-------------|-------------------|
| Paramètres, identifiants, clés API | `/home/claude/.claude` | `./data/claude` | **Oui** |
| Session Claude Code (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Oui** |
| Votre code et projets | `/workspace` | `./workspace` | **Oui** |
| Compte CloudCLI | `/home/claude/.cloudcli` | *(conteneur uniquement par défaut — voir ci-dessous)* | Non (opt-in disponible) |

HolyClaude restaure la session Claude Code enregistrée avant que le démarrage puisse créer un nouveau fichier par défaut. Les rebuilds et recreates ne remplacent donc pas une vraie session OAuth/API par un état d'onboarding.

### Ce qui survit à `docker compose down && docker compose up` :
- Votre authentification Anthropic et clés API
- Paramètres Claude Code, mémoire (`CLAUDE.md`) et session OAuth (sans reconnexion)
- Tout votre code dans `./workspace`
- Configuration Git
- Auth Codex, Gemini et Cursor CLI (depuis v1.1.7)

### Ce que vous referez (10 secondes) :
- Compte web CloudCLI — inscription rapide, c'est tout (sauf si vous activez la persistance ci-dessous)

### Re-déclencher la configuration du premier démarrage :
```bash
# Supprimez le fichier sentinelle — PAS tout le dossier
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Ne jamais supprimer `./data/claude/` entièrement.** C'est là que vivent vos identifiants. Supprimez le fichier sentinelle si vous voulez un bootstrap frais. Supprimez des fichiers de configuration spécifiques si vous voulez réinitialiser les paramètres. Mais ne noyez jamais tout le dossier.

### Persister le compte CloudCLI (optionnel, stockage local uniquement)

Par défaut, la base de données du compte CloudCLI (`~/.cloudcli`) est locale au conteneur et est effacée à la reconstruction. Recréer le compte prend 10 secondes, donc la plupart des gens laissent ça tel quel.

Si vous voulez qu'il survive aux reconstructions, ajoutez un **named Docker volume** à votre compose file :

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

> **Ne faites PAS de bind-mount de `./data/cloudcli` sur un partage réseau (NAS, SMB/CIFS, NFS).** CloudCLI stocke son compte dans SQLite, et le verrouillage de fichiers de SQLite ne fonctionne pas sur les montages réseau. Vous aurez des erreurs `database is locked` en permanence. Les named volumes vivent sur le système de fichiers local du moteur Docker, c'est pourquoi ça fonctionne — les bind mounts pointant vers un NAS ne fonctionneront pas.

Un bind mount vers un chemin SSD local convient aussi, gardez-le juste hors de tout partage réseau.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :lock: Permissions

Claude Code s'exécute en mode **`acceptEdits`** par défaut. C'est le paramètre livré dans l'image :

| Action | Autorisé ? |
|--------|----------|
| Lire des fichiers | Oui |
| Modifier / créer des fichiers | Oui |
| Exécuter des commandes shell | **Vous demande d'abord** |
| Installer des paquets | **Vous demande d'abord** |

### Vous voulez un contournement total ? (utilisateurs avancés)

C'est ainsi que je l'utilise personnellement. Modifiez `./data/claude/settings.json` sur votre hôte :

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Le mode bypass signifie que Claude exécute des commandes sans confirmation.** Il est puissant, mais il peut aussi exécuter rapidement des commandes destructrices. Gardez le paramètre livré `acceptEdits` sauf si vous faites confiance au workspace et à chaque prompt.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :shield: Accès distant et exposition

HolyClaude lie CloudCLI au port `3001`. Par défaut c'est local uniquement — parfait pour tourner sur votre laptop ou un serveur domestique auquel vous accédez en SSH.

**Dès que vous voulez y accéder depuis l'extérieur de votre réseau, lisez cette section.**

### Ne faites pas de port-forward vers l'internet public

Je le dis clairement : ne percez pas un trou dans votre routeur et n'exposez pas `3001` à l'internet ouvert. Même pas avec un mot de passe. Voici pourquoi :

- CloudCLI expose un shell complet via le plugin terminal web
- Il peut exécuter du code arbitraire, installer des paquets et lire/écrire tout votre `/workspace`
- Il détient vos tokens OAuth Anthropic et clés API
- Les mots de passe d'authentification basique se font brute-forcer, credential-stuffer et extraire des logs
- Un mot de passe divulgué = quelqu'un d'autre a une instance Claude Code payante qui tourne sur votre machine avec votre argent

Un mot de passe est un ralentisseur, pas une porte. Traitez HolyClaude comme vous traiteriez une session SSH : jamais sur l'internet ouvert sans un tunnel approprié devant.

### Utilisez un tunnel approprié à la place

Voici les deux options que je recommande vraiment :

| Option | Pour qui | Pourquoi |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Usage personnel, petites équipes | VPN mesh WireGuard. Installez Tailscale sur votre serveur + votre laptop/téléphone, et vous accédez à `http://holyclaude:3001` de n'importe où comme si vous étiez sur le LAN. Aucun port ouvert, pas de DNS, pas de certificats. Gratuit pour usage personnel. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Partage avec d'autres, hostname public | Cloudflare proxifie la connexion, donc le port `3001` reste fermé. Vous obtenez un vrai domaine avec HTTPS, et vous pouvez mettre Cloudflare Access (Google/GitHub SSO) devant. Le niveau gratuit couvre la plupart des usages personnels. |

Les deux vous donnent :
- Zéro port ouvert sur votre routeur
- Transport chiffré de bout en bout
- Authentification réelle basée sur l'identité (pas un mot de passe partagé)
- Journaux d'audit

### Si vous insistez pour l'exposer directement (s'il vous plaît, ne le faites pas)

Si vous devez absolument sauter le tunnel (tutoriel de self-hosting, réseau de lab isolé, peu importe), au strict minimum :

1. **Mettez un reverse proxy devant** (Caddy, nginx, Traefik) avec un vrai TLS
2. **Ajoutez un allowlisting d'IP** au niveau du pare-feu ou du proxy — uniquement vos IPs connues
3. **Gardez le paramètre livré `acceptEdits`**, sauf si vous avez une raison claire d'utiliser `bypassPermissions`
4. **Faites tourner vos identifiants Anthropic** si quelque chose semble bizarre
5. **Exécutez derrière Cloudflare Access ou un SSO similaire**, pas une authentification basique

Même avec tout ça, la surface de risque est énorme. Utilisez Tailscale ou Cloudflare Tunnel. Ils sont gratuits, prennent cinq minutes à configurer, et c'est ce que j'utilise personnellement.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :bell: Notifications

Éloignez-vous de votre ordinateur et sachez quand Claude a terminé. Utilise [Apprise](https://github.com/caronc/apprise) pour les notifications — supporte 100+ services dont Discord, Telegram, Slack, Email, Pushover, Gotify, et plus.

**Pour activer :**

1. Ajoutez une ou plusieurs variables `NOTIFY_*` à l'`environment` de votre compose :
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. À l'intérieur du conteneur : `touch ~/.claude/notify-on`

Consultez la [documentation de configuration](docs/configuration.md#notifications-apprise) pour toutes les variables supportées et les formats d'URL.

**Pour désactiver :** `rm ~/.claude/notify-on`

**Événements qui déclenchent des notifications :**
| Événement | Ce qui s'est passé |
|-------|--------------|
| `stop` | Claude a terminé la tâche en cours |
| `error` | Un échec d'utilisation d'outil s'est produit |

> Complètement silencieux quand non configuré. Aucune variable `NOTIFY_*` définie ? Pas de fichier flag ? Zéro appel réseau. Zéro spam dans les logs. Zéro surcharge.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :arrows_counterclockwise: Mises à jour

```bash
# Télécharger la dernière image
docker compose pull

# Recréer le conteneur avec la nouvelle image
docker compose up -d
```

Vos données persistent dans `./data/claude` et `./workspace` — la mise à jour ne remplace que le conteneur, pas vos fichiers.

N'exécutez pas `cloudcli update` ni `npm install -g @cloudcli-ai/cloudcli@latest` dans le conteneur. HolyClaude inclut un runtime CloudCLI patché ; mettez à jour avec `docker compose pull && docker compose up -d`.

Pour épingler une version spécifique plutôt que `latest` :

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :construction: Dépannage

<details>
<summary><strong>CloudCLI affiche le mauvais répertoire par défaut</strong></summary>

CloudCLI s'ouvre sur `/home/claude` au lieu de `/workspace`.

**Cause :** Un script de service CloudCLI personnalisé ou modifié n'a pas défini `WORKSPACES_ROOT=/workspace` avant de lancer CloudCLI.

**Correctif :** Déjà géré dans HolyClaude. Le script de lancement s6 définit `WORKSPACES_ROOT=/workspace` directement dans l'environnement du processus.
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Cause :** Bases de données SQLite sur des montages réseau SMB/CIFS. CIFS ne supporte pas le verrouillage de fichiers au niveau qu'SQLite requiert.

**Correctif :** Ne stockez pas de bases de données SQLite sur des partages réseau. HolyClaude garde `.cloudcli` dans le stockage local du conteneur exactement pour cette raison. Si vous avez vos propres bases de données SQLite dans `/workspace` sur un NAS, déplacez-les vers un chemin local.
</details>

<details>
<summary><strong>Chromium plante / pages blanches / échecs d'onglets</strong></summary>

**Cause :** Mémoire partagée insuffisante. Docker utilise 64 Mo par défaut.

**Correctif :** Assurez-vous que `shm_size: 2g` est dans votre fichier compose. Pour une utilisation intensive du navigateur (nombreux onglets, pages complexes), augmentez à `4g`.
</details>

<details>
<summary><strong>Les observateurs de fichiers ne détectent pas les changements (rechargement à chaud cassé)</strong></summary>

**Cause :** Les montages réseau SMB/CIFS ne supportent pas `inotify`.

**Correctif :** Activez le polling dans l'environnement de votre compose :
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Note : Le polling utilise plus de CPU qu'inotify. Activez-le uniquement sur les montages réseau.
</details>

<details>
<summary><strong>Erreurs de permission refusée</strong></summary>

**Cause :** L'UID/GID du conteneur ne correspond pas à la propriété des fichiers de l'hôte.

**Correctif :**
```bash
# Sur votre machine hôte
id -u  # → c'est votre PUID
id -g  # → c'est votre PGID
```
Définissez-les dans votre fichier compose :
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker crée .claude.json en tant que répertoire</strong></summary>

**Cause :** Si un fichier cible de bind-mount n'existe pas avant le démarrage du conteneur, Docker le crée utilement en tant que répertoire. Merci, Docker.

**Correctif :** Déjà géré — `entrypoint.sh` restaure d'abord le fichier de session enregistré, ou crée un fichier par défaut sûr quand aucune session enregistrée n'existe.
</details>

Consultez [docs/troubleshooting.md](docs/troubleshooting.md) pour le guide complet incluant tous les problèmes SMB/CIFS et l'historique complet des bugs rencontrés et corrigés.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :warning: Problèmes connus

Ce ne sont pas des bugs HolyClaude — ce sont des problèmes en amont ou des compromis intentionnels.

| Problème | Pourquoi | Contournement |
|-------|-----|------------|
| Le bouton "Continue in Shell" ne fonctionne pas | Bug en amont de CloudCLI (race condition dans l'init du terminal) | Utilisez le plugin **Web Terminal** à la place (pré-installé) |
| Cursor CLI "Command timeout" | Pas de clé API configurée — cosmétique uniquement, n'affecte rien | Définissez `CURSOR_API_KEY` ou ignorez |
| Compte CloudCLI perdu à la reconstruction | SQLite ne peut pas persister sur les montages réseau — compromis intentionnel | Recréez le compte (~10 secondes) |
| Notifications push web "not supported" | Limitation du navigateur dans CloudCLI, comportement standard | Utilisez les notifications Apprise à la place (voir [Notifications](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :hammer_and_wrench: Compilation locale

Vous voulez compiler l'image vous-même plutôt que de la télécharger depuis Docker Hub ? Allez-y :

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

Utilisez ensuite `image: holyclaude` au lieu de `image: coderluii/holyclaude:latest` dans votre fichier compose.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :bar_chart: Alternatives

Comment HolyClaude se compare-t-il aux autres approches ?

| Approche | Interface web | Multi-IA | Outils pré-configurés | Navigateur headless | Configuration en une commande | Persistance |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | 50+ outils | Chromium + Xvfb + Playwright | `docker compose up` | Bind mounts |
| Claude Code (bare metal) | Non | Non | Installez vous-même | Installez vous-même | Installation multi-étapes | Manuelle |
| Claude Code + oh-my-openagent | Non | Oui (multi-modèle) | Certains | Non | npm install | Manuelle |
| DIY Docker + Claude Code | Peut-être | Peut-être | Ce que vous ajoutez | Si vous le configurez | Si vous écrivez le Dockerfile | Si vous configurez les volumes |
| Cursor IDE | Intégré | Cursor uniquement | Inclus dans l'IDE | Non | Téléchargez l'app | Données de l'app |

HolyClaude ne concurrence pas les agents de codage — c'est la **couche d'infrastructure** qui les fait tous mieux fonctionner. C'est le conteneur dans lequel vous les exécutez.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :rocket: Feuille de route

Ce qui arrive ensuite :

| Statut | Fonctionnalité |
|--------|---------|
| 🔜 | **Builds natifs ARM** — images ARM64 natives optimisées, pas seulement émulées |
| 🔜 | **Intégration tunnel VS Code** — VS Code Server intégré ou tunnel pour se connecter depuis VS Code Desktop |
| 🔜 | **Routage des notifications** — différentes destinations de notification par type d'événement (erreurs vers Telegram, completions vers Discord) |

Vous avez une idée ? [Démarrez une discussion](https://github.com/CoderLuii/HolyClaude/discussions) ou [demandez une fonctionnalité](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :trophy: Construit avec HolyClaude

Vous utilisez HolyClaude pour construire quelque chose ? Nous serions ravis de le voir.

Ouvrez une issue avec le label `showcase` ou soumettez une PR pour ajouter votre projet ici :

<!-- Add your project: [Project Name](url) — one-line description -->

*Soyez le premier à ajouter votre projet ici.*

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :handshake: Contribuer

Les contributions sont les bienvenues. Ce projet est né d'une utilisation quotidienne réelle, et il s'améliore quand plus de personnes l'utilisent et trouvent des cas limites.

1. Forkez-le
2. Créez une branche (`git checkout -b feature/something`)
3. Committez-le
4. Poussez-le
5. Ouvrez une PR

Bugs, demandes de fonctionnalités, questions : [ouvrez une issue](https://github.com/CoderLuii/HolyClaude/issues).

### Prenez contact

| Canal | Utilisation |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Questions, montrez votre configuration, idées |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Rapports de bugs, demandes de fonctionnalités et de paquets |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Rapports de vulnérabilités (privés) |

### Vous voulez un outil ajouté ?

Utilisez le modèle d'issue [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml). Incluez le nom du paquet, la méthode d'installation, et quelle variante (full/slim) elle devrait cibler.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :heart: Support

HolyClaude est gratuit, open source, et maintenu par un seul développeur qui l'utilise chaque jour.

Si ça vous a fait gagner du temps, voici comment vous pouvez aider :

- **Mettez une étoile à ce repo** — c'est la chose la plus importante que vous puissiez faire pour la visibilité
- **Partagez-le** — parlez-en à un ami, postez-le, tweetez-le
- **Ouvrez des issues** — les rapports de bugs et les demandes de fonctionnalités améliorent HolyClaude pour tout le monde
- **Contribuez** — les PRs sont toujours les bienvenues

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :scroll: Logiciels tiers

L'image Docker HolyClaude inclut des logiciels tiers, chacun sous sa propre licence. Composants notables :

| Composant | Licence | Source |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

Consultez [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) pour les détails complets incluant les notices de modification. Le code source propre à HolyClaude est sous licence MIT.

<p align="right">
  <a href="#top">↑ retour en haut</a>
</p>

---

## :page_facing_up: Licence

MIT — voir [LICENSE](LICENSE). Utilisez-le comme vous voulez.

<p align="right">
  <a href="#top">↑ retour en haut</a>
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

Construit par [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Ce conteneur est ce que j'utilise chaque jour. S'il vous fait gagner ne serait-ce que la moitié du temps de configuration qu'il m'a fait gagner, une étoile serait appréciée.

</div>
