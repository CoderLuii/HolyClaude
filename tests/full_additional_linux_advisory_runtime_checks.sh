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

require_package gh '2.103.0' "$architecture"
gh_version="$(gh --version)"
grep -Fq 'gh version 2.103.0' <<<"$gh_version"

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

case "$architecture" in
  amd64)
    junie_platform=amd64
    junie_jar_sha256=a0501be7a218a293aaa7d20a7bacbbe2e05e6e25bb4b15401984c10a0a95a46d
    ;;
  arm64)
    junie_platform=aarch64
    junie_jar_sha256=681a9b82ca37cd2a16e90c810eddc8fb21eb5e670a6364c19c2a787cdf29a73d
    ;;
esac
junie_jar_path="/home/claude/.local/share/junie/current/lib/app/junie-nightly-3888.1-linux-${junie_platform}.jar"
echo "$junie_jar_sha256  $junie_jar_path" | sha256sum -c -
junie_version_stderr="$(mktemp)"
set +e
junie_version="$(timeout 30s junie --version 2>"$junie_version_stderr")"
junie_version_status=$?
set -e
if [ "$junie_version_status" -ne 0 ]; then
  cat "$junie_version_stderr" >&2
  rm -f "$junie_version_stderr"
  exit "$junie_version_status"
fi
if [ "$junie_version" != 'Junie version: build 3888.1 nightly' ]; then
  cat "$junie_version_stderr" >&2
  rm -f "$junie_version_stderr"
  echo "unexpected Junie version output: $junie_version" >&2
  exit 1
fi
rm -f "$junie_version_stderr"
timeout 30s junie --help >/dev/null

if nsenter --help 2>&1 | grep -Fq -- '--join-cgroup'; then
  echo 'unexpected nsenter --join-cgroup support' >&2
  exit 1
fi

libmount_path="$(ldconfig -p | awk '/libmount\.so\.1 / && !found { path = $NF; found = 1 } END { if (found) print path }')"
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
