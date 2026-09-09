#!/usr/bin/env bash
set -Eeuo pipefail

require_package() {
  local package="$1"
  local expected_version="$2"
  local expected_architecture="$3"
  local actual_version
  local actual_architecture

  actual_version="$(dpkg-query -W -f='${Version}' "$package")"
  actual_architecture="$(dpkg-query -W -f='${Architecture}' "$package")"
  test "$actual_version" = "$expected_version"
  test "$actual_architecture" = "$expected_architecture"
}

test "$(cat /etc/holyclaude-variant)" = slim
architecture="$(dpkg --print-architecture)"
case "$architecture" in
  amd64) library_dir=/usr/lib/x86_64-linux-gnu ;;
  arm64) library_dir=/usr/lib/aarch64-linux-gnu ;;
  *) echo "unsupported architecture: $architecture" >&2; exit 1 ;;
esac

python3 -I -S /tests/libxml2_python_binding_guard.py --variant slim

require_package bsdutils '1:2.38.1-5+deb12u3' "$architecture"
for package in libblkid1 libfdisk1 libmount1 libsmartcols1 libuuid1 mount util-linux util-linux-extra; do
  require_package "$package" '2.38.1-5+deb12u3' "$architecture"
done
require_package zlib1g '1:1.2.13.dfsg-1' "$architecture"
for package in bind9-dnsutils bind9-host bind9-libs; do
  require_package "$package" '1:9.18.49-1~deb12u2' "$architecture"
done
require_package libevent-core-2.1-7 '2.1.12-stable-8' "$architecture"
require_package libtiff6 '4.5.0-6+deb12u4' "$architecture"

# dnsutils is architecture-all and is bound separately from platform-architecture packages.
require_package dnsutils '1:9.18.49-1~deb12u2' all

if nsenter --help 2>&1 | grep -Fq -- '--join-cgroup'; then
  echo 'unexpected nsenter --join-cgroup support' >&2
  exit 1
fi
if command -v named >/dev/null 2>&1; then
  echo 'unexpected named server binary' >&2
  exit 1
fi
if dpkg-query -W -f='${Status}' bind9 2>/dev/null | grep -Fq 'install ok installed'; then
  echo 'unexpected bind9 server package' >&2
  exit 1
fi
if test -e /usr/sbin/named; then
  echo 'unexpected /usr/sbin/named server binary' >&2
  exit 1
fi
if dpkg-query -W -f='${Status}' libevent-extra-2.1-7 2>/dev/null | grep -Fq 'install ok installed'; then
  echo 'unexpected libevent-extra package' >&2
  exit 1
fi
if dpkg-query -W -f='${Status}' libevent-dev 2>/dev/null | grep -Fq 'install ok installed'; then
  echo 'unexpected libevent-dev package' >&2
  exit 1
fi
if ldconfig -p | grep -Fq 'libevent_extra'; then
  echo 'unexpected libevent_extra library' >&2
  exit 1
fi
for static_library in \
  "$library_dir/libevent_extra.a" \
  "$library_dir/libevent.a"; do
  if test -e "$static_library"; then
    echo "unexpected libevent static library: $static_library" >&2
    exit 1
  fi
done
libevent_core_path="$(ldconfig -p | awk '/libevent_core-2\.1\.so\.7 / { print $NF; exit }')"
test -n "$libevent_core_path"
if test "$architecture" = arm64; then
  test "$(readlink -f "$libevent_core_path")" = "$library_dir/libevent_core-2.1.so.7.0.1"
  test "$(sha256sum "$libevent_core_path" | cut -d' ' -f1)" = c07184da97048cd7bdea88dede0b0ef26cf11c0bb16baeb48885839cc12086d0
  readelf -h "$libevent_core_path" | grep -Eq 'Machine:[[:space:]]+AArch64$'
fi
if nm -D --defined-only "$libevent_core_path" | grep -Fq ' evhttp_'; then
  echo 'unexpected evhttp symbol in libevent_core' >&2
  exit 1
fi
test "$(dpkg-query -S /usr/bin/tmux | cut -d: -f1)" = tmux
ldd /usr/bin/tmux | grep -Fq "$libevent_core_path"

if dpkg-query -W -f='${Status}' libtiff-tools 2>/dev/null | grep -Fq 'install ok installed'; then
  echo 'unexpected libtiff-tools package' >&2
  exit 1
fi
for command in tiffcrop tiffinfo tiffcp; do
  if command -v "$command" >/dev/null 2>&1; then
    echo "unexpected TIFF tool: $command" >&2
    exit 1
  fi
done
libtiff_path="$(ldconfig -p | awk '/libtiff\.so\.6 / { print $NF; exit }')"
test -n "$libtiff_path"
if test "$architecture" = arm64; then
  test "$(readlink -f "$libtiff_path")" = "$library_dir/libtiff.so.6.0.0"
  test "$(sha256sum "$libtiff_path" | cut -d' ' -f1)" = c56e31d69b7ad5fe570edf3ee145b0fa67bffa9b1e99aa6ca14798ec2ea1cddf
  readelf -h "$libtiff_path" | grep -Eq 'Machine:[[:space:]]+AArch64$'
fi
if nm -D --defined-only "$libtiff_path" | grep -Eq ' (process_command_opts|writeImageSections|getCropOffsets)$'; then
  echo 'unexpected tiffcrop-local symbol in libtiff6' >&2
  exit 1
fi
tiff_loader="$library_dir/gdk-pixbuf-2.0/2.10.0/loaders/libpixbufloader-tiff.so"
test -f "$tiff_loader"
readelf -d "$tiff_loader" | grep -Fq 'Shared library: [libtiff.so.6]'

libmount_path="$(ldconfig -p | awk '/libmount\.so\.1 / { print $NF; exit }')"
test -n "$libmount_path"
for needle in 'MNT_STAGE_MOUNT_POST' 'X-mount.idmap' 'X-mount.owner'; do
  if grep -aFq -- "$needle" /usr/bin/mount "$libmount_path"; then
    echo "unexpected util-linux hook marker: $needle" >&2
    exit 1
  fi
done
if grep -aFq -- 'hook_subdir' /usr/bin/mount "$libmount_path"; then
  echo 'unexpected detached-tree subdir hook marker' >&2
  exit 1
fi
if grep -aFq -- 'gz_vacate' "$library_dir/libz.so.1"; then
  echo 'unexpected zlib nonblocking gzip marker' >&2
  exit 1
fi

printf 'slim %s Linux advisory runtime evidence passed\n' "$architecture"
