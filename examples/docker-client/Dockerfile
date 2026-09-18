# check=skip=InvalidDefaultArgInFrom
ARG BASE_IMAGE
FROM ${BASE_IMAGE}

ARG DOCKER_CE_CLI_VERSION=5:29.8.1-1~debian.12~bookworm
ARG DOCKER_COMPOSE_PLUGIN_VERSION=5.5.1-1~debian.12~bookworm
ARG DOCKER_CLI_UPSTREAM_VERSION=29.8.1
ARG DOCKER_COMPOSE_UPSTREAM_VERSION=5.5.1
ARG DOCKER_CLI_LICENSE_SHA256=2d81ea060825006fc8f3fe28aa5dc0ffeb80faf325b612c955229157b8c10dc0
ARG DOCKER_CLI_NOTICE_SHA256=a8c869fbda819afb8d80e0ac19bac52e766bc6c19cb38cf94f52d64c4be2aab6
ARG DOCKER_COMPOSE_LICENSE_SHA256=58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd
ARG DOCKER_COMPOSE_NOTICE_SHA256=b7dca0a6b01fa7365e4892877a6321179ee343d72ee87a96cfc222141b99a1e6

RUN set -eux; \
    command -v curl; \
    test -r /etc/ssl/certs/ca-certificates.crt; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL \
      https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc; \
    chmod a+r /etc/apt/keyrings/docker.asc; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      docker-ce-cli="${DOCKER_CE_CLI_VERSION}" \
      docker-compose-plugin="${DOCKER_COMPOSE_PLUGIN_VERSION}"; \
    install -m 0755 -d /usr/share/doc/docker-ce-cli /usr/share/doc/docker-compose-plugin; \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL \
      "https://raw.githubusercontent.com/docker/cli/v${DOCKER_CLI_UPSTREAM_VERSION}/LICENSE" \
      -o /usr/share/doc/docker-ce-cli/LICENSE; \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL \
      "https://raw.githubusercontent.com/docker/cli/v${DOCKER_CLI_UPSTREAM_VERSION}/NOTICE" \
      -o /usr/share/doc/docker-ce-cli/NOTICE; \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL \
      "https://raw.githubusercontent.com/docker/compose/v${DOCKER_COMPOSE_UPSTREAM_VERSION}/LICENSE" \
      -o /usr/share/doc/docker-compose-plugin/LICENSE; \
    curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL \
      "https://raw.githubusercontent.com/docker/compose/v${DOCKER_COMPOSE_UPSTREAM_VERSION}/NOTICE" \
      -o /usr/share/doc/docker-compose-plugin/NOTICE; \
    echo "${DOCKER_CLI_LICENSE_SHA256}  /usr/share/doc/docker-ce-cli/LICENSE" | sha256sum -c -; \
    echo "${DOCKER_CLI_NOTICE_SHA256}  /usr/share/doc/docker-ce-cli/NOTICE" | sha256sum -c -; \
    echo "${DOCKER_COMPOSE_LICENSE_SHA256}  /usr/share/doc/docker-compose-plugin/LICENSE" | sha256sum -c -; \
    echo "${DOCKER_COMPOSE_NOTICE_SHA256}  /usr/share/doc/docker-compose-plugin/NOTICE" | sha256sum -c -; \
    rm -rf /var/lib/apt/lists/*
