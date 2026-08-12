#!/bin/sh
set -eu

FFMPEG_DEBIAN_VERSION='7:5.1.9-0+deb12u1'
FFMPEG_BACKPORT_VERSION='7:5.1.9-0+deb12u1+holyclaude1'
FFMPEG_DSC_SHA256='055f82fca9a92f1d47216be2c2488d09373c7ca154806fbc36b0127c191d5104'
FFMPEG_ORIG_SHA256='d9b593bb2ba93d4b50f74177e0cdcd41747e708596367deed0c30348a71dd176'
FFMPEG_ORIG_ASC_SHA256='443e6cdfe1560aab22f90ec40a967866ee04d5bbea32bc32625bd6e514d589f4'
FFMPEG_DEBIAN_TAR_SHA256='71b20472ecd2764bc98e3229d34c0f7c8dcfe4a6cbacc23fd5604c23bac04632'
FFMPEG_DVBSUB_UPSTREAM_COMMIT='02fc47e13f903768b75f7985a2706a6223ab4506'
FFMPEG_CFHD_UPSTREAM_COMMIT='16b2049d4d5222db6cd7c031409058571c94f6a9'
FFMPEG_REPRODUCIBLE_GZIP_UPSTREAM_COMMIT='1a7a85137e593f5164027da7ce53219829253f65'
FFMPEG_DVBSUB_PATCH_SHA256='d68cd830fb5f5dd2f597918def2efcdbf15306a9c8697cdae44636d1dd76c179'
FFMPEG_CFHD_PATCH_SHA256='a45eaa63baad988a38aacdd4c58470e3b80ef49ecd19f3e53c68b954317594a7'
FFMPEG_REPRODUCIBLE_GZIP_PATCH_SHA256='7958bf202bc5c88c6b90ba66fab05d0849df49e2b86cc1d2698bf3d826461e5f'
FFMPEG_SOURCE_BASE_URL='https://deb.debian.org/debian-security/pool/updates/main/f/ffmpeg'

: "${TARGETARCH:?TARGETARCH must be amd64 or arm64}"
case "$TARGETARCH" in
  amd64|arm64) ;;
  *) echo "Unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;;
esac

source_root=${1:-/tmp/ffmpeg-security-backport}
output_root=${2:-/out/ffmpeg-security-backport}
patch_root=${3:-/security/patches/ffmpeg}
source_dir="$source_root/ffmpeg-5.1.9"

test "$FFMPEG_DVBSUB_UPSTREAM_COMMIT" = '02fc47e13f903768b75f7985a2706a6223ab4506'
test "$FFMPEG_CFHD_UPSTREAM_COMMIT" = '16b2049d4d5222db6cd7c031409058571c94f6a9'
test "$FFMPEG_REPRODUCIBLE_GZIP_UPSTREAM_COMMIT" = '1a7a85137e593f5164027da7ce53219829253f65'

rm -rf "$source_root"
mkdir -p "$source_root" "$output_root"

download() {
  name=$1
  curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "$source_root/$name" "$FFMPEG_SOURCE_BASE_URL/$name"
}

download 'ffmpeg_5.1.9-0+deb12u1.dsc'
download 'ffmpeg_5.1.9.orig.tar.xz'
download 'ffmpeg_5.1.9.orig.tar.xz.asc'
download 'ffmpeg_5.1.9-0+deb12u1.debian.tar.xz'

printf '%s  %s\n' \
  "$FFMPEG_DSC_SHA256" "$source_root/ffmpeg_5.1.9-0+deb12u1.dsc" \
  "$FFMPEG_ORIG_SHA256" "$source_root/ffmpeg_5.1.9.orig.tar.xz" \
  "$FFMPEG_ORIG_ASC_SHA256" "$source_root/ffmpeg_5.1.9.orig.tar.xz.asc" \
  "$FFMPEG_DEBIAN_TAR_SHA256" "$source_root/ffmpeg_5.1.9-0+deb12u1.debian.tar.xz" \
  "$FFMPEG_DVBSUB_PATCH_SHA256" "$patch_root/CVE-2026-70628.patch" \
  "$FFMPEG_CFHD_PATCH_SHA256" "$patch_root/CVE-2026-70632.patch" \
  "$FFMPEG_REPRODUCIBLE_GZIP_PATCH_SHA256" "$patch_root/reproducible-ptx-gzip.patch" \
  | sha256sum -c -

mkdir "$source_dir"
tar -xf "$source_root/ffmpeg_5.1.9.orig.tar.xz" -C "$source_dir" --strip-components=1
tar -xf "$source_root/ffmpeg_5.1.9-0+deb12u1.debian.tar.xz" -C "$source_dir"

cd "$source_dir"
test "$(dpkg-parsechangelog -S Version)" = "$FFMPEG_DEBIAN_VERSION"
patch --batch --fuzz=0 --forward -p1 < "$patch_root/CVE-2026-70628.patch"
patch --batch --fuzz=0 --forward -p1 < "$patch_root/CVE-2026-70632.patch"
grep -Fqx '    if (buf_size - buf_pos > PARSE_BUF_SIZE - pc->packet_index)' libavcodec/dvbsub_parser.c
test "$(grep -Fxc '                lowpass_width < 3 || lowpass_height < 3 || lowpass_width * 2 > s->plane[plane].width) {' libavcodec/cfhd.c)" = 2
test "$(grep -Fxc '	$(M)gzip -c9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@' ffbuild/common.mak)" = 1
test "$(grep -Fxc '	$(M)gzip -nc9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@' ffbuild/common.mak)" = 0
patch --batch --fuzz=0 --forward -p1 < "$patch_root/reproducible-ptx-gzip.patch"
test "$(grep -Fxc '	$(M)gzip -c9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@' ffbuild/common.mak)" = 0
test "$(grep -Fxc '	$(M)gzip -nc9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@' ffbuild/common.mak)" = 1

cat > debian/changelog.holyclaude <<'EOF'
ffmpeg (7:5.1.9-0+deb12u1+holyclaude1) bookworm; urgency=medium

  * Backport CVE-2026-70628 and CVE-2026-70632 fixes.

 -- CoderLuii <coderluii@users.noreply.github.com>  Wed, 12 Aug 2026 00:00:00 +0000

EOF
cat debian/changelog >> debian/changelog.holyclaude
mv debian/changelog.holyclaude debian/changelog
test "$(dpkg-parsechangelog -S Version)" = "$FFMPEG_BACKPORT_VERSION"

SOURCE_DATE_EPOCH='1786492800' DEB_BUILD_OPTIONS='nocheck nodoc' dpkg-buildpackage -b -uc -us

runtime_packages='ffmpeg libavcodec59 libavdevice59 libavfilter8 libavformat59 libavutil57 libpostproc56 libswresample4 libswscale6'
for package_name in $runtime_packages; do
  package_file=$(find "$source_root" -maxdepth 1 -type f -name "${package_name}_*_${TARGETARCH}.deb" -print -quit)
  test -n "$package_file"
  test "$(dpkg-deb --field "$package_file" Version)" = "$FFMPEG_BACKPORT_VERSION"
  test "$(dpkg-deb --field "$package_file" Architecture)" = "$TARGETARCH"
  cp "$package_file" "$output_root/"
done

cd "$output_root"
sha256sum ./*.deb | sort -k2 > SHA256SUMS
test "$(wc -l < SHA256SUMS)" = 9
