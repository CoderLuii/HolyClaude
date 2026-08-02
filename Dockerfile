# ==============================================================================
# HolyClaude — Pre-configured Docker Environment for Claude Code CLI + CloudCLI
# https://github.com/coderluii/holyclaude
#
# Build variants:
#   docker build -t holyclaude .                        # full (default)
#   docker build --build-arg VARIANT=slim -t holyclaude:slim .
# ==============================================================================

FROM golang:1.26.5-bookworm@sha256:1ecb7edf62a0408027bd5729dfd6b1b8766e578e8df93995b225dfd0944eb651 AS esbuild-builder

ARG TARGETARCH
RUN case "$TARGETARCH" in amd64) ;; arm64) ;; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac; \
    set -eux; \
    for ESBUILD_VERSION in 0.15.18 0.18.20 0.25.12; do \
      mkdir -p "/out/${ESBUILD_VERSION}"; \
      CGO_ENABLED=0 GOOS=linux GOARCH="$TARGETARCH" GOBIN="/out/${ESBUILD_VERSION}" \
        go install "github.com/evanw/esbuild/cmd/esbuild@v${ESBUILD_VERSION}"; \
      test "$("/out/${ESBUILD_VERSION}/esbuild" --version)" = "$ESBUILD_VERSION"; \
    done

FROM node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73

ARG HOLYCLAUDE_VERSION=1.5.6
LABEL org.opencontainers.image.source=https://github.com/CoderLuii/HolyClaude
LABEL org.opencontainers.image.version=${HOLYCLAUDE_VERSION}

# ---------- Build args ----------
ARG S6_OVERLAY_VERSION=3.2.3.2
ARG S6_NOARCH_SHA256=5379750ed30a84bbd2e2dd74847ba6b5bd29cd0b2e3ea2ec58049b57eb2eda12
ARG S6_ARCHIVE_SHA256_AMD64=e6befcc96a437a3831386ecfc51808c5d3e939dc5fe3c02ae9284599e8aa2408
ARG S6_ARCHIVE_SHA256_ARM64=b17f17a82e7a515c682a91edaf2ffdabb73f891981b6c1fd712115693a2f8b4c
ARG FZF_VERSION=0.74.1
ARG FZF_ARCHIVE_SHA256_AMD64=df53438be5f51e151bb4044d78fda72bdfe209e3ecd2baecae48e8dea370c81b
ARG FZF_ARCHIVE_SHA256_ARM64=f22204dd1a091d43e102268d062fd53b47133c8d8581671ee5eb225b75e31183
ARG CHROMIUM_DEBIAN_VERSION=151.0.7922.71-1~deb12u1
ARG CHROMIUM_PACKAGE_SHA256_AMD64=455423ff7608b4a2af8ef6e66596ce86d313ae9e055381feee9e39df9f6165ef
ARG CHROMIUM_PACKAGE_SHA256_ARM64=1abbdfc529cd7b8576ec41b2f2aa4660888f7fd3efd6579b3d79cfc30bc0389d
ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=a99c21a89cac35e18997df511d4173cfb7bc57ea0312e88b0c3b99e564050938
ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=d26cdb3cc2ed1080a499603f5f0483ee9f377c9a753a8469dcf5be2004e74e8d
ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=d3ae37073eb000326047e9d352beb32333beb6d0b1655dfe389ff2ba2a26a9c9
ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=99c6c715559c7f6fd6f116880d3427bb1289f4c33ebcbfa51127c1ae7230e4eb
ARG CLAUDE_CODE_VERSION=2.1.220
ARG CLAUDE_INSTALLER_SHA256=cde4f1702d3b1695f92b73d26888364e17bca476e17f0fd676484c951d36c125
ARG CLAUDE_BINARY_SHA256_AMD64=674f61f20ff306f3100cf9200e4c36c4b70278b5bef2884549819b942a89c863
ARG CLAUDE_BINARY_SHA256_ARM64=159e4a51d796f3bf14677577100f7efb845611b1ceaf0c30cbd8d4650d942185
ARG JUNIE_VERSION=2470.4
ARG JUNIE_ARCHIVE_SHA256_AMD64=661dba7d55e097ae0eb62ff2475b4e9fe7a59d8e25560d8c1981aad85901b60c
ARG JUNIE_ARCHIVE_SHA256_ARM64=976c6f974598bb34197f434dd041cfbb1cd663d95702ee3260bcb07815a0f630
ARG CURSOR_BUILD_ID=2026.07.23-e383d2b
ARG CURSOR_ARCHIVE_SHA256_AMD64=702ad595213bee5df0268be9f80a19f29fcceaa2a42fc55e39f2b5199051f0c4
ARG CURSOR_ARCHIVE_SHA256_ARM64=f40b99647cb24e0da885e97620a2048034f1fe8961910d573d827d77c4d26dcb
ARG CURSOR_LAUNCHER_SHA256=eed61c5224668c9236334c4c68936a16aecc37374b592f59e31eb50433817831
ARG CURSOR_NODE_SHA256_AMD64=e0e46d3a1c0667117303412647cafcbcefb1be7612493015ec8fd6b7440162a4
ARG CURSOR_NODE_SHA256_ARM64=47befb5f57df96771ce343d6293349ecf4d46c91110b626423ec3a49d2fee7c1
ARG SETUPTOOLS_VERSION=83.0.0
ARG SETUPTOOLS_WHEEL_SHA256=29b23c360f22f414dc7336bb39178cc7bcbf6021ed2733cde173f09dba19abb3
ARG PISCINA_VERSION=4.9.3
ARG PISCINA_ARCHIVE_SHA256=5207b79c42ff172230529f5aa355f17d855b1481836bc841db19c6081fc5ec1e
ARG BRACE_EXPANSION_VERSION=5.0.9
ARG BRACE_EXPANSION_ARCHIVE_SHA256=5d06001fddd25cbee90c96db4dc5b7b57711b984c3141e28d10f143deb52dbaf
ARG GLOB_VERSION=11.1.0
ARG GLOB_ARCHIVE_SHA256=8816e244d245d86a1b8adf9ed0bf61c9665dbb1ee7b00dd6b3283f3ac0393bfb
ARG JS_YAML_VERSION=4.3.0
ARG JS_YAML_ARCHIVE_SHA256=8594ee34496dd2e41ec934fd202843dc993be9ab2d7d5d47579146962fbdfae6
ARG MINIMATCH_5_VERSION=5.1.9
ARG MINIMATCH_5_ARCHIVE_SHA256=67e7dacfba9fcabb6ac661620b67e6c22600b4aa56ffa14431cbdfdeebbd4cfe
ARG MINIMATCH_10_VERSION=10.2.6
ARG MINIMATCH_10_ARCHIVE_SHA256=5a3d2c8074a28229665727e47b8a1090941856a7962905efe05d20d3760355f8
ARG NODE_FORGE_VERSION=1.4.0
ARG NODE_FORGE_ARCHIVE_SHA256=bf9d7ca0d774235354697bd4b5e642af6505e7ce2066762c3b855138cf870820
ARG PATH_TO_REGEXP_6_VERSION=6.3.0
ARG PATH_TO_REGEXP_6_ARCHIVE_SHA256=da302284390341278d3dad1014f2043cf844f6a2163aa8dc5686d321d82742e6
ARG PATH_TO_REGEXP_8_VERSION=8.4.2
ARG PATH_TO_REGEXP_8_ARCHIVE_SHA256=e8712a9c53b0a2a27cfecc7b80c54df92afb4643c01351e2b2ebb7784bcabd78
ARG WS_VERSION=8.21.1
ARG WS_ARCHIVE_SHA256=bb0f7e58ba1f64746672734d36175fe185f226491e336abc0743e2a8f4472ec1
ARG AZURE_CLI_VERSION=2.88.0-1~bookworm
ARG AZURE_CLI_INSTALLER_SHA256=01fada4dafe903fa6edae138d3e3ca2e6e4295d7c8a35e48632bba4aa9dbe9d9
ARG GITHUB_CLI_VERSION=2.97.0
ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=7c7fa3bb890db0934baf65910d97b8c0fa437b2e590f7f7daf6bdf82c5c486d7
ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=0ba7a76739c865d82ebde24667d875d9b8caa55db47c7597c24accdd4defd2bb
ARG NODE_TAR_VERSION=7.5.22
ARG NODE_TAR_SHA256=b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6
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
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_PATH=/usr/local/lib/node_modules

# ---------- s6-overlay v3 (multi-arch) ----------
RUN apt-get update && apt-get install -y --no-install-recommends xz-utils curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN S6_ARCH=$(case "$TARGETARCH" in amd64) echo "x86_64";; arm64) echo "aarch64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    S6_ARCH_SHA256=$(case "$TARGETARCH" in amd64) echo "$S6_ARCHIVE_SHA256_AMD64";; arm64) echo "$S6_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    for S6_ASSET in noarch "$S6_ARCH"; do \
      S6_EXPECTED_SHA256=$(case "$S6_ASSET" in noarch) echo "$S6_NOARCH_SHA256";; *) echo "$S6_ARCH_SHA256";; esac); \
      curl -fsSL -o "/tmp/s6-overlay-${S6_ASSET}.tar.xz" \
        "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ASSET}.tar.xz"; \
      curl -fsSL -o "/tmp/s6-overlay-${S6_ASSET}.tar.xz.sha256" \
        "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ASSET}.tar.xz.sha256"; \
      test "$(cut -d' ' -f1 "/tmp/s6-overlay-${S6_ASSET}.tar.xz.sha256")" = "$S6_EXPECTED_SHA256"; \
      echo "$S6_EXPECTED_SHA256  /tmp/s6-overlay-${S6_ASSET}.tar.xz" | sha256sum -c -; \
    done && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf "/tmp/s6-overlay-${S6_ARCH}.tar.xz" && \
    rm /tmp/s6-overlay-*.tar.xz /tmp/s6-overlay-*.tar.xz.sha256

# ---------- System packages (always installed) ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    git curl wget jq ripgrep fd-find unzip zip tree tmux bat bubblewrap \
    # Build tools
    build-essential pkg-config python3 python3-pip python3-venv \
    # Fonts
    fonts-liberation2 fonts-dejavu-core fonts-noto-core fonts-noto-color-emoji fonts-inter \
    # Locale support
    locales \
    # Debugging tools
    strace lsof iproute2 procps htop \
    # Database CLI tools
    postgresql-client redis-tools sqlite3 \
    # SSH/Mosh remote shell support (disabled by default)
    openssh-client openssh-server mosh \
    # Xvfb for headless Chrome
    xvfb \
    # Image processing
    imagemagick \
    # Sudo
    sudo \
    && rm -rf /var/lib/apt/lists/*

# ---------- Browser runtime (checksum-verified Bookworm security packages) ----------
RUN set -eux; \
    case "$TARGETARCH" in amd64) DEB_ARCH=amd64; CHROMIUM_PACKAGE_SHA256="$CHROMIUM_PACKAGE_SHA256_AMD64"; CHROMIUM_COMMON_PACKAGE_SHA256="$CHROMIUM_COMMON_PACKAGE_SHA256_AMD64"; CHROMIUM_SANDBOX_PACKAGE_SHA256="$CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64";; arm64) DEB_ARCH=arm64; CHROMIUM_PACKAGE_SHA256="$CHROMIUM_PACKAGE_SHA256_ARM64"; CHROMIUM_COMMON_PACKAGE_SHA256="$CHROMIUM_COMMON_PACKAGE_SHA256_ARM64"; CHROMIUM_SANDBOX_PACKAGE_SHA256="$CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac; \
    mkdir -p /tmp/chromium-debs; \
    cd /tmp/chromium-debs; \
    apt-get update; \
    apt-get download \
      "chromium=${CHROMIUM_DEBIAN_VERSION}" \
      "chromium-common=${CHROMIUM_DEBIAN_VERSION}" \
      "chromium-sandbox=${CHROMIUM_DEBIAN_VERSION}"; \
    printf '%s  %s\n' \
      "$CHROMIUM_PACKAGE_SHA256" "chromium_${CHROMIUM_DEBIAN_VERSION}_${DEB_ARCH}.deb" \
      "$CHROMIUM_COMMON_PACKAGE_SHA256" "chromium-common_${CHROMIUM_DEBIAN_VERSION}_${DEB_ARCH}.deb" \
      "$CHROMIUM_SANDBOX_PACKAGE_SHA256" "chromium-sandbox_${CHROMIUM_DEBIAN_VERSION}_${DEB_ARCH}.deb" \
      | sha256sum -c -; \
    apt-get install -y --no-install-recommends ./*.deb; \
    test "$(dpkg-query -W -f='${Version}' chromium)" = "$CHROMIUM_DEBIAN_VERSION"; \
    test "$(dpkg-query -W -f='${Version}' chromium-common)" = "$CHROMIUM_DEBIAN_VERSION"; \
    test "$(dpkg-query -W -f='${Version}' chromium-sandbox)" = "$CHROMIUM_DEBIAN_VERSION"; \
    cd /; \
    rm -rf /tmp/chromium-debs /var/lib/apt/lists/*

# ---------- fzf (official multi-arch release) ----------
RUN FZF_ARCH=$(case "$TARGETARCH" in amd64) echo "amd64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    FZF_ARCHIVE_SHA256=$(case "$TARGETARCH" in amd64) echo "$FZF_ARCHIVE_SHA256_AMD64";; arm64) echo "$FZF_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    FZF_ASSET="fzf-${FZF_VERSION}-linux_${FZF_ARCH}.tar.gz" && \
    curl -fsSL -o "/tmp/${FZF_ASSET}" \
      "https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}/${FZF_ASSET}" && \
    curl -fsSL -o /tmp/fzf-checksums.txt \
      "https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}/fzf_${FZF_VERSION}_checksums.txt" && \
    test "$(grep -F "  ${FZF_ASSET}" /tmp/fzf-checksums.txt | cut -d' ' -f1)" = "$FZF_ARCHIVE_SHA256" && \
    echo "$FZF_ARCHIVE_SHA256  /tmp/${FZF_ASSET}" | sha256sum -c - && \
    tar -xzf "/tmp/${FZF_ASSET}" -C /usr/local/bin fzf && \
    test "$(/usr/local/bin/fzf --version | awk '{print $1}')" = "$FZF_VERSION" && \
    rm -f "/tmp/${FZF_ASSET}" /tmp/fzf-checksums.txt

RUN rm -f /etc/ssh/ssh_host_*_key /etc/ssh/ssh_host_*_key.pub

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
    curl -fsSL https://aka.ms/InstallAzureCLIDeb -o /tmp/azure-cli-install.sh && \
    echo "$AZURE_CLI_INSTALLER_SHA256  /tmp/azure-cli-install.sh" | sha256sum -c - && \
    bash /tmp/azure-cli-install.sh && \
    test "$(dpkg-query -W -f='${Version}' azure-cli)" = "$AZURE_CLI_VERSION" && \
    rm -f /tmp/azure-cli-install.sh && rm -rf /var/lib/apt/lists/*; \
    fi

# ---------- GitHub CLI ----------
RUN GITHUB_CLI_ARCH=$(case "$TARGETARCH" in amd64) echo "amd64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    GITHUB_CLI_PACKAGE_SHA256=$(case "$TARGETARCH" in amd64) echo "$GITHUB_CLI_PACKAGE_SHA256_AMD64";; arm64) echo "$GITHUB_CLI_PACKAGE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    GITHUB_CLI_PACKAGE="gh_${GITHUB_CLI_VERSION}_linux_${GITHUB_CLI_ARCH}.deb" && \
    curl -fsSL -o "/tmp/${GITHUB_CLI_PACKAGE}" \
      "https://github.com/cli/cli/releases/download/v${GITHUB_CLI_VERSION}/${GITHUB_CLI_PACKAGE}" && \
    echo "$GITHUB_CLI_PACKAGE_SHA256  /tmp/${GITHUB_CLI_PACKAGE}" | sha256sum -c - && \
    apt-get update && apt-get install -y "/tmp/${GITHUB_CLI_PACKAGE}" && \
    test "$(dpkg-query -W -f='${Version}' gh)" = "$GITHUB_CLI_VERSION" && \
    rm -f "/tmp/${GITHUB_CLI_PACKAGE}" && \
    rm -rf /var/lib/apt/lists/*

# ---------- bat symlink (Debian names it batcat) ----------
RUN ln -sf /usr/bin/batcat /usr/local/bin/bat 2>/dev/null || true

# ---------- Locale configuration ----------
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

# ---------- Create claude user ----------
# The official Node slim image already has UID 1000 as 'node' — rename it to 'claude'
RUN usermod -l claude -d /home/claude -m node && \
    groupmod -n claude node && \
    mkdir -p /home/claude/.cloudcli && \
    chown claude:claude /home/claude/.cloudcli && \
    echo "claude ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/claude && \
    chmod 0440 /etc/sudoers.d/claude

# ---------- Claude Code CLI (native installer) ----------
# CRITICAL: WORKDIR must be non-root-owned or the installer hangs
WORKDIR /workspace
USER claude
RUN CLAUDE_BINARY_SHA256=$(case "$TARGETARCH" in amd64) echo "$CLAUDE_BINARY_SHA256_AMD64";; arm64) echo "$CLAUDE_BINARY_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    curl -fsSL https://claude.ai/install.sh -o /tmp/claude-install.sh && \
    echo "$CLAUDE_INSTALLER_SHA256  /tmp/claude-install.sh" | sha256sum -c - && \
    bash /tmp/claude-install.sh "$CLAUDE_CODE_VERSION" && \
    test "$(/home/claude/.local/bin/claude --version | awk '{print $1}')" = "$CLAUDE_CODE_VERSION" && \
    echo "$CLAUDE_BINARY_SHA256  $(readlink -f /home/claude/.local/bin/claude)" | sha256sum -c - && \
    rm -f /tmp/claude-install.sh
USER root
RUN rm -f /home/claude/.claude.json
ENV PATH="/home/claude/.local/bin:${PATH}"

# ---------- npm global packages (slim — always installed) ----------
RUN npm install -g npm@11.19.0 && \
    test "$(npm --version)" = "11.19.0"

RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i -g \
    playwright@1.61.0 \
    typescript@6.0.3 tsx@4.23.1 \
    pnpm@11.18.0 \
    vite@8.2.0 esbuild@0.28.1 \
    eslint@10.8.0 prettier@3.9.6 \
    serve@14.2.6 nodemon@3.1.14 concurrently@10.0.4 \
    dotenv-cli@11.0.0

# ---------- npm global packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g \
      wrangler@4.116.0 vercel@54.21.1 netlify-cli@26.2.0 \
      pm2@7.0.3 \
      prisma@7.9.1 drizzle-kit@0.31.10 \
      eas-cli@20.5.1 \
      lighthouse@13.4.1 @lhci/cli@0.15.1 \
      sharp-cli@5.2.0 json-server@1.0.0-beta.15 http-server@14.1.1 \
      @marp-team/marp-cli@4.5.0 && \
    npm i -g --legacy-peer-deps @cloudflare/next-on-pages@1.13.16; \
    fi

# EAS 20 and Vercel 54 pin tar 7.5.7. Replace only their installed copies
# with the checksum-bound fix for CVE-2026-59873, then update exact metadata.
COPY scripts/patch-global-node-tar.mjs /tmp/patch-global-node-tar.mjs
RUN if [ "$VARIANT" = "full" ]; then \
      node /tmp/patch-global-node-tar.mjs --root / --check-baseline && \
      curl -fsSL "https://registry.npmjs.org/tar/-/tar-${NODE_TAR_VERSION}.tgz" -o /tmp/node-tar.tgz && \
      echo "$NODE_TAR_SHA256  /tmp/node-tar.tgz" | sha256sum -c - && \
      for target in \
        /usr/local/lib/node_modules/eas-cli/node_modules/tar \
        /usr/local/lib/node_modules/vercel/node_modules/tar; do \
        rm -rf "$target" && \
        mkdir -p "$target" && \
        tar -xzf /tmp/node-tar.tgz --strip-components=1 -C "$target"; \
      done && \
      node /tmp/patch-global-node-tar.mjs --root / && \
      test "$(node -p "require('/usr/local/lib/node_modules/eas-cli/node_modules/tar/package.json').version")" = "$NODE_TAR_VERSION" && \
      test "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/tar/package.json').version")" = "$NODE_TAR_VERSION" && \
      node -e "for (const path of ['/usr/local/lib/node_modules/eas-cli/node_modules/tar', '/usr/local/lib/node_modules/vercel/node_modules/tar']) { if (typeof require(path).list !== 'function') throw new Error('invalid tar module at ' + path); }" && \
      eas --version >/dev/null && \
      vercel --version >/dev/null && \
      rm -f /tmp/node-tar.tgz; \
    fi

# Netlify CLI 26.2.0 bundles an optional local Go/Rust functions proxy built
# with Go 1.16.7. Keep the deployment CLI, but remove that stale executable.
RUN if [ "$VARIANT" = "full" ]; then \
      NETLIFY_PROXY_ARCH=$(case "$TARGETARCH" in amd64) echo "x64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
      NETLIFY_PROXY_ROOT="/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-${NETLIFY_PROXY_ARCH}" && \
      test "$(node -p "require('${NETLIFY_PROXY_ROOT}/package.json').version")" = "1.1.1" && \
      test -x "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      rm -f "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      test ! -e "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      test "$(node -p "require('/usr/local/lib/node_modules/netlify-cli/package.json').version")" = "26.2.0" && \
      netlify --version >/dev/null; \
    fi

# Rebuild the exact esbuild versions retained by full-only tools with the
# pinned Go toolchain, replacing old upstream native executables only.
COPY --from=esbuild-builder /out/0.15.18/esbuild /tmp/esbuild-0.15.18
COPY --from=esbuild-builder /out/0.18.20/esbuild /tmp/esbuild-0.18.20
COPY --from=esbuild-builder /out/0.25.12/esbuild /tmp/esbuild-0.25.12
RUN if [ "$VARIANT" = "full" ]; then \
      ESBUILD_PACKAGE_ARCH=$(case "$TARGETARCH" in amd64) echo "linux-x64";; arm64) echo "linux-arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
      install -m 0755 /tmp/esbuild-0.15.18 \
        /usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/esbuild/bin/esbuild && \
      install -m 0755 /tmp/esbuild-0.18.20 \
        "/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild" && \
      install -m 0755 /tmp/esbuild-0.25.12 \
        "/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild" && \
      test "$(/usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/esbuild/bin/esbuild --version)" = "0.15.18" && \
      test "$(/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild --version)" = "0.18.20" && \
      test "$(/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild --version)" = "0.25.12"; \
    fi && \
    rm -f /tmp/esbuild-0.15.18 /tmp/esbuild-0.18.20 /tmp/esbuild-0.25.12

# ---------- Python packages (slim — always installed) ----------
RUN pip install --no-cache-dir --break-system-packages \
    requests==2.34.2 httpx==0.28.1 beautifulsoup4==4.15.0 lxml==6.1.1 \
    Pillow==12.3.0 \
    pandas==3.0.5 numpy==2.4.6 \
    openpyxl==3.1.5 python-docx==1.2.0 \
    jinja2==3.1.6 pyyaml==6.0.3 python-dotenv==1.2.2 markdown==3.10.3 \
    rich==15.0.0 click==8.4.2 tqdm==4.70.0 \
    'desloppify[full]==1.0' bandit==1.9.4 defusedxml==0.7.1 \
    tree-sitter==0.26.0 tree-sitter-language-pack==1.6.2 stevedore==5.9.0 \
    playwright==1.61.0 \
    apprise==1.12.0

COPY scripts/holyclaude-chromium /usr/local/bin/holyclaude-chromium
RUN test "$(dpkg-query -W -f='${Version}' chromium)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test "$(dpkg-query -W -f='${Version}' chromium-common)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test "$(dpkg-query -W -f='${Version}' chromium-sandbox)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test -x /usr/lib/chromium/chromium && \
    chmod +x /usr/local/bin/holyclaude-chromium && \
    ln -sf /usr/local/bin/holyclaude-chromium /usr/bin/chromium && \
    test "$(node -p "require('/usr/local/lib/node_modules/playwright/package.json').version")" = "1.61.0" && \
    test "$(python3 -c "import importlib.metadata; print(importlib.metadata.version('playwright'))")" = "1.61.0" && \
    test "$(/usr/bin/chromium --version | awk '{print $2}')" = "${CHROMIUM_DEBIAN_VERSION%%-*}" && \
    runuser -u claude -- test -r /usr/lib/chromium/chromium && \
    runuser -u claude -- test -x /usr/lib/chromium/chromium && \
    runuser -u claude -- /usr/bin/chromium --version

# ---------- Python packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    pip install --no-cache-dir --break-system-packages \
      reportlab==5.0.0 weasyprint==69.0 cairosvg==2.9.0 fpdf2==2.8.7 PyMuPDF==1.28.0 img2pdf==0.6.3 \
      xlsxwriter==3.2.9 xlrd==2.0.2 \
      matplotlib==3.11.1 seaborn==0.13.2 \
      python-pptx==1.0.2 \
      fastapi==0.141.1 uvicorn==0.52.0; \
    fi

# Replace Bookworm's runtime setuptools copy after all image packages are built.
RUN curl -fsSL \
      "https://files.pythonhosted.org/packages/5d/40/e1e72872c6354b306daef1703549e8e83b4d43cfea356311bf722a043752/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" \
      -o "/tmp/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" && \
    echo "$SETUPTOOLS_WHEEL_SHA256  /tmp/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" | sha256sum -c - && \
    pip install --no-cache-dir --no-deps --break-system-packages "/tmp/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" && \
    rm -rf /usr/lib/python3/dist-packages/setuptools \
      /usr/lib/python3/dist-packages/setuptools-66.1.1.egg-info \
      /usr/lib/python3/dist-packages/pkg_resources \
      /usr/lib/python3/dist-packages/_distutils_hack && \
    test "$(python3 -c "import importlib.metadata; print(importlib.metadata.version('setuptools'))")" = "$SETUPTOOLS_VERSION" && \
    python3 -m pip --version >/dev/null && \
    rm -f "/tmp/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl"

# ---------- AI CLI providers ----------
RUN npm i -g @google/gemini-cli@0.53.0 @openai/codex@0.146.0 task-master-ai@0.43.1
USER claude
RUN CURSOR_ASSET_ARCH=$(case "$TARGETARCH" in amd64) echo "x64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_ARCHIVE_SHA256=$(case "$TARGETARCH" in amd64) echo "$CURSOR_ARCHIVE_SHA256_AMD64";; arm64) echo "$CURSOR_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_NODE_SHA256=$(case "$TARGETARCH" in amd64) echo "$CURSOR_NODE_SHA256_AMD64";; arm64) echo "$CURSOR_NODE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_DIR="/home/claude/.local/share/cursor-agent/versions/$CURSOR_BUILD_ID" && \
    curl -fsSL "https://downloads.cursor.com/lab/${CURSOR_BUILD_ID}/linux/${CURSOR_ASSET_ARCH}/agent-cli-package.tar.gz" -o /tmp/cursor-agent.tar.gz && \
    echo "$CURSOR_ARCHIVE_SHA256  /tmp/cursor-agent.tar.gz" | sha256sum -c - && \
    test "$(tar -tzf /tmp/cursor-agent.tar.gz | cut -d/ -f1 | sort -u)" = "dist-package" && \
    tar -tzf /tmp/cursor-agent.tar.gz | grep -Fxq 'dist-package/cursor-agent' && \
    tar -tzf /tmp/cursor-agent.tar.gz | grep -Fxq 'dist-package/node' && \
    rm -rf "$CURSOR_DIR" && \
    mkdir -p "$CURSOR_DIR" /home/claude/.local/bin && \
    tar --strip-components=1 -xzf /tmp/cursor-agent.tar.gz -C "$CURSOR_DIR" && \
    ln -sfn "$CURSOR_DIR/cursor-agent" /home/claude/.local/bin/agent && \
    ln -sfn "$CURSOR_DIR/cursor-agent" /home/claude/.local/bin/cursor-agent && \
    ln -sfn "$CURSOR_DIR/cursor-agent" /home/claude/.local/bin/cursor && \
    echo "$CURSOR_LAUNCHER_SHA256  $CURSOR_DIR/cursor-agent" | sha256sum -c - && \
    echo "$CURSOR_NODE_SHA256  $CURSOR_DIR/node" | sha256sum -c - && \
    ! grep -aFq -- '--permission' "$CURSOR_DIR/cursor-agent" && \
    ! grep -aFq -- '--allow-fs-read' "$CURSOR_DIR/cursor-agent" && \
    ! grep -aFq -- '--allow-fs-write' "$CURSOR_DIR/cursor-agent" && \
    rm -f "$CURSOR_DIR/node" && \
    ln -s /usr/local/bin/node "$CURSOR_DIR/node" && \
    test "$(readlink -f "$CURSOR_DIR/node")" = "$(readlink -f /usr/local/bin/node)" && \
    test "$("$CURSOR_DIR/node" --version)" = "v26.5.1" && \
    test "$(cursor-agent --version)" = "$CURSOR_BUILD_ID" && \
    cursor-agent --help >/dev/null && \
    rm -f /tmp/cursor-agent.tar.gz
USER root

# ---------- Junie CLI (full only) ----------
USER claude
RUN if [ "$VARIANT" = "full" ]; then \
    JUNIE_PLATFORM=$(case "$TARGETARCH" in amd64) echo "amd64";; arm64) echo "aarch64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    JUNIE_ARCHIVE_SHA256=$(case "$TARGETARCH" in amd64) echo "$JUNIE_ARCHIVE_SHA256_AMD64";; arm64) echo "$JUNIE_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    JUNIE_ARCHIVE="junie-release-${JUNIE_VERSION}-linux-${JUNIE_PLATFORM}.zip" && \
    curl -fsSL "https://github.com/jetbrains-junie/junie/releases/download/${JUNIE_VERSION}/${JUNIE_ARCHIVE}" -o "/tmp/${JUNIE_ARCHIVE}" && \
    echo "$JUNIE_ARCHIVE_SHA256  /tmp/${JUNIE_ARCHIVE}" | sha256sum -c - && \
    JUNIE_TARGET="/home/claude/.local/share/junie/versions/$JUNIE_VERSION" && \
    JUNIE_STAGING="/home/claude/.local/share/junie/versions/.${JUNIE_VERSION}.tmp" && \
    rm -rf "$JUNIE_STAGING" "$JUNIE_TARGET" && \
    mkdir -p "$JUNIE_STAGING" /home/claude/.local/bin && \
    JUNIE_TOP_LEVEL=$(unzip -Z1 "/tmp/${JUNIE_ARCHIVE}" | cut -d/ -f1 | sort -u | tr '\n' ' ') && \
    test "$JUNIE_TOP_LEVEL" = "channel junie junie-app shim " && \
    unzip -q "/tmp/${JUNIE_ARCHIVE}" 'junie-app/*' -d "$JUNIE_STAGING" && \
    test -x "$JUNIE_STAGING/junie-app/bin/junie" && \
    mv "$JUNIE_STAGING/junie-app" "$JUNIE_TARGET" && \
    rmdir "$JUNIE_STAGING" && \
    ln -sfn "$JUNIE_TARGET" /home/claude/.local/share/junie/current && \
    ln -sfn /home/claude/.local/share/junie/current/bin/junie /home/claude/.local/bin/junie && \
    test "$(readlink /home/claude/.local/share/junie/current)" = "/home/claude/.local/share/junie/versions/$JUNIE_VERSION" && \
    /home/claude/.local/bin/junie --version >/dev/null && \
    rm -f "/tmp/${JUNIE_ARCHIVE}"; \
    fi
USER root

# ---------- OpenCode CLI (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g opencode-ai@1.18.10; \
    fi

# ---------- Pi Coding Agent (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g --ignore-scripts @earendil-works/pi-coding-agent@0.82.1; \
    fi

# Replace compatible vulnerable transitive packages without changing tool majors.
COPY scripts/patch-global-node-security-dependencies.mjs /tmp/patch-global-node-security-dependencies.mjs
RUN set -eux; \
    replace_node_module() { \
      package_name="$1"; \
      package_version="$2"; \
      archive_sha256="$3"; \
      shift 3; \
      archive="/tmp/${package_name}-${package_version}.tgz"; \
      curl -fsSL "https://registry.npmjs.org/${package_name}/-/${package_name}-${package_version}.tgz" -o "$archive"; \
      echo "$archive_sha256  $archive" | sha256sum -c -; \
      test "$(tar -tzf "$archive" | cut -d/ -f1 | sort -u)" = "package"; \
      for target in "$@"; do \
        rm -rf "$target"; \
        mkdir -p "$target"; \
        tar -xzf "$archive" --strip-components=1 -C "$target"; \
        test "$(node -p "require('${target}/package.json').name")" = "$package_name"; \
        test "$(node -p "require('${target}/package.json').version")" = "$package_version"; \
      done; \
      rm -f "$archive"; \
    }; \
    node /tmp/patch-global-node-security-dependencies.mjs --root / --variant "$VARIANT" --check-baseline; \
    replace_node_module piscina "$PISCINA_VERSION" "$PISCINA_ARCHIVE_SHA256" \
      "/home/claude/.local/share/cursor-agent/versions/$CURSOR_BUILD_ID/node_modules/piscina"; \
    replace_node_module brace-expansion "$BRACE_EXPANSION_VERSION" "$BRACE_EXPANSION_ARCHIVE_SHA256" \
      /usr/local/lib/node_modules/npm/node_modules/brace-expansion; \
    if [ "$VARIANT" = "full" ]; then \
      replace_node_module brace-expansion "$BRACE_EXPANSION_VERSION" "$BRACE_EXPANSION_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/brace-expansion; \
      replace_node_module glob "$GLOB_VERSION" "$GLOB_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/sharp-cli/node_modules/glob; \
      replace_node_module js-yaml "$JS_YAML_VERSION" "$JS_YAML_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/js-yaml; \
      replace_node_module minimatch "$MINIMATCH_5_VERSION" "$MINIMATCH_5_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/eas-cli/node_modules/minimatch; \
      replace_node_module minimatch "$MINIMATCH_10_VERSION" "$MINIMATCH_10_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/minimatch; \
      replace_node_module node-forge "$NODE_FORGE_VERSION" "$NODE_FORGE_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/eas-cli/node_modules/node-forge; \
      replace_node_module path-to-regexp "$PATH_TO_REGEXP_6_VERSION" "$PATH_TO_REGEXP_6_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/@vercel/node/node_modules/path-to-regexp \
        /usr/local/lib/node_modules/vercel/node_modules/@vercel/remix-builder/node_modules/path-to-regexp; \
      replace_node_module path-to-regexp "$PATH_TO_REGEXP_8_VERSION" "$PATH_TO_REGEXP_8_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/path-to-regexp \
        /usr/local/lib/node_modules/vercel/node_modules/@vercel/fun/node_modules/path-to-regexp; \
      replace_node_module ws "$WS_VERSION" "$WS_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws; \
    fi; \
    node /tmp/patch-global-node-security-dependencies.mjs --root / --variant "$VARIANT"; \
    test "$(npm --version)" = "11.19.0"; \
    test "$(cursor-agent --version)" = "$CURSOR_BUILD_ID"; \
    if [ "$VARIANT" = "full" ]; then \
      eas --version >/dev/null; \
      vercel --version >/dev/null; \
      test "$(next-on-pages --version)" = "1.13.16"; \
      sharp --version >/dev/null; \
    fi; \
    rm -f /tmp/patch-global-node-security-dependencies.mjs

ARG CLOUDCLI_VERSION=1.36.3
ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT=cloudcli-ai-cloudcli-1.36.3-holyclaude-account-management.tgz
ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=a90aefd34ca6ad467e911c5907fe9c19fc65e171c77145b07ea6b7a23db9bbc7
COPY vendor/artifacts/${CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT} /tmp/vendor/cloudcli-ai-cloudcli.tgz
COPY vendor/artifacts/cloudcli-account-management.manifest.json /tmp/vendor/cloudcli-account-management.manifest.json
COPY --chown=claude:claude vendor/locks/cloudcli-web-terminal-8aa41f614c216d961e7c0d9c3e67982c6b2d9da3.package-lock.json /tmp/vendor/web-terminal-package-lock.json

# ---------- CloudCLI (web UI for Claude Code) ----------
RUN echo "$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  /tmp/vendor/cloudcli-ai-cloudcli.tgz" | sha256sum -c - && \
    CLOUDCLI_ROOT=/usr/local/lib/node_modules/@cloudcli-ai/cloudcli && \
    mkdir -p "$(dirname "$CLOUDCLI_ROOT")" /tmp/cloudcli-unpack && \
    tar -xzf /tmp/vendor/cloudcli-ai-cloudcli.tgz -C /tmp/cloudcli-unpack && \
    mv /tmp/cloudcli-unpack/package "$CLOUDCLI_ROOT" && \
    cd "$CLOUDCLI_ROOT" && \
    npm ci --omit=dev && \
    node --input-type=module -e "import { createRequire } from 'node:module'; const require = createRequire('file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json'); const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.exec('CREATE TABLE smoke (id INTEGER)'); db.close();" && \
    chmod 0755 "$CLOUDCLI_ROOT/dist-server/server/cli.js" && \
    ln -s "$CLOUDCLI_ROOT/dist-server/server/cli.js" /usr/local/bin/cloudcli && \
    test -x /usr/local/bin/cloudcli && \
    rm -rf /tmp/vendor/cloudcli-ai-cloudcli.tgz /tmp/cloudcli-unpack
RUN test "$(node --input-type=module -e "import { createRequire } from 'node:module'; const require = createRequire('file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/index.js'); process.stdout.write(require('playwright/package.json').version);")" = "1.61.0" && \
    test -x /usr/bin/chromium
COPY scripts/patch-cloudcli-apprise-notifications.mjs /tmp/patch-cloudcli-apprise-notifications.mjs
COPY scripts/patch-cloudcli-base-path.mjs /tmp/patch-cloudcli-base-path.mjs
COPY scripts/patch-cloudcli-browser-runtime.mjs /tmp/patch-cloudcli-browser-runtime.mjs
COPY scripts/patch-cloudcli-codex-complete-exit-code.mjs /tmp/patch-cloudcli-codex-complete-exit-code.mjs
COPY scripts/patch-cloudcli-codex-permissions.mjs /tmp/patch-cloudcli-codex-permissions.mjs
COPY scripts/patch-cloudcli-disable-self-update.mjs /tmp/patch-cloudcli-disable-self-update.mjs
COPY --chown=claude:claude scripts/patch-cloudcli-web-terminal-rendering.mjs /tmp/patch-cloudcli-web-terminal-rendering.mjs
COPY scripts/verify-cloudcli-account-management-support.mjs /tmp/verify-cloudcli-account-management-support.mjs
RUN touch /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/.env

# patch: launch CloudCLI Browser Use with HolyClaude's canonical Chromium
RUN node /tmp/patch-cloudcli-browser-runtime.mjs && rm -f /tmp/patch-cloudcli-browser-runtime.mjs
RUN CLOUDCLI_BROWSER_USE="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/browser-use/browser-use.service.js" && \
    grep -Fq "// HolyClaude canonical browser runtime" "$CLOUDCLI_BROWSER_USE" && \
    grep -Fq "executablePath: process.env.CHROME_PATH," "$CLOUDCLI_BROWSER_USE" && \
    grep -Fq "const executablePath = process.env.CHROME_PATH || playwright.chromium.executablePath();" "$CLOUDCLI_BROWSER_USE" && \
    echo "[patch] CloudCLI Browser Use canonical Chromium applied to runtime"

# patch: disable CloudCLI npm self-update inside HolyClaude (issue #50)
RUN node /tmp/patch-cloudcli-disable-self-update.mjs && rm -f /tmp/patch-cloudcli-disable-self-update.mjs

# CloudCLI 1.36.3 already contains the WebSocket binary-frame fix, provider
# model flow, and final Codex complete exit codes. Keep checks fail-closed.
RUN CLOUDCLI_WS_PROXY="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/websocket/services/plugin-websocket-proxy.service.js" && \
    grep -q "binary: isBinary" "$CLOUDCLI_WS_PROXY" && \
    echo "[patch] WebSocket frame type fix already present upstream"

RUN CLOUDCLI_COMMANDS="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/routes/commands.js" && \
    grep -q "providerModelsService.getProviderModels" "$CLOUDCLI_COMMANDS" && \
    echo "[patch] Provider model command flow already present upstream"

RUN CLOUDCLI_CODEX="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/openai-codex.js" && \
    grep -q "exitCode: terminalFailure ? 1 : 0" "$CLOUDCLI_CODEX" && \
    grep -q "exitCode: 1" "$CLOUDCLI_CODEX" && \
    echo "[patch] Codex final completion exitCode fix already present upstream"

# patch: support serving CloudCLI below a reverse-proxy subpath (issue #64)
RUN node /tmp/patch-cloudcli-base-path.mjs && rm -f /tmp/patch-cloudcli-base-path.mjs
RUN CLOUDCLI_SERVER="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/index.js" && \
    CLOUDCLI_WS_SERVER="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/websocket/services/websocket-server.service.js" && \
    grep -q "HOLYCLAUDE_BASE_PATH" "$CLOUDCLI_SERVER" && \
    grep -q "sendHolyClaudeIndexHtml" "$CLOUDCLI_SERVER" && \
    grep -q "stripHolyClaudeBasePathFromPathname" "$CLOUDCLI_WS_SERVER" && \
    echo "[patch] CloudCLI base path support applied to runtime"

# patch: bridge Codex CloudCLI lifecycle events to Apprise (issue #17)
RUN node /tmp/patch-cloudcli-apprise-notifications.mjs && rm -f /tmp/patch-cloudcli-apprise-notifications.mjs
RUN CLOUDCLI_NOTIFICATIONS="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/notifications/services/notification-orchestrator.service.js" && \
    test "$(grep -c "^  sendAppriseLifecycleNotification({" "$CLOUDCLI_NOTIFICATIONS")" = "2" && \
    grep -q "kind: 'stop'" "$CLOUDCLI_NOTIFICATIONS" && \
    grep -q "kind: 'error'" "$CLOUDCLI_NOTIFICATIONS" && \
    echo "[patch] Apprise lifecycle bridge applied to CloudCLI runtime"

# patch: configure Codex CloudCLI chat permission mode (issue #18)
RUN node /tmp/patch-cloudcli-codex-permissions.mjs && rm -f /tmp/patch-cloudcli-codex-permissions.mjs

# patch: preserve explicit Codex complete fields on the 1.35.x provider path (issue #19)
RUN node /tmp/patch-cloudcli-codex-complete-exit-code.mjs && rm -f /tmp/patch-cloudcli-codex-complete-exit-code.mjs
RUN CLOUDCLI_CODEX_PROVIDER="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/providers/list/codex/codex-sessions.provider.js" && \
    grep -q "exitCode: 0" "$CLOUDCLI_CODEX_PROVIDER" && \
    grep -q "success: true" "$CLOUDCLI_CODEX_PROVIDER" && \
    grep -q "aborted: false" "$CLOUDCLI_CODEX_PROVIDER" && \
    echo "[patch] Codex provider completion fields applied to CloudCLI runtime"

# patch: local account logout/password bridge for CloudCLI (issue #65)
RUN node /tmp/verify-cloudcli-account-management-support.mjs /usr/local/lib/node_modules/@cloudcli-ai/cloudcli && \
    rm -f /tmp/verify-cloudcli-account-management-support.mjs /tmp/vendor/cloudcli-account-management.manifest.json

# ---------- CloudCLI plugins (baked into image) ----------
USER claude
RUN mkdir -p /home/claude/.claude-code-ui/plugins && \
    git init /home/claude/.claude-code-ui/plugins/project-stats && \
    cd /home/claude/.claude-code-ui/plugins/project-stats && \
    git remote add origin https://github.com/cloudcli-ai/cloudcli-plugin-starter.git && \
    git fetch --depth 1 origin 4895cd3fd33362471e739b786493aba048487bcc && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse --short=12 HEAD)" = "4895cd3fd333" && \
    npm ci && npm run build && \
    git init /home/claude/.claude-code-ui/plugins/web-terminal && \
    cd /home/claude/.claude-code-ui/plugins/web-terminal && \
    git remote add origin https://github.com/cloudcli-ai/cloudcli-plugin-terminal.git && \
    git fetch --depth 1 origin 8aa41f614c216d961e7c0d9c3e67982c6b2d9da3 && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse --short=12 HEAD)" = "8aa41f614c21" && \
    cp /tmp/vendor/web-terminal-package-lock.json package-lock.json && \
    node /tmp/patch-cloudcli-web-terminal-rendering.mjs /home/claude/.claude-code-ui/plugins/web-terminal && \
    npm ci && npm run build && \
    echo '{"project-stats":{"name":"project-stats","source":"https://github.com/cloudcli-ai/cloudcli-plugin-starter","enabled":true},"web-terminal":{"name":"web-terminal","source":"https://github.com/cloudcli-ai/cloudcli-plugin-terminal","enabled":true}}' > /home/claude/.claude-code-ui/plugins.json
USER root
RUN rm -f /tmp/patch-cloudcli-web-terminal-rendering.mjs /tmp/vendor/web-terminal-package-lock.json

# ---------- Store variant for bootstrap ----------
RUN echo "${VARIANT}" > /etc/holyclaude-variant

# ---------- Copy config files ----------
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY scripts/bootstrap.sh /usr/local/bin/bootstrap.sh
COPY scripts/holyclaude-mosh-server /usr/local/bin/holyclaude-mosh-server
COPY scripts/persist-claude-json.mjs /usr/local/bin/persist-claude-json.mjs
COPY scripts/prepare-cli-persistence.sh /usr/local/bin/prepare-cli-persistence.sh
COPY scripts/secure-cli-persistence.py /usr/local/bin/secure-cli-persistence.py
COPY scripts/notify.py /usr/local/bin/notify.py
COPY config/settings.json /usr/local/share/holyclaude/settings.json
COPY config/claude-memory-full.md /usr/local/share/holyclaude/claude-memory-full.md
COPY config/claude-memory-slim.md /usr/local/share/holyclaude/claude-memory-slim.md
RUN chmod +x /usr/local/bin/entrypoint.sh \
    /usr/local/bin/bootstrap.sh \
    /usr/local/bin/holyclaude-mosh-server \
    /usr/local/bin/persist-claude-json.mjs \
    /usr/local/bin/prepare-cli-persistence.sh \
    /usr/local/bin/secure-cli-persistence.py \
    /usr/local/bin/notify.py

RUN mkdir -p /usr/local/lib/holyclaude && \
    if [ -x /usr/bin/mosh-server ]; then \
      mv /usr/bin/mosh-server /usr/local/lib/holyclaude/mosh-server.real && \
      ln -sf /usr/local/bin/holyclaude-mosh-server /usr/bin/mosh-server; \
    fi

# ---------- s6-overlay service definitions ----------
COPY s6-overlay/s6-rc.d/cloudcli/type /etc/s6-overlay/s6-rc.d/cloudcli/type
COPY s6-overlay/s6-rc.d/cloudcli/run /etc/s6-overlay/s6-rc.d/cloudcli/run
COPY s6-overlay/s6-rc.d/persist-claude-json/type /etc/s6-overlay/s6-rc.d/persist-claude-json/type
COPY s6-overlay/s6-rc.d/persist-claude-json/run /etc/s6-overlay/s6-rc.d/persist-claude-json/run
COPY s6-overlay/s6-rc.d/xvfb/type /etc/s6-overlay/s6-rc.d/xvfb/type
COPY s6-overlay/s6-rc.d/xvfb/run /etc/s6-overlay/s6-rc.d/xvfb/run
COPY s6-overlay/s6-rc.d/sshd/type /etc/s6-overlay/s6-rc.d/sshd/type
COPY s6-overlay/s6-rc.d/sshd/run /etc/s6-overlay/s6-rc.d/sshd/run
RUN chmod +x /etc/s6-overlay/s6-rc.d/cloudcli/run \
    /etc/s6-overlay/s6-rc.d/persist-claude-json/run \
    /etc/s6-overlay/s6-rc.d/xvfb/run \
    /etc/s6-overlay/s6-rc.d/sshd/run && \
    touch /etc/s6-overlay/user-bundles.d/user/contents.d/cloudcli && \
    touch /etc/s6-overlay/user-bundles.d/user/contents.d/persist-claude-json && \
    touch /etc/s6-overlay/user-bundles.d/user/contents.d/xvfb

# ---------- Working directory ----------
WORKDIR /workspace

# ---------- Health check ----------
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:3001/ || exit 1

# ---------- s6-overlay as PID 1 ----------
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
