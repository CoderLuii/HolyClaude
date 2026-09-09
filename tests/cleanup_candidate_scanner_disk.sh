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
  full-amd64) BASELINE='coderluii/holyclaude:1.5.9@sha256:b797a832983c4f78e73ffdc9e673d384137f7c7e9836d71cf1672a2a10285ebd' ;;
  full-arm64) BASELINE='coderluii/holyclaude:1.5.9@sha256:30e2c9af3f85fd56ea515123532ee4f941c7154f66ad41bfdd07b02e0f541356' ;;
  slim-amd64) BASELINE='coderluii/holyclaude:1.5.9-slim@sha256:24aa28d1a801f02d560c0fb7406cdd33092b9776eaf563e78167840cbe384fc3' ;;
  slim-arm64) BASELINE='coderluii/holyclaude:1.5.9-slim@sha256:c69dbd24af1d4fb88fb00b71f931fc7824ece3e019d856b55abf5a3253955d74' ;;
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
