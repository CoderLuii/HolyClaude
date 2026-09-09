#!/usr/bin/env bash
set -Eeuo pipefail

require_package() {
  local package="$1"
  local expected_version="$2"
  test "$(dpkg-query -W -f='${Version}' "$package")" = "$expected_version"
  test "$(dpkg-query -W -f='${Architecture}' "$package")" = "$architecture"
}

test "$(cat /etc/holyclaude-variant)" = full
architecture="$(dpkg --print-architecture)"
case "$architecture" in
  amd64) library_dir=/usr/lib/x86_64-linux-gnu ;;
  arm64) library_dir=/usr/lib/aarch64-linux-gnu ;;
  *) echo "unsupported architecture: $architecture" >&2; exit 1 ;;
esac

python3 -I -S /tests/libxml2_python_binding_guard.py --variant full

require_package libevent-core-2.1-7 '2.1.12-stable-8'
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

require_package libtiff6 '4.5.0-6+deb12u4'
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
for consumer in \
  "$library_dir/gdk-pixbuf-2.0/2.10.0/loaders/libpixbufloader-tiff.so" \
  "$library_dir/libopenslide.so.0.4.1" \
  "$library_dir/ImageMagick-6.9.11/modules-Q16/coders/tiff.so" \
  "$library_dir/libpoppler.so.126.0.0" \
  "$library_dir/libtiffxx.so.6.0.0" \
  "$library_dir/libvips.so.42.16.1"; do
  test -f "$consumer"
  readelf -d "$consumer" | grep -Fq 'Shared library: [libtiff.so.6]'
done

printf 'full %s Linux advisory runtime evidence passed\n' "$architecture"
