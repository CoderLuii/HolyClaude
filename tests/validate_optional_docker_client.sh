#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <full-candidate@sha256:digest> <unique-name-prefix>" >&2
  exit 2
fi

base_image=$1
name_prefix=$2
if [[ ! ${base_image} =~ @sha256:[0-9a-f]{64}$ ]]; then
  echo "Full candidate must use an exact sha256 digest" >&2
  exit 2
fi
if [[ ! ${name_prefix} =~ ^[a-z0-9][a-z0-9_.-]{5,62}$ ]]; then
  echo "Name prefix must be 6-63 lowercase letters, digits, dots, underscores, or hyphens" >&2
  exit 2
fi
if [[ ${RUN_SOCKET_COMPOSE:-0} != 1 || ${REQUIRE_SOCKET_COMPOSE:-0} != 1 ]]; then
  echo "Native optional-client validation requires the authorized socket Compose cycle" >&2
  exit 2
fi
if [[ ${GITHUB_ACTIONS:-false} != true || ${RUNNER_ENVIRONMENT:-} != github-hosted ]]; then
  echo "Socket validation is restricted to an isolated GitHub-hosted runner" >&2
  exit 2
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "${script_dir}/.." && pwd)
recipe="${repo_root}/examples/docker-client/Dockerfile"
derived_image="holyclaude-optional-docker-client:${name_prefix}"
project_name="${name_prefix}-compose"
cleanup_status=0
derived_image_may_exist=0

compose_client() {
  local phase=$1
  shift
  docker run --rm \
    --name "${name_prefix}-client-${phase}" \
    --label com.coderluii.validation=optional-docker-client \
    --label "com.coderluii.validation.prefix=${name_prefix}" \
    --env "OPTIONAL_DOCKER_CLIENT_IMAGE=${derived_image}" \
    --env "OPTIONAL_DOCKER_CLIENT_PREFIX=${name_prefix}" \
    --mount "type=bind,src=${script_dir}/fixtures,dst=/validation,readonly" \
    --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
    --entrypoint docker \
    "${derived_image}" \
    compose --project-name "${project_name}" --file /validation/optional-docker-client-compose.yaml "$@"
}

cleanup() {
  local original_status=$?
  local current_status
  trap - EXIT
  set +e
  if [[ ${derived_image_may_exist} -eq 1 ]]; then
    docker image inspect "${derived_image}" >/dev/null 2>&1
    current_status=$?
    if [[ ${current_status} -eq 0 ]]; then
      compose_client cleanup down --remove-orphans >/dev/null 2>&1
      current_status=$?
      [[ ${current_status} -eq 0 ]] || cleanup_status=${current_status}
      docker image rm "${derived_image}" >/dev/null
      current_status=$?
      [[ ${current_status} -eq 0 ]] || cleanup_status=${current_status}
    else
      cleanup_status=${current_status}
    fi
  fi
  rm -f "${metadata_file}" "${base_packages}" "${derived_packages}" "${added_packages}"
  current_status=$?
  [[ ${current_status} -eq 0 ]] || cleanup_status=${current_status}
  if [[ ${original_status} -ne 0 ]]; then
    exit "${original_status}"
  fi
  exit "${cleanup_status}"
}

for command in docker jq comm awk; do
  command -v "${command}" >/dev/null
done

if docker image inspect "${derived_image}" >/dev/null 2>&1; then
  echo "Derived validation image already exists: ${derived_image}" >&2
  exit 1
fi
if docker ps -aq --filter "label=com.coderluii.validation.prefix=${name_prefix}" | grep -q .; then
  echo "Validation container label collision for ${name_prefix}" >&2
  exit 1
fi
if docker ps -aq --filter "label=com.docker.compose.project=${project_name}" | grep -q .; then
  echo "Compose project container collision for ${name_prefix}" >&2
  exit 1
fi
if docker network ls -q --filter "label=com.docker.compose.project=${project_name}" | grep -q .; then
  echo "Validation network label collision for ${name_prefix}" >&2
  exit 1
fi
metadata_file=$(mktemp)
base_packages=$(mktemp)
derived_packages=$(mktemp)
added_packages=$(mktemp)
trap cleanup EXIT

docker image inspect "${base_image}" >/dev/null 2>&1 || docker pull "${base_image}"
base_arch=$(docker image inspect "${base_image}" --format '{{.Architecture}}')
native_arch=$(uname -m)
engine_arch=$(docker info --format '{{.Architecture}}')
if [[ ${engine_arch} != "${native_arch}" ]]; then
  echo "Docker Engine is ${engine_arch}, but the native runner is ${native_arch}" >&2
  exit 1
fi
case "${native_arch}" in
  x86_64) image_arch=amd64; package_arch=amd64 ;;
  aarch64) image_arch=arm64; package_arch=arm64 ;;
  *) echo "Unsupported native architecture: ${native_arch}" >&2; exit 1 ;;
esac
if [[ ${base_arch} != "${image_arch}" ]]; then
  echo "Candidate is ${base_arch}, but the native runner requires ${image_arch}" >&2
  exit 1
fi
base_default_user=$(docker image inspect "${base_image}" --format '{{.Config.User}}')
printf 'native_arch=%s\nengine_arch=%s\nimage_arch=%s\npackage_arch=%s\nbase_image=%s\nbase_default_user=%s\n' \
  "${native_arch}" "${engine_arch}" "${image_arch}" "${package_arch}" "${base_image}" "${base_default_user:-root}"

derived_image_may_exist=1
docker buildx build \
  --pull \
  --load \
  --metadata-file "${metadata_file}" \
  --build-arg "BASE_IMAGE=${base_image}" \
  --tag "${derived_image}" \
  --file "${recipe}" \
  "${repo_root}/examples/docker-client"

derived_arch=$(docker image inspect "${derived_image}" --format '{{.Architecture}}')
[[ ${derived_arch} == "${base_arch}" ]]
derived_default_user=$(docker image inspect "${derived_image}" --format '{{.Config.User}}')
if [[ ${derived_default_user} != "${base_default_user}" ]]; then
  echo "Derived image changed the default user" >&2
  exit 1
fi
printf 'derived_default_user=%s\n' "${derived_default_user:-root}"

docker run --rm --entrypoint /bin/sh "${base_image}" -lc \
  'dpkg-query -W -f="\${Package}|\${Version}\n"' | sort -u > "${base_packages}"
docker run --rm --entrypoint /bin/sh "${derived_image}" -lc \
  'dpkg-query -W -f="\${Package}|\${Version}\n"' | sort -u > "${derived_packages}"
comm -13 "${base_packages}" "${derived_packages}" > "${added_packages}"
expected_packages=$(cat <<'PACKAGES'
docker-ce-cli|5:29.8.0-1~debian.12~bookworm
docker-compose-plugin|5.5.1-1~debian.12~bookworm
PACKAGES
)
if [[ $(cat "${added_packages}") != "${expected_packages}" ]]; then
  echo "Unexpected package inventory delta:" >&2
  cat "${added_packages}" >&2
  exit 1
fi

docker run --rm --entrypoint /bin/sh "${derived_image}" -lc '
  set -eu
  expected_arch=$1
  test "$(docker version --format "{{.Client.Version}}")" = 29.8.0
  test "$(docker compose version --short)" = 5.5.1
  test "$(dpkg-query -W -f="\${Architecture}" docker-ce-cli)" = "$expected_arch"
  test "$(dpkg-query -W -f="\${Architecture}" docker-compose-plugin)" = "$expected_arch"
  test ! -x /usr/bin/dockerd
  package_installed() {
    status=$(dpkg-query -W -f="\${db:Status-Abbrev}" "$1" 2>/dev/null || true)
    case "$status" in ii*) return 0 ;; *) return 1 ;; esac
  }
  ! package_installed docker-ce
  ! package_installed docker-ce-rootless-extras
  ! package_installed containerd.io
  ! package_installed docker-buildx-plugin
  sha256sum -c <<"HASHES"
2d81ea060825006fc8f3fe28aa5dc0ffeb80faf325b612c955229157b8c10dc0  /usr/share/doc/docker-ce-cli/LICENSE
a8c869fbda819afb8d80e0ac19bac52e766bc6c19cb38cf94f52d64c4be2aab6  /usr/share/doc/docker-ce-cli/NOTICE
58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd  /usr/share/doc/docker-compose-plugin/LICENSE
b7dca0a6b01fa7365e4892877a6321179ee343d72ee87a96cfc222141b99a1e6  /usr/share/doc/docker-compose-plugin/NOTICE
HASHES
' sh "${package_arch}"

docker run --rm \
  --name "${name_prefix}-remote-denied" \
  --user 65534:65534 \
  --env DOCKER_HOST=tcp://127.0.0.1:1 \
  --entrypoint /bin/sh \
  "${derived_image}" -lc '
    if docker version >/tmp/docker-version.out 2>&1; then
      echo "Unexpected remote Docker connection success" >&2
      exit 1
    fi
    grep -F "Cannot connect to the Docker daemon at tcp://127.0.0.1:1" /tmp/docker-version.out
  '

docker run --rm \
  --name "${name_prefix}-socket-denied" \
  --user 65534:65534 \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --entrypoint /bin/sh \
  "${derived_image}" -lc '
    if docker version >/tmp/docker-version.out 2>&1; then
      echo "Unexpected non-root Docker socket access" >&2
      exit 1
    fi
    grep -i "permission denied" /tmp/docker-version.out
  '

docker run --rm \
  --name "${name_prefix}-negotiate" \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --entrypoint docker \
  "${derived_image}" version

compose_client create create
compose_client start start
compose_client ps ps
compose_client logs logs probe | grep -F optional-docker-client-compose-ok
compose_client stop stop
compose_client down down --remove-orphans

if docker ps -aq --filter "label=com.coderluii.validation.prefix=${name_prefix}" | grep -q .; then
  echo "Owned validation containers remain after Compose down" >&2
  exit 1
fi
if docker network ls -q --filter "label=com.docker.compose.project=${project_name}" | grep -q .; then
  echo "Owned validation networks remain after Compose down" >&2
  exit 1
fi

build_ref=$(jq -er '."buildx.build.ref"' "${metadata_file}")
if [[ ! ${build_ref} =~ ^([^/[:space:]]+)/([^/[:space:]]+)/([^/[:space:]]+)$ ]]; then
  echo "Invalid Buildx build reference: ${build_ref}" >&2
  exit 1
fi
build_builder=${BASH_REMATCH[1]}
build_id=${BASH_REMATCH[3]}
docker buildx history inspect --builder "${build_builder}" --format json "${build_id}" >/dev/null
manifest_json=$(docker buildx history inspect attachment --builder "${build_builder}" --type manifest "${build_id}")
added_layer_compressed_bytes=$(jq -er '
  select(.schemaVersion == 2) |
  select(.mediaType == "application/vnd.oci.image.manifest.v1+json") |
  .layers | select(type == "array" and length > 0) |
  .[-1].size | select(type == "number" and . >= 0 and . <= 9007199254740991 and floor == .)
' <<< "${manifest_json}")
base_filesystem_bytes=$(
  docker run --rm --name "${name_prefix}-du-base" --entrypoint du "${base_image}" -sx --block-size=1 / |
    awk '{print $1}'
)
derived_filesystem_bytes=$(
  docker run --rm --name "${name_prefix}-du-derived" --entrypoint du "${derived_image}" -sx --block-size=1 / |
    awk '{print $1}'
)
printf 'added_layer_compressed_bytes=%s\n' "${added_layer_compressed_bytes}"
printf 'base_filesystem_bytes=%s\n' "${base_filesystem_bytes}"
printf 'derived_filesystem_bytes=%s\n' "${derived_filesystem_bytes}"
printf 'filesystem_delta_bytes=%s\n' "$((derived_filesystem_bytes - base_filesystem_bytes))"
