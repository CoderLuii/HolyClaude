#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: cleanup_candidate_scanner_disk.sh <candidate-image> <variant> <arch> <source-sha> <builder>}"
VARIANT="${2:?missing variant}"
ARCH="${3:?missing architecture}"
SOURCE_SHA="${4:?missing source SHA}"
BUILDER="${5:?missing Buildx builder}"

if [[ "${GITHUB_ACTIONS:-}" != true || "${RUNNER_ENVIRONMENT:-}" != github-hosted ]]; then
  echo "candidate scanner cleanup requires a GitHub-hosted runner" >&2
  exit 1
fi
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ || "${GITHUB_SHA:-}" != "$SOURCE_SHA" ]]; then
  echo "candidate scanner cleanup source SHA mismatch" >&2
  exit 1
fi
if [[ ! "$BUILDER" =~ ^builder-[A-Za-z0-9_.-]+$ ]]; then
  echo "candidate scanner cleanup requires the named job Buildx builder" >&2
  exit 1
fi
if [[ ! "${GITHUB_RUN_ID:-}" =~ ^[0-9]+$ || ! "${GITHUB_RUN_ATTEMPT:-}" =~ ^[0-9]+$ ]]; then
  echo "candidate scanner cleanup requires the GitHub run identity" >&2
  exit 1
fi

case "$VARIANT-$ARCH" in
  full-amd64) BASELINE='coderluii/holyclaude:1.6.0@sha256:b8f058f8c82cd3b4896188535a13b244994aec0ce4f21a3225d4851750b79162' ;;
  full-arm64) BASELINE='coderluii/holyclaude:1.6.0@sha256:caab18df125676f36b61b38875530544a0334326d01e30d0a045a6432c36a17c' ;;
  slim-amd64) BASELINE='coderluii/holyclaude:1.6.0-slim@sha256:42fb0117f98e43a4e98f7efaa2a769a1a81ec38e8fdbe2f361fd4ea6c604aeee' ;;
  slim-arm64) BASELINE='coderluii/holyclaude:1.6.0-slim@sha256:e40a907546a70a9c9b84283c924d92a22d5d9cfb8ed36559252ed0ce97ba2982' ;;
  *) echo "unsupported candidate cleanup target: $VARIANT-$ARCH" >&2; exit 1 ;;
esac

expected_ref="${DOCKERHUB_IMAGE:?missing Docker Hub image}:candidate-${SOURCE_SHA}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${VARIANT}-${ARCH}"
candidate_ref="${IMAGE%@*}"
candidate_digest="${IMAGE##*@}"
if [[ "$candidate_ref" != "$expected_ref" || ! "$candidate_digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "candidate scanner cleanup image identity mismatch" >&2
  exit 1
fi

candidate_before="$(docker image inspect --format '{{.Id}}|{{json .RepoDigests}}' "$IMAGE")"
if [[ -z "$candidate_before" || "$candidate_before" == *'|null' || "$candidate_before" == *'|[]' ]]; then
  echo "candidate scanner cleanup could not record image identity and RepoDigests" >&2
  exit 1
fi

echo "candidate scanner cleanup before: target=$VARIANT-$ARCH builder=$BUILDER"
df -h .
docker buildx du --builder "$BUILDER"

if [[ "$VARIANT" == full ]]; then
  for build in a b; do
    repro="holyclaude-ffmpeg-repro:${SOURCE_SHA}-${ARCH}-${build}"
    repro_ids="$(docker image ls --quiet --no-trunc "$repro")"
    if [[ -n "$repro_ids" ]]; then
      docker image rm "$repro"
    else
      echo "candidate scanner cleanup: FFmpeg reproduction image absent: $repro"
    fi
  done
fi

docker image rm "$BASELINE"
docker buildx prune --all --force --builder "$BUILDER"

candidate_after="$(docker image inspect --format '{{.Id}}|{{json .RepoDigests}}' "$IMAGE")"
if [[ "$candidate_after" != "$candidate_before" ]]; then
  echo "candidate scanner cleanup changed candidate image identity or RepoDigests" >&2
  exit 1
fi

docker buildx du --builder "$BUILDER"
df -h .
echo "candidate scanner cleanup complete: target=$VARIANT-$ARCH"
