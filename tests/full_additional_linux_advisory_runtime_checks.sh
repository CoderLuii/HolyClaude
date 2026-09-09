#!/usr/bin/env bash
set -Eeuo pipefail

require_package() {
  local package="$1"
  local expected_version="$2"
  local expected_architecture="$3"
  test "$(dpkg-query -W -f='${Version}' "$package")" = "$expected_version"
  test "$(dpkg-query -W -f='${Architecture}' "$package")" = "$expected_architecture"
}

test "$(cat /etc/holyclaude-variant)" = full
architecture="$(dpkg --print-architecture)"
case "$architecture" in
  amd64|arm64) ;;
  *)
    echo "Unsupported architecture: $architecture" >&2
    exit 1
    ;;
esac
multiarch="$(dpkg-architecture -qDEB_HOST_MULTIARCH)"
case "$architecture:$multiarch" in
  amd64:x86_64-linux-gnu|arm64:aarch64-linux-gnu) ;;
  *)
    echo "Unexpected multiarch tuple: $architecture:$multiarch" >&2
    exit 1
    ;;
esac

require_package gh '2.100.0' "$architecture"
gh_version="$(gh --version)"
grep -Fq 'gh version 2.100.0' <<<"$gh_version"

for package in libaom3 libaom-dev; do
  require_package "$package" '3.6.0-1+deb12u3' "$architecture"
done

require_package bsdutils '1:2.38.1-5+deb12u3' "$architecture"
for package in \
  libblkid-dev libblkid1 libfdisk1 libmount-dev libmount1 libsmartcols1 \
  libuuid1 mount util-linux util-linux-extra uuid-dev; do
  require_package "$package" '2.38.1-5+deb12u3' "$architecture"
done

for package in zlib1g zlib1g-dev; do
  require_package "$package" '1:1.2.13.dfsg-1' "$architecture"
done

for package in bind9-dnsutils bind9-host bind9-libs; do
  require_package "$package" '1:9.18.49-1~deb12u2' "$architecture"
done
require_package dnsutils '1:9.18.49-1~deb12u2' all

python3 /tests/junie_applicability_guard.py

if nsenter --help 2>&1 | grep -Fq -- '--join-cgroup'; then
  echo 'unexpected nsenter --join-cgroup support' >&2
  exit 1
fi

libmount_path="$(ldconfig -p | awk '/libmount\.so\.1 / { print $NF; exit }')"
test -n "$libmount_path"
for needle in 'MNT_STAGE_MOUNT_POST' 'X-mount.idmap' 'X-mount.owner' 'hook_subdir'; do
  if grep -aFq -- "$needle" /usr/bin/mount "$libmount_path"; then
    echo "unexpected util-linux hook marker: $needle" >&2
    exit 1
  fi
done

for zlib_artifact in "/lib/$multiarch/libz.so.1" "/usr/lib/$multiarch/libz.a"; do
  test -e "$zlib_artifact"
  if grep -aFq -- 'gz_vacate' "$zlib_artifact"; then
    echo "unexpected zlib nonblocking gzip marker: $zlib_artifact" >&2
    exit 1
  fi
done

if dpkg-query -W -f='${Status}' bind9 2>/dev/null | grep -Fq 'install ok installed'; then
  echo 'unexpected bind9 server package' >&2
  exit 1
fi
if command -v named >/dev/null 2>&1 || test -e /usr/sbin/named; then
  echo 'unexpected named server binary' >&2
  exit 1
fi

printf 'full additional %s Linux advisory runtime evidence passed\n' "$architecture"
