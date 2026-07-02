# ==============================================================================
# HolyClaude — Pre-configured Docker Environment for Claude Code CLI + CloudCLI
# https://github.com/coderluii/holyclaude
#
# Build variants:
#   docker build -t holyclaude .                        # full (default)
#   docker build --build-arg VARIANT=slim -t holyclaude:slim .
# ==============================================================================

FROM node:26.3.0-bookworm-slim

LABEL org.opencontainers.image.source=https://github.com/CoderLuii/HolyClaude

# ---------- Build args ----------
ARG S6_OVERLAY_VERSION=3.2.3.0
ARG TARGETARCH
ARG VARIANT=full

# ---------- Environment ----------
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    DISPLAY=:99 \
    DBUS_SESSION_BUS_ADDRESS=disabled: \
    CHROMIUM_FLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage" \
    CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ---------- s6-overlay v3 (multi-arch) ----------
RUN apt-get update && apt-get install -y --no-install-recommends xz-utils curl ca-certificates && rm -rf /var/lib/apt/lists/*
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/
RUN S6_ARCH=$(case "$TARGETARCH" in arm64) echo "aarch64";; *) echo "x86_64";; esac) && \
    curl -fsSL -o /tmp/s6-overlay-arch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz" && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-arch.tar.xz && \
    rm /tmp/s6-overlay-*.tar.xz

# ---------- System packages (always installed) ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    git curl wget jq ripgrep fd-find unzip zip tree tmux fzf bat bubblewrap \
    # Build tools
    build-essential pkg-config python3 python3-pip python3-venv \
    # Browser (Playwright/Puppeteer)
    chromium \
    # Fonts
    fonts-liberation2 fonts-dejavu-core fonts-noto-core fonts-noto-color-emoji fonts-inter \
    # Locale support
    locales \
    # Debugging tools
    strace lsof iproute2 procps htop \
    # Database CLI tools
    postgresql-client redis-tools sqlite3 \
    # SSH client (NOT server)
    openssh-client \
    # Xvfb for headless Chrome
    xvfb \
    # Image processing
    imagemagick \
    # Sudo
    sudo \
    && rm -rf /var/lib/apt/lists/*

# ---------- bubblewrap setuid (Codex CLI sandbox on restricted kernels) ----------
RUN test -x /usr/bin/bwrap && chown root:root /usr/bin/bwrap && chmod 4755 /usr/bin/bwrap && test "$(stat -c '%a %u %g' /usr/bin/bwrap)" = "4755 0 0"

# ---------- Full-only system packages ----------
RUN if [ "$VARIANT" = "full" ]; then \
    apt-get update && apt-get install -y --no-install-recommends \
      pandoc ffmpeg libvips-dev \
    && rm -rf /var/lib/apt/lists/*; \
    fi

# ---------- Azure CLI (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
    && rm -rf /var/lib/apt/lists/*; \
    fi

# ---------- GitHub CLI ----------
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

# ---------- bat symlink (Debian names it batcat) ----------
RUN ln -sf /usr/bin/batcat /usr/local/bin/bat 2>/dev/null || true

# ---------- Locale configuration ----------
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

# ---------- Create claude user ----------
# The official Node slim image already has UID 1000 as 'node' — rename it to 'claude'
RUN usermod -l claude -d /home/claude -m node && \
    groupmod -n claude node && \
    echo "claude ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/claude && \
    chmod 0440 /etc/sudoers.d/claude

# ---------- Claude Code CLI (native installer) ----------
# CRITICAL: WORKDIR must be non-root-owned or the installer hangs
WORKDIR /workspace
USER claude
RUN curl -fsSL https://claude.ai/install.sh | bash
USER root
RUN rm -f /home/claude/.claude.json
ENV PATH="/home/claude/.local/bin:${PATH}"

# ---------- npm global packages (slim — always installed) ----------
RUN npm i -g \
    typescript@6.0.3 tsx@4.22.4 \
    pnpm@11.6.0 \
    vite@8.0.16 esbuild@0.28.1 \
    eslint@10.5.0 prettier@3.8.4 \
    serve@14.2.6 nodemon@3.1.14 concurrently@10.0.3 \
    dotenv-cli@11.0.0

# ---------- npm global packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g \
      wrangler@4.100.0 vercel@54.14.0 netlify-cli@26.1.0 \
      pm2@7.0.1 \
      prisma@7.8.0 drizzle-kit@0.31.10 \
      eas-cli@20.1.0 \
      lighthouse@13.4.0 @lhci/cli@0.15.1 \
      sharp-cli@5.2.0 json-server@1.0.0-beta.15 http-server@14.1.1 \
      @marp-team/marp-cli@4.4.0 && \
    npm i -g --legacy-peer-deps @cloudflare/next-on-pages@1.13.16; \
    fi

# ---------- Python packages (slim — always installed) ----------
RUN pip install --no-cache-dir --break-system-packages \
    requests==2.34.2 httpx==0.28.1 beautifulsoup4==4.15.0 lxml==6.1.1 \
    Pillow==12.2.0 \
    pandas==3.0.3 numpy==2.4.6 \
    openpyxl==3.1.5 python-docx==1.2.0 \
    jinja2==3.1.6 pyyaml==6.0.3 python-dotenv==1.2.2 markdown==3.10.2 \
    rich==15.0.0 click==8.4.1 tqdm==4.68.2 \
    'desloppify[full]==1.0' bandit==1.9.4 defusedxml==0.7.1 \
    tree-sitter==0.25.2 tree-sitter-language-pack==1.6.2 stevedore==5.8.0 \
    playwright==1.60.0 \
    apprise==1.11.0

# ---------- Python packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    pip install --no-cache-dir --break-system-packages \
      reportlab==4.5.1 weasyprint==69.0 cairosvg==2.9.0 fpdf2==2.8.7 PyMuPDF==1.27.2.3 pdfkit==1.0.0 img2pdf==0.6.3 \
      xlsxwriter==3.2.9 xlrd==2.0.2 \
      matplotlib==3.11.0 seaborn==0.13.2 \
      python-pptx==1.0.2 \
      fastapi==0.137.0 uvicorn==0.49.0; \
    fi

# ---------- AI CLI providers ----------
RUN npm i -g @google/gemini-cli@0.46.0 @openai/codex@0.139.0 task-master-ai@0.43.1
USER claude
RUN curl -fsSL https://cursor.com/install | bash && \
    if [ ! -e /home/claude/.local/bin/cursor ] && [ -e /home/claude/.local/bin/cursor-agent ]; then \
      ln -s /home/claude/.local/bin/cursor-agent /home/claude/.local/bin/cursor; \
    fi
USER root

# ---------- Junie CLI (full only) ----------
USER claude
RUN if [ "$VARIANT" = "full" ]; then \
    curl -fsSL https://junie.jetbrains.com/install.sh | bash; \
    fi
USER root

# ---------- OpenCode CLI (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g opencode-ai@1.17.7; \
    fi

# ---------- Pi Coding Agent (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g --ignore-scripts @earendil-works/pi-coding-agent@0.79.3; \
    fi

ARG CLOUDCLI_VERSION=1.35.1
COPY vendor/artifacts/cloudcli-ai-cloudcli-${CLOUDCLI_VERSION}.tgz /tmp/vendor/cloudcli-ai-cloudcli.tgz

# ---------- CloudCLI (web UI for Claude Code) ----------
RUN npm i -g /tmp/vendor/cloudcli-ai-cloudcli.tgz && rm -f /tmp/vendor/cloudcli-ai-cloudcli.tgz
COPY scripts/patch-cloudcli-apprise-notifications.mjs \
     scripts/patch-cloudcli-codex-permissions.mjs \
     scripts/patch-cloudcli-disable-self-update.mjs \
     /tmp/
COPY --chown=claude:claude scripts/patch-cloudcli-web-terminal-rendering.mjs /tmp/patch-cloudcli-web-terminal-rendering.mjs
RUN touch /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/.env

# patch: disable CloudCLI npm self-update inside HolyClaude (issue #50)
RUN node /tmp/patch-cloudcli-disable-self-update.mjs && rm -f /tmp/patch-cloudcli-disable-self-update.mjs

# CloudCLI 1.35.1 already contains the WebSocket binary-frame fix, provider model
# command flow, and explicit Codex completion exitCode values. Keep build-time
# checks so regressions fail closed.
RUN CLOUDCLI_WS_PROXY="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/websocket/services/plugin-websocket-proxy.service.js" && \
    grep -q "binary: isBinary" "$CLOUDCLI_WS_PROXY" && \
    echo "[patch] WebSocket frame type fix already present upstream"

RUN CLOUDCLI_COMMANDS="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/routes/commands.js" && \
    grep -q "providerModelsService.getProviderModels" "$CLOUDCLI_COMMANDS" && \
    echo "[patch] Provider model command flow already present upstream"

# patch: bridge Codex CloudCLI lifecycle events to Apprise (issue #17)
RUN node /tmp/patch-cloudcli-apprise-notifications.mjs && rm -f /tmp/patch-cloudcli-apprise-notifications.mjs

# patch: configure Codex CloudCLI chat permission mode (issue #18)
RUN node /tmp/patch-cloudcli-codex-permissions.mjs && rm -f /tmp/patch-cloudcli-codex-permissions.mjs

# ---------- CloudCLI plugins (baked into image) ----------
USER claude
RUN mkdir -p /home/claude/.claude-code-ui/plugins && \
    git init /home/claude/.claude-code-ui/plugins/project-stats && \
    cd /home/claude/.claude-code-ui/plugins/project-stats && \
    git remote add origin https://github.com/cloudcli-ai/cloudcli-plugin-starter.git && \
    git fetch --depth 1 origin 4895cd3fd33362471e739b786493aba048487bcc && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse --short=12 HEAD)" = "4895cd3fd333" && \
    npm install && npm run build && \
    git init /home/claude/.claude-code-ui/plugins/web-terminal && \
    cd /home/claude/.claude-code-ui/plugins/web-terminal && \
    git remote add origin https://github.com/cloudcli-ai/cloudcli-plugin-terminal.git && \
    git fetch --depth 1 origin 2bb28540ff5fda84972f99489f976551b8a552e8 && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse --short=12 HEAD)" = "2bb28540ff5f" && \
    node /tmp/patch-cloudcli-web-terminal-rendering.mjs /home/claude/.claude-code-ui/plugins/web-terminal && \
    npm install && npm run build && \
    rm -f /tmp/patch-cloudcli-web-terminal-rendering.mjs && \
    echo '{"project-stats":{"name":"project-stats","source":"https://github.com/cloudcli-ai/cloudcli-plugin-starter","enabled":true},"web-terminal":{"name":"web-terminal","source":"https://github.com/cloudcli-ai/cloudcli-plugin-terminal","enabled":true}}' > /home/claude/.claude-code-ui/plugins.json
USER root

# ---------- Store variant for bootstrap ----------
RUN echo "${VARIANT}" > /etc/holyclaude-variant

# ---------- Copy config files ----------
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY scripts/bootstrap.sh /usr/local/bin/bootstrap.sh
COPY scripts/persist-claude-json.mjs /usr/local/bin/persist-claude-json.mjs
COPY scripts/notify.py /usr/local/bin/notify.py
COPY config/settings.json /usr/local/share/holyclaude/settings.json
COPY config/claude-memory-full.md /usr/local/share/holyclaude/claude-memory-full.md
COPY config/claude-memory-slim.md /usr/local/share/holyclaude/claude-memory-slim.md
RUN chmod +x /usr/local/bin/entrypoint.sh \
    /usr/local/bin/bootstrap.sh \
    /usr/local/bin/persist-claude-json.mjs \
    /usr/local/bin/notify.py

# ---------- s6-overlay service definitions ----------
COPY s6-overlay/s6-rc.d/cloudcli/type /etc/s6-overlay/s6-rc.d/cloudcli/type
COPY s6-overlay/s6-rc.d/cloudcli/run /etc/s6-overlay/s6-rc.d/cloudcli/run
COPY s6-overlay/s6-rc.d/persist-claude-json/type /etc/s6-overlay/s6-rc.d/persist-claude-json/type
COPY s6-overlay/s6-rc.d/persist-claude-json/run /etc/s6-overlay/s6-rc.d/persist-claude-json/run
COPY s6-overlay/s6-rc.d/xvfb/type /etc/s6-overlay/s6-rc.d/xvfb/type
COPY s6-overlay/s6-rc.d/xvfb/run /etc/s6-overlay/s6-rc.d/xvfb/run
RUN chmod +x /etc/s6-overlay/s6-rc.d/cloudcli/run \
    /etc/s6-overlay/s6-rc.d/persist-claude-json/run \
    /etc/s6-overlay/s6-rc.d/xvfb/run && \
    touch /etc/s6-overlay/s6-rc.d/user/contents.d/cloudcli && \
    touch /etc/s6-overlay/s6-rc.d/user/contents.d/persist-claude-json && \
    touch /etc/s6-overlay/s6-rc.d/user/contents.d/xvfb

# ---------- Working directory ----------
WORKDIR /workspace

# ---------- Health check ----------
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:3001/ || exit 1

# ---------- s6-overlay as PID 1 ----------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
