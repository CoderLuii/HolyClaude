# ==============================================================================
# HolyClaude — Pre-configured Docker Environment for Claude Code CLI + CloudCLI
# https://github.com/coderluii/holyclaude
#
# Build variants:
#   docker build -t holyclaude .                        # full (default)
#   docker build --build-arg VARIANT=slim -t holyclaude:slim .
# ==============================================================================

ARG VARIANT=full

FROM golang:1.27.0-bookworm@sha256:ded31c68586d2e49e760acc2e65a884b23d032e9bbbed0ae0c55abd3fcaf4452 AS esbuild-builder

ARG TARGETARCH
RUN case "$TARGETARCH" in amd64) ;; arm64) ;; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac; \
    set -eux; \
    for ESBUILD_VERSION in 0.15.18 0.18.20 0.25.12; do \
      mkdir -p "/out/${ESBUILD_VERSION}"; \
      CGO_ENABLED=0 GOOS=linux GOARCH="$TARGETARCH" GOBIN="/out/${ESBUILD_VERSION}" \
        go install "github.com/evanw/esbuild/cmd/esbuild@v${ESBUILD_VERSION}"; \
      test "$("/out/${ESBUILD_VERSION}/esbuild" --version)" = "$ESBUILD_VERSION"; \
    done

FROM node:26.8.1-bookworm-slim@sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e AS ffmpeg-security-builder
ENV DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
ARG VARIANT
COPY --chmod=0755 scripts/build-ffmpeg-security-backport.sh /usr/local/bin/build-ffmpeg-security-backport.sh
COPY security/patches/ffmpeg/ /security/patches/ffmpeg/
RUN test -x /usr/local/bin/build-ffmpeg-security-backport.sh && \
    mkdir -p /out/ffmpeg-security-backport && \
    if [ "$VARIANT" = "full" ]; then \
    printf '%s\n' \
      'Types: deb-src' \
      'URIs: http://deb.debian.org/debian' \
      'Suites: bookworm bookworm-updates' \
      'Components: main' \
      '' \
      'Types: deb-src' \
      'URIs: http://deb.debian.org/debian-security' \
      'Suites: bookworm-security' \
      'Components: main' \
      > /etc/apt/sources.list.d/debian-source.sources && \
    apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl xz-utils patch dpkg-dev build-essential && \
    apt-get build-dep -y --no-install-recommends ffmpeg && \
    TARGETARCH="$TARGETARCH" /usr/local/bin/build-ffmpeg-security-backport.sh; \
    fi

FROM python:3.14.7-slim-bookworm@sha256:9ab8d9c8514b44f90cf0029dd42fdd7e9e211e639c8b995304cc04568dee900f AS python-runtime

FROM node:26.8.1-bookworm-slim@sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e

COPY --from=python-runtime /usr/local/ /usr/local/
RUN test "$(python3 --version)" = "Python 3.14.7" && \
    python3 -m pip --version >/dev/null

ARG HOLYCLAUDE_VERSION=1.5.8
LABEL org.opencontainers.image.source=https://github.com/CoderLuii/HolyClaude
LABEL org.opencontainers.image.version=${HOLYCLAUDE_VERSION}

# ---------- Build args ----------
ARG S6_OVERLAY_VERSION=3.2.3.2
ARG S6_NOARCH_SHA256=5379750ed30a84bbd2e2dd74847ba6b5bd29cd0b2e3ea2ec58049b57eb2eda12
ARG S6_ARCHIVE_SHA256_AMD64=e6befcc96a437a3831386ecfc51808c5d3e939dc5fe3c02ae9284599e8aa2408
ARG S6_ARCHIVE_SHA256_ARM64=b17f17a82e7a515c682a91edaf2ffdabb73f891981b6c1fd712115693a2f8b4c
ARG FZF_VERSION=0.74.3
ARG FZF_ARCHIVE_SHA256_AMD64=3501a595e4b5c40a6b047340a0e8f805c46fd4e61ef95ef8a136ba8c61cf6f22
ARG FZF_ARCHIVE_SHA256_ARM64=4a17a17b46bd0c4873e995533de508995c11572c0be0664a5dbcf13f60463046
ARG CHROMIUM_DEBIAN_VERSION=151.0.7922.173-1~deb12u1
ARG CHROMIUM_PACKAGE_SHA256_AMD64=3c8f1f513675d8785925e67a6858407fd5461e4b1903463d127ea6e651a649de
ARG CHROMIUM_PACKAGE_SHA256_ARM64=8a7f778630287297b1217414d4cd53b9638046ce48f13c2e2994fb5afee012a2
ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=560f6d013d1c733d4a84e27209d80235968f3672745c27f6ecd2947ac6c12bd8
ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=f0deb575d2486b1d72e4a28c4ea2c3dc0e5abed21c23aa236fdb96a1fa007b3b
ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=21d610b5b25e74796350e6d7420acf51917641b7a8f1603a16f9b212b84c3af2
ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=5266f3e47219fbed422bd885e05e7c5fc1252203b5112db64d15a986e9293790
ARG CLAUDE_CODE_VERSION=2.1.258
ARG CLAUDE_INSTALLER_SHA256=3a68d3406cf674e17bed1733a4dcf37805e2e47d87417700007d7e1aa766a944
ARG CLAUDE_BINARY_SHA256_AMD64=704f1334ac65d3e89e1c6c1d7663293ad786a6166afdb71b5075337df630f976
ARG CLAUDE_BINARY_SHA256_ARM64=43dc490af55262edcb3e9b1cb315de22cc09ccb08bd52a4c39bc5eabaa63100f
ARG JUNIE_VERSION=3126.1
ARG JUNIE_ARCHIVE_SHA256_AMD64=34d8b11dea9f529e42da1b62df673de4ca646fe4ae8d5234a4e271d395b111dd
ARG JUNIE_ARCHIVE_SHA256_ARM64=4354392ec33218a66a249cac5cfb988ac31b06f6def2722d3e1277ede95649c5
ARG CURSOR_BUILD_ID=2026.08.31-4057e58
ARG CURSOR_ARCHIVE_SHA256_AMD64=7e306db5750219a99c00ed517fe8b235d3c54e4ca5f77e2ff160cc97ce707798
ARG CURSOR_ARCHIVE_SHA256_ARM64=cf5db6b5047b3280d8a49471cfd41beb1d5e475774177df5df2851857ab6514a
ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233
ARG CURSOR_NODE_SHA256_AMD64=e0e46d3a1c0667117303412647cafcbcefb1be7612493015ec8fd6b7440162a4
ARG CURSOR_NODE_SHA256_ARM64=47befb5f57df96771ce343d6293349ecf4d46c91110b626423ec3a49d2fee7c1
ARG SETUPTOOLS_VERSION=84.0.0
ARG SETUPTOOLS_WHEEL_SHA256=51a52592b3b99e102b609654876bd65f19f999935166d1352678931132b0c670
ARG PISCINA_VERSION=4.9.3
ARG PISCINA_ARCHIVE_SHA256=5207b79c42ff172230529f5aa355f17d855b1481836bc841db19c6081fc5ec1e
ARG BRACE_EXPANSION_VERSION=5.0.9
ARG BRACE_EXPANSION_ARCHIVE_SHA256=5d06001fddd25cbee90c96db4dc5b7b57711b984c3141e28d10f143deb52dbaf
ARG MINIMATCH_5_VERSION=5.1.9
ARG MINIMATCH_5_ARCHIVE_SHA256=67e7dacfba9fcabb6ac661620b67e6c22600b4aa56ffa14431cbdfdeebbd4cfe
ARG MINIMATCH_10_VERSION=10.2.6
ARG MINIMATCH_10_ARCHIVE_SHA256=5a3d2c8074a28229665727e47b8a1090941856a7962905efe05d20d3760355f8
ARG PATH_TO_REGEXP_6_VERSION=6.3.0
ARG PATH_TO_REGEXP_6_ARCHIVE_SHA256=da302284390341278d3dad1014f2043cf844f6a2163aa8dc5686d321d82742e6
ARG PATH_TO_REGEXP_8_VERSION=8.4.2
ARG PATH_TO_REGEXP_8_ARCHIVE_SHA256=e8712a9c53b0a2a27cfecc7b80c54df92afb4643c01351e2b2ebb7784bcabd78
ARG WS_VERSION=8.21.3
ARG WS_ARCHIVE_SHA256=df3454ef205791ce50b5b9241762dcf9bfe1aa9f7f01d3057229be7dac0c2dc3
ARG CLOUDCLI_NANOID_VERSION=3.3.18
ARG CLOUDCLI_NANOID_ARCHIVE_SHA256=b9dc81cb403ea2510314dd2d1ad8d71934f325db90c1b43805e781b87e3fb009
ARG NESTED_IP_ADDRESS_VERSION=10.7.0
ARG NESTED_IP_ADDRESS_ARCHIVE_SHA256=25a406ee4388fa3d47380ad57b816087fa82a681cc710cccbfe9162cffa8a57a
ARG CLOUDCLI_FAST_URI_VERSION=3.1.6
ARG CLOUDCLI_FAST_URI_ARCHIVE_SHA256=264af0e32c4b7b7bcb9ce5b4623c82469ee3e69ba5d171920f1762d626db1064
ARG CLOUDCLI_JS_YAML_VERSION=3.15.1
ARG CLOUDCLI_JS_YAML_ARCHIVE_SHA256=df86a37e0f5aa855ae32098dcc1d4c5712e43ea515d69fa3e6d51b8f5901c86e
ARG UNDICI_8_VERSION=8.10.1
ARG UNDICI_8_ARCHIVE_SHA256=90e823f192d03af6a6ec64dc7139286519896416694550d6513f79fc51377660
ARG FULL_NANOID_VERSION=3.3.17
ARG FULL_NANOID_ARCHIVE_SHA256=fd821dc3644ff456a61cd8ac67f3741f939d9ce2fb4cbb9c6b3e6c8111285ef6
ARG FULL_JS_YAML_VERSION=4.3.1
ARG FULL_JS_YAML_ARCHIVE_SHA256=08d6282b77a3e7242061f6dd5516c019b25c53041ad267bca3b790d79ddd5f34
ARG AZURE_CLI_VERSION=2.90.0-1~bookworm
ARG AZURE_CLI_INSTALLER_SHA256=01fada4dafe903fa6edae138d3e3ca2e6e4295d7c8a35e48632bba4aa9dbe9d9
ARG GITHUB_CLI_VERSION=2.99.0
ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=471feb449cc98d527fc9a67601b9ea04296c100b666d970a784a07dc17a59a8f
ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=20ccc660b06aef27e2164ae0de5085108e1a3d1e7ba4440e7be10bd9b4b5d0ab
ARG NODE_TAR_VERSION=7.5.22
ARG NODE_TAR_SHA256=b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6
ARG PRISMA_MYSQL2_VERSION=3.22.0
ARG PRISMA_MYSQL2_ARCHIVE_SHA256=3bb03632c51e4faf76e913e743b5efb4c222c222dae86780a845bf3c13dbd24e
ARG TARGETARCH
ARG VARIANT=full
ARG FFMPEG_BACKPORT_VERSION=7:5.1.9-0+deb12u1+holyclaude2

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
      if ! { \
        curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/s6-overlay-${S6_ASSET}.tar.xz" \
          "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ASSET}.tar.xz" && \
        curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/s6-overlay-${S6_ASSET}.tar.xz.sha256" \
          "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ASSET}.tar.xz.sha256" && \
        test "$(cut -d' ' -f1 "/tmp/s6-overlay-${S6_ASSET}.tar.xz.sha256")" = "$S6_EXPECTED_SHA256" && \
        echo "$S6_EXPECTED_SHA256  /tmp/s6-overlay-${S6_ASSET}.tar.xz" | sha256sum -c -; \
      }; then \
        rm -f "/tmp/s6-overlay-${S6_ASSET}.tar.xz" "/tmp/s6-overlay-${S6_ASSET}.tar.xz.sha256"; \
        exit 1; \
      fi; \
    done && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf "/tmp/s6-overlay-${S6_ARCH}.tar.xz" && \
    rm -f /tmp/s6-overlay-noarch.tar.xz /tmp/s6-overlay-noarch.tar.xz.sha256 "/tmp/s6-overlay-${S6_ARCH}.tar.xz" "/tmp/s6-overlay-${S6_ARCH}.tar.xz.sha256"

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
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/${FZF_ASSET}" \
      "https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}/${FZF_ASSET}" && \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/fzf-checksums.txt \
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
      pandoc libvips-dev \
    && rm -rf /var/lib/apt/lists/*; \
    fi
COPY --from=ffmpeg-security-builder /out/ffmpeg-security-backport /tmp/ffmpeg-security-backport
RUN if [ "$VARIANT" = "full" ]; then \
      cd /tmp/ffmpeg-security-backport && \
      sha256sum -c SHA256SUMS && \
      apt-get update && apt-get install -y --no-install-recommends ./*.deb && \
      for package_name in ffmpeg libavcodec59 libavdevice59 libavfilter8 libavformat59 libavutil57 libpostproc56 libswresample4 libswscale6; do \
        dpkg --compare-versions "$(dpkg-query -W -f='${Version}' "$package_name")" eq "$FFMPEG_BACKPORT_VERSION"; \
      done && \
      rm -rf /tmp/ffmpeg-security-backport /var/lib/apt/lists/*; \
    else \
      rm -rf /tmp/ffmpeg-security-backport; \
    fi

# ---------- Azure CLI (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/azure-cli-install.sh https://aka.ms/InstallAzureCLIDeb && \
    echo "$AZURE_CLI_INSTALLER_SHA256  /tmp/azure-cli-install.sh" | sha256sum -c - && \
    sed -i 's/apt-get install --assume-yes azure-cli/apt-get install --assume-yes azure-cli=$AZURE_CLI_VERSION/' /tmp/azure-cli-install.sh && \
    grep -Fqx '    apt-get install --assume-yes azure-cli=$AZURE_CLI_VERSION' /tmp/azure-cli-install.sh && \
    bash /tmp/azure-cli-install.sh && \
    test "$(dpkg-query -W -f='${Version}' azure-cli)" = "$AZURE_CLI_VERSION" && \
    test "$(/opt/az/bin/python3 --version)" = "Python 3.14.6" && \
    test "$(/opt/az/bin/python3 -c 'import cryptography; print(cryptography.__version__)')" = "48.0.1" && \
    /opt/az/bin/python3 -m pip check && \
    az version >/dev/null && \
    rm -rf /tmp/azure-cli-install.sh /var/lib/apt/lists/*; \
    fi

# ---------- GitHub CLI ----------
RUN GITHUB_CLI_ARCH=$(case "$TARGETARCH" in amd64) echo "amd64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    GITHUB_CLI_PACKAGE_SHA256=$(case "$TARGETARCH" in amd64) echo "$GITHUB_CLI_PACKAGE_SHA256_AMD64";; arm64) echo "$GITHUB_CLI_PACKAGE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    GITHUB_CLI_PACKAGE="gh_${GITHUB_CLI_VERSION}_linux_${GITHUB_CLI_ARCH}.deb" && \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/${GITHUB_CLI_PACKAGE}" \
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
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/claude-install.sh https://claude.ai/install.sh && \
    echo "$CLAUDE_INSTALLER_SHA256  /tmp/claude-install.sh" | sha256sum -c - && \
    bash /tmp/claude-install.sh "$CLAUDE_CODE_VERSION" && \
    test "$(/home/claude/.local/bin/claude --version | awk '{print $1}')" = "$CLAUDE_CODE_VERSION" && \
    echo "$CLAUDE_BINARY_SHA256  $(readlink -f /home/claude/.local/bin/claude)" | sha256sum -c - && \
    rm -f /tmp/claude-install.sh
USER root
RUN rm -f /home/claude/.claude.json
ENV PATH="/home/claude/.local/bin:${PATH}"

# ---------- npm global packages (slim — always installed) ----------
RUN npm install -g npm@12.0.2 && \
    test "$(npm --version)" = "12.0.2"

RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i -g \
    playwright@1.62.1 \
    typescript@7.0.2 tsx@4.23.13 \
    pnpm@11.25.0 \
    vite@8.2.2 esbuild@0.28.2 \
    eslint@10.9.1 prettier@3.9.6 \
    serve@14.2.6 nodemon@3.1.14 concurrently@10.0.5 \
    dotenv-cli@11.0.0

# ---------- npm global packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    set -e; \
    npm i -g \
      wrangler@4.128.0 vercel@59.11.1 netlify-cli@27.4.2 \
      pm2@7.0.4 \
      prisma@7.10.0 drizzle-kit@0.31.10 \
      eas-cli@23.2.0 \
      lighthouse@13.4.1 @lhci/cli@0.15.1 \
      sharp-cli@6.1.0 json-server@0.17.4 http-server@14.1.1 \
      @marp-team/marp-cli@4.5.0 && \
    npm i -g --legacy-peer-deps @cloudflare/next-on-pages@1.13.16 && \
    test "$(json-server --version)" = "0.17.4" && \
    printf '%s\n' '{"posts":[{"id":1,"title":"smoke"}]}' > /tmp/json-server-smoke.json; \
    json-server --watch /tmp/json-server-smoke.json --host 127.0.0.1 --port 3999 >/tmp/json-server-smoke.log 2>&1 & \
    JSON_SERVER_PID=$! && \
    for attempt in 1 2 3 4 5 6 7 8 9 10; do \
      curl -fsS http://127.0.0.1:3999/posts/1 -o /tmp/json-server-response.json && break; \
      sleep 1; \
    done && \
    node -e "const value = require('/tmp/json-server-response.json'); if (value.id !== 1 || value.title !== 'smoke') process.exit(1)" && \
    kill "$JSON_SERVER_PID" && \
    { \
      wait "$JSON_SERVER_PID" 2>/dev/null || true; \
    } && \
    rm -f /tmp/json-server-smoke.json /tmp/json-server-response.json /tmp/json-server-smoke.log; \
    fi

# Prisma 7.10.0 pins mysql2 3.15.3. Replace that exact nested dependency with
# the checksum-bound fixed release while preserving Prisma's dependency graph.
RUN if [ "$VARIANT" = "full" ]; then \
      PRISMA_ROOT=/usr/local/lib/node_modules/prisma && \
      MYSQL2_ROOT="$PRISMA_ROOT/node_modules/mysql2" && \
      test "$(node -p "require('$PRISMA_ROOT/package.json').version")" = "7.10.0" && \
      test "$(node -p "require('$PRISMA_ROOT/package.json').dependencies.mysql2")" = "3.15.3" && \
      test "$(node -p "require('$MYSQL2_ROOT/package.json').version")" = "3.15.3" && \
      curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/prisma-mysql2.tgz \
        "https://registry.npmjs.org/mysql2/-/mysql2-${PRISMA_MYSQL2_VERSION}.tgz" && \
      echo "$PRISMA_MYSQL2_ARCHIVE_SHA256  /tmp/prisma-mysql2.tgz" | sha256sum -c - && \
      rm -rf "$MYSQL2_ROOT" && \
      mkdir -p "$MYSQL2_ROOT" && \
      tar -xzf /tmp/prisma-mysql2.tgz --strip-components=1 -C "$MYSQL2_ROOT" && \
      npm install --omit=dev --ignore-scripts --no-package-lock --prefix "$MYSQL2_ROOT" && \
      node -e "const fs=require('fs'); const path='$PRISMA_ROOT/package.json'; const value=JSON.parse(fs.readFileSync(path,'utf8')); value.dependencies.mysql2=process.env.PRISMA_MYSQL2_VERSION; fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\\n')" && \
      test "$(node -p "require('$MYSQL2_ROOT/package.json').version")" = "$PRISMA_MYSQL2_VERSION" && \
      test "$(node -p "require('$PRISMA_ROOT/package.json').dependencies.mysql2")" = "$PRISMA_MYSQL2_VERSION" && \
      node -e "if (typeof require('$MYSQL2_ROOT').createConnection !== 'function') throw new Error('invalid Prisma mysql2 module')" && \
      npm --prefix "$PRISMA_ROOT" ls mysql2 --all >/dev/null && \
      rm -f /tmp/prisma-mysql2.tgz; \
    fi

# npm 12, EAS 23, and Vercel 59 retain tar below the reviewed security floor. Replace only their installed
# copies with the checksum-bound fix for CVE-2026-59873, then update exact metadata.
COPY scripts/patch-global-node-tar.mjs /tmp/patch-global-node-tar.mjs
RUN node /tmp/patch-global-node-tar.mjs --root / --variant "$VARIANT" --check-baseline && \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/node-tar.tgz "https://registry.npmjs.org/tar/-/tar-${NODE_TAR_VERSION}.tgz" && \
    echo "$NODE_TAR_SHA256  /tmp/node-tar.tgz" | sha256sum -c - && \
    targets="/usr/local/lib/node_modules/npm/node_modules/tar" && \
    if [ "$VARIANT" = "full" ]; then \
      targets="$targets /usr/local/lib/node_modules/eas-cli/node_modules/tar /usr/local/lib/node_modules/vercel/node_modules/tar"; \
    fi && \
    for target in $targets; do \
        rm -rf "$target" && \
        mkdir -p "$target" && \
        tar -xzf /tmp/node-tar.tgz --strip-components=1 -C "$target"; \
    done && \
    node /tmp/patch-global-node-tar.mjs --root / --variant "$VARIANT" && \
    test "$(node -p "require('/usr/local/lib/node_modules/npm/node_modules/tar/package.json').version")" = "$NODE_TAR_VERSION" && \
    node -e "if (typeof require('/usr/local/lib/node_modules/npm/node_modules/tar').list !== 'function') throw new Error('invalid npm tar module')" && \
    npm --prefix /usr/local/lib/node_modules/npm ls tar --all >/dev/null && \
    if [ "$VARIANT" = "full" ]; then \
      test "$(node -p "require('/usr/local/lib/node_modules/eas-cli/node_modules/tar/package.json').version")" = "$NODE_TAR_VERSION" && \
      test "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/tar/package.json').version")" = "$NODE_TAR_VERSION" && \
      node -e "for (const path of ['/usr/local/lib/node_modules/eas-cli/node_modules/tar', '/usr/local/lib/node_modules/vercel/node_modules/tar']) { if (typeof require(path).list !== 'function') throw new Error('invalid tar module at ' + path); }" && \
      eas --version >/dev/null && \
      vercel --version >/dev/null; \
    fi && \
    rm -f /tmp/node-tar.tgz

# Netlify CLI 27.4.2 bundles an optional local Go/Rust functions proxy built
# with Go 1.16.7. Keep the deployment CLI, but remove that stale executable.
RUN if [ "$VARIANT" = "full" ]; then \
      NETLIFY_PROXY_ARCH=$(case "$TARGETARCH" in amd64) echo "x64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
      NETLIFY_PROXY_ROOT="/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-${NETLIFY_PROXY_ARCH}" && \
      test "$(node -p "require('${NETLIFY_PROXY_ROOT}/package.json').version")" = "1.1.1" && \
      test -x "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      rm -f "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      test ! -e "$NETLIFY_PROXY_ROOT/bin/local-functions-proxy" && \
      test "$(node -p "require('/usr/local/lib/node_modules/netlify-cli/package.json').version")" = "27.4.2" && \
      netlify --version >/dev/null; \
    fi

# Rebuild the exact esbuild versions retained by full-only tools with the
# pinned Go toolchain, replacing old upstream native executables only.
COPY --from=esbuild-builder /out/0.15.18/esbuild /tmp/esbuild-0.15.18
COPY --from=esbuild-builder /out/0.18.20/esbuild /tmp/esbuild-0.18.20
COPY --from=esbuild-builder /out/0.25.12/esbuild /tmp/esbuild-0.25.12
RUN if [ "$VARIANT" = "full" ]; then \
      ESBUILD_PACKAGE_ARCH=$(case "$TARGETARCH" in amd64) echo "linux-x64";; arm64) echo "linux-arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
      NEXT_ON_PAGES_ESBUILD_PACKAGE=$(case "$TARGETARCH" in amd64) echo "esbuild-linux-64";; arm64) echo "esbuild-linux-arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
      NEXT_ON_PAGES_ESBUILD_ROOT="/usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/${NEXT_ON_PAGES_ESBUILD_PACKAGE}" && \
      test "$(node -p "require('${NEXT_ON_PAGES_ESBUILD_ROOT}/package.json').version")" = "0.15.18" && \
      install -m 0755 /tmp/esbuild-0.15.18 \
        /usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/esbuild/bin/esbuild && \
      install -m 0755 /tmp/esbuild-0.15.18 \
        "${NEXT_ON_PAGES_ESBUILD_ROOT}/bin/esbuild" && \
      install -m 0755 /tmp/esbuild-0.18.20 \
        "/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild" && \
      install -m 0755 /tmp/esbuild-0.25.12 \
        "/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild" && \
      test "$(sha256sum /tmp/esbuild-0.15.18 | cut -d' ' -f1)" = "$(sha256sum "${NEXT_ON_PAGES_ESBUILD_ROOT}/bin/esbuild" | cut -d' ' -f1)" && \
      test "$(/usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/esbuild/bin/esbuild --version)" = "0.15.18" && \
      test "$("${NEXT_ON_PAGES_ESBUILD_ROOT}/bin/esbuild" --version)" = "0.15.18" && \
      test "$(/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild-kit/core-utils/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild --version)" = "0.18.20" && \
      test "$(/usr/local/lib/node_modules/drizzle-kit/node_modules/@esbuild/${ESBUILD_PACKAGE_ARCH}/bin/esbuild --version)" = "0.25.12"; \
    fi && \
    rm -f /tmp/esbuild-0.15.18 /tmp/esbuild-0.18.20 /tmp/esbuild-0.25.12

# ---------- Python packages (slim — always installed) ----------
RUN pip install --no-cache-dir --break-system-packages \
    requests==2.34.2 httpx==0.28.1 beautifulsoup4==4.15.0 lxml==6.1.2 \
    Pillow==12.3.0 \
    pandas==3.0.5 numpy==2.5.2 \
    openpyxl==3.1.5 python-docx==1.2.0 \
    jinja2==3.1.6 pyyaml==6.0.3 python-dotenv==1.2.3 markdown==3.10.3 \
    rich==15.0.0 click==8.5.0 tqdm==4.70.0 \
    desloppify==1.0 bandit==1.9.4 defusedxml==0.7.1 \
    tree-sitter==0.26.0 tree-sitter-language-pack==1.16.1 stevedore==5.9.1 \
    playwright==1.62.0 \
    apprise==1.13.1

COPY scripts/holyclaude-chromium /usr/local/bin/holyclaude-chromium
RUN test "$(dpkg-query -W -f='${Version}' chromium)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test "$(dpkg-query -W -f='${Version}' chromium-common)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test "$(dpkg-query -W -f='${Version}' chromium-sandbox)" = "$CHROMIUM_DEBIAN_VERSION" && \
    test -x /usr/lib/chromium/chromium && \
    chmod +x /usr/local/bin/holyclaude-chromium && \
    ln -sf /usr/local/bin/holyclaude-chromium /usr/bin/chromium && \
    test "$(node -p "require('/usr/local/lib/node_modules/playwright/package.json').version")" = "1.62.1" && \
    test "$(python3 -c "import importlib.metadata; print(importlib.metadata.version('playwright'))")" = "1.62.0" && \
    test "$(/usr/bin/chromium --version | awk '{print $2}')" = "${CHROMIUM_DEBIAN_VERSION%%-*}" && \
    runuser -u claude -- test -r /usr/lib/chromium/chromium && \
    runuser -u claude -- test -x /usr/lib/chromium/chromium && \
    runuser -u claude -- /usr/bin/chromium --version

# ---------- Python packages (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    pip install --no-cache-dir --break-system-packages \
      reportlab==5.0.1 weasyprint==69.0 cairosvg==2.9.0 fpdf2==2.8.8 PyMuPDF==1.28.2 img2pdf==0.6.3 \
      xlsxwriter==3.2.9 xlrd==2.0.2 \
      matplotlib==3.11.1 seaborn==0.13.2 \
      python-pptx==1.0.2 \
      fastapi==0.141.1 uvicorn==0.52.4; \
    fi

# Replace Bookworm's runtime setuptools copy after all image packages are built.
RUN curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" \
      "https://files.pythonhosted.org/packages/95/9c/c510029fc6ef33a6275cd2c5d3cecd6613dfd6aa401d57c54f1c18852ccf/setuptools-${SETUPTOOLS_VERSION}-py3-none-any.whl" && \
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
RUN npm i -g @google/gemini-cli@0.58.0 @openai/codex@0.152.1 task-master-ai@0.43.1
USER claude
RUN CURSOR_ASSET_ARCH=$(case "$TARGETARCH" in amd64) echo "x64";; arm64) echo "arm64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_ARCHIVE_SHA256=$(case "$TARGETARCH" in amd64) echo "$CURSOR_ARCHIVE_SHA256_AMD64";; arm64) echo "$CURSOR_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_NODE_SHA256=$(case "$TARGETARCH" in amd64) echo "$CURSOR_NODE_SHA256_AMD64";; arm64) echo "$CURSOR_NODE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    CURSOR_DIR="/home/claude/.local/share/cursor-agent/versions/$CURSOR_BUILD_ID" && \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o /tmp/cursor-agent.tar.gz "https://downloads.cursor.com/lab/${CURSOR_BUILD_ID}/linux/${CURSOR_ASSET_ARCH}/agent-cli-package.tar.gz" && \
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
    test "$("$CURSOR_DIR/node" --version)" = "v26.8.1" && \
    test "$(cursor-agent --version)" = "$CURSOR_BUILD_ID" && \
    cursor-agent --help >/dev/null && \
    rm -f /tmp/cursor-agent.tar.gz
USER root

# ---------- Junie CLI (full only) ----------
USER claude
RUN if [ "$VARIANT" = "full" ]; then \
    JUNIE_PLATFORM=$(case "$TARGETARCH" in amd64) echo "amd64";; arm64) echo "aarch64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    JUNIE_ARCHIVE_SHA256=$(case "$TARGETARCH" in amd64) echo "$JUNIE_ARCHIVE_SHA256_AMD64";; arm64) echo "$JUNIE_ARCHIVE_SHA256_ARM64";; *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1;; esac) && \
    JUNIE_ARCHIVE="junie-nightly-${JUNIE_VERSION}-linux-${JUNIE_PLATFORM}.zip" && \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "/tmp/${JUNIE_ARCHIVE}" "https://github.com/jetbrains-junie/junie/releases/download/${JUNIE_VERSION}/${JUNIE_ARCHIVE}" && \
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
    npm i -g --allow-scripts=opencode-ai opencode-ai@1.18.26; \
    test "$(opencode --version)" = "1.18.26"; \
    fi

# ---------- Pi Coding Agent (full only) ----------
RUN if [ "$VARIANT" = "full" ]; then \
    npm i -g --ignore-scripts @earendil-works/pi-coding-agent@0.84.4; \
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
      curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "$archive" "https://registry.npmjs.org/${package_name}/-/${package_name}-${package_version}.tgz"; \
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
      replace_node_module undici "$UNDICI_8_VERSION" "$UNDICI_8_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici; \
      replace_node_module nanoid "$FULL_NANOID_VERSION" "$FULL_NANOID_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/eas-cli/node_modules/nanoid; \
      replace_node_module js-yaml "$FULL_JS_YAML_VERSION" "$FULL_JS_YAML_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/js-yaml; \
      replace_node_module minimatch "$MINIMATCH_5_VERSION" "$MINIMATCH_5_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/eas-cli/node_modules/minimatch; \
      replace_node_module minimatch "$MINIMATCH_10_VERSION" "$MINIMATCH_10_ARCHIVE_SHA256" \
        /usr/local/lib/node_modules/vercel/node_modules/minimatch; \
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
    test "$(npm --version)" = "12.0.2"; \
    test "$(cursor-agent --version)" = "$CURSOR_BUILD_ID"; \
    if [ "$VARIANT" = "full" ]; then \
      npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all >/dev/null; \
      npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all >/dev/null; \
      npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all >/dev/null; \
      npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all >/dev/null; \
      wrangler --version >/dev/null; \
      pi --version >/dev/null; \
      PM2_HOME=/tmp/holyclaude-build-pm2 pm2 --version | grep -Fx "7.0.4"; \
      PM2_HOME=/tmp/holyclaude-build-pm2 pm2 kill >/dev/null; \
      rm -rf /tmp/holyclaude-build-pm2; \
      eas --version >/dev/null; \
      vercel --version >/dev/null; \
      test "$(next-on-pages --version)" = "1.13.16"; \
      sharp --version >/dev/null; \
    fi; \
    rm -f /tmp/patch-global-node-security-dependencies.mjs

ARG CLOUDCLI_VERSION=1.37.2
ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT=cloudcli-ai-cloudcli-1.37.2-holyclaude-account-management.tgz
ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=0a5ee9cb87f84b9b6217e6fdea03c9b12808d34d8f779603b848c192f28ce9fd
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
    CLOUDCLI_SHRINKWRAP_SHA256="$(sha256sum npm-shrinkwrap.json | cut -d' ' -f1)" && \
    cp -- npm-shrinkwrap.json package-lock.json && \
    echo "$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap.json" | sha256sum -c - && \
    echo "$CLOUDCLI_SHRINKWRAP_SHA256  package-lock.json" | sha256sum -c - && \
    test "$(npm --version)" = "12.0.2" && \
    npm ci --omit=dev --allow-remote=all --allow-file=none --allow-git=none --allow-directory=none && \
    echo "$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap.json" | sha256sum -c - && \
    cmp -s npm-shrinkwrap.json package-lock.json && \
    rm -f package-lock.json && \
    node --input-type=module -e "import { createRequire } from 'node:module'; const require = createRequire('file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json'); const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.exec('CREATE TABLE smoke (id INTEGER)'); db.close();" && \
    chmod 0755 "$CLOUDCLI_ROOT/dist-server/server/modules/cli/cli.js" && \
    ln -s "$CLOUDCLI_ROOT/dist-server/server/modules/cli/cli.js" /usr/local/bin/cloudcli && \
    test -x /usr/local/bin/cloudcli && \
    rm -rf /tmp/vendor/cloudcli-ai-cloudcli.tgz /tmp/cloudcli-unpack
RUN set -eux; \
    replace_nested_node_module() { \
      package="$1"; version="$2"; expected_sha256="$3"; shift 3; \
      archive="/tmp/${package}-${version}.tgz"; \
      curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "$archive" "https://registry.npmjs.org/${package}/-/${package}-${version}.tgz"; \
      echo "$expected_sha256  $archive" | sha256sum -c -; \
      for target in "$@"; do \
        rm -rf "$target"; mkdir -p "$target"; \
        tar -xzf "$archive" -C "$target" --strip-components=1; \
        test "$(node -p "require('$target/package.json').version")" = "$version"; \
      done; \
      rm -f "$archive"; \
    }; \
    replace_nested_node_module nanoid "$CLOUDCLI_NANOID_VERSION" "$CLOUDCLI_NANOID_ARCHIVE_SHA256" \
      /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/nanoid; \
    replace_nested_node_module ip-address "$NESTED_IP_ADDRESS_VERSION" "$NESTED_IP_ADDRESS_ARCHIVE_SHA256" \
      /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/ip-address \
      /usr/local/lib/node_modules/npm/node_modules/ip-address; \
    replace_nested_node_module fast-uri "$CLOUDCLI_FAST_URI_VERSION" "$CLOUDCLI_FAST_URI_ARCHIVE_SHA256" \
      /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/fast-uri; \
    replace_nested_node_module js-yaml "$CLOUDCLI_JS_YAML_VERSION" "$CLOUDCLI_JS_YAML_ARCHIVE_SHA256" \
      /usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/js-yaml
RUN test "$(node --input-type=module -e "import { createRequire } from 'node:module'; const require = createRequire('file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/index.js'); process.stdout.write(require('playwright/package.json').version);")" = "1.62.1" && \
    test -x /usr/bin/chromium
COPY scripts/patch-cloudcli-apprise-notifications.mjs /tmp/patch-cloudcli-apprise-notifications.mjs
COPY scripts/patch-cloudcli-base-path.mjs /tmp/patch-cloudcli-base-path.mjs
COPY scripts/patch-cloudcli-browser-runtime.mjs /tmp/patch-cloudcli-browser-runtime.mjs
COPY scripts/patch-cloudcli-codex-complete-exit-code.mjs /tmp/patch-cloudcli-codex-complete-exit-code.mjs
COPY scripts/patch-cloudcli-codex-permissions.mjs /tmp/patch-cloudcli-codex-permissions.mjs
COPY scripts/patch-cloudcli-disable-self-update.mjs /tmp/patch-cloudcli-disable-self-update.mjs
COPY --chown=claude:claude scripts/patch-cloudcli-web-terminal-install-policy.mjs /tmp/patch-cloudcli-web-terminal-install-policy.mjs
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

# CloudCLI 1.37.2 already contains the WebSocket binary-frame fix, provider
# model flow, and final Codex complete exit codes. Keep checks fail-closed.
RUN CLOUDCLI_WS_PROXY="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/websocket/services/plugin-websocket-proxy.service.js" && \
    grep -q "binary: isBinary" "$CLOUDCLI_WS_PROXY" && \
    echo "[patch] WebSocket frame type fix already present upstream"

RUN CLOUDCLI_COMMANDS="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/commands/commands.routes.js" && \
    grep -q "modelsService.getProviderModels" "$CLOUDCLI_COMMANDS" && \
    echo "[patch] Provider model command flow already present upstream"

RUN CLOUDCLI_CODEX="/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/providers/list/codex/codex-runtime.provider.js" && \
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
    npm ci --strict-allow-scripts && npm run build && \
    git init /home/claude/.claude-code-ui/plugins/web-terminal && \
    cd /home/claude/.claude-code-ui/plugins/web-terminal && \
    git remote add origin https://github.com/cloudcli-ai/cloudcli-plugin-terminal.git && \
    git fetch --depth 1 origin 8aa41f614c216d961e7c0d9c3e67982c6b2d9da3 && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse --short=12 HEAD)" = "8aa41f614c21" && \
    cp /tmp/vendor/web-terminal-package-lock.json package-lock.json && \
    node /tmp/patch-cloudcli-web-terminal-install-policy.mjs /home/claude/.claude-code-ui/plugins/web-terminal && \
    node /tmp/patch-cloudcli-web-terminal-rendering.mjs /home/claude/.claude-code-ui/plugins/web-terminal && \
    npm ci --strict-allow-scripts && node -e "require('node-pty')" && npm run build && \
    echo '{"project-stats":{"name":"project-stats","source":"https://github.com/cloudcli-ai/cloudcli-plugin-starter","enabled":true},"web-terminal":{"name":"web-terminal","source":"https://github.com/cloudcli-ai/cloudcli-plugin-terminal","enabled":true}}' > /home/claude/.claude-code-ui/plugins.json
USER root
RUN rm -f /tmp/patch-cloudcli-web-terminal-install-policy.mjs /tmp/patch-cloudcli-web-terminal-rendering.mjs /tmp/vendor/web-terminal-package-lock.json

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
