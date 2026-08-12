#!/bin/sh
set -eu

CRYPTOGRAPHY_VERSION='46.0.7'
CRYPTOGRAPHY_BACKPORT_VERSION='46.0.7+holyclaude.1'
CRYPTOGRAPHY_SOURCE_COMMIT='622d672e429a7cff836a23c5903683dbec1901f5'
CRYPTOGRAPHY_SOURCE_SHA256='e4cfd68c5f3e0bfdad0d38e023239b96a2fe84146481852dffbcca442c245aa5'
CRYPTOGRAPHY_X509_COMMIT='4a12cf49675a184e47f912b00b04f3a629283582'
CRYPTOGRAPHY_X509_PATCH_SHA256='92b6f545d41388c441d83f6f1e1a99ddfd76cc3eb5eed91dd167a25c0d032120'
CRYPTOGRAPHY_PKCS7_COMMIT='53fccd93413a8d7f07d6d8999681f27b75cffa3f'
CRYPTOGRAPHY_PKCS7_PATCH_SHA256='b2cf0e72db71646297ee78eba680d690676578e97cd8281ca46aa70c5f4593c0'
CRYPTOGRAPHY_RUST_VERSION='1.88.0'
CRYPTOGRAPHY_MATURIN_VERSION='1.9.6'
CRYPTOGRAPHY_CFFI_VERSION='2.0.0'
CRYPTOGRAPHY_SETUPTOOLS_VERSION='80.10.2'
CRYPTOGRAPHY_PATCHELF_VERSION='0.14.3'
CRYPTOGRAPHY_SOURCE_URL='https://files.pythonhosted.org/packages/47/93/ac8f3d5ff04d54bc814e961a43ae5b0b146154c89c61b47bb07557679b18/cryptography-46.0.7.tar.gz'
SOURCE_DATE_EPOCH='1775613009'

python_bin=${PYTHON_BIN:-python3}
source_root=${1:-/tmp/cryptography-security-backport}
output_root=${2:-/out/cryptography-security-backport}
patch_root=${3:-/security/patches/cryptography-46.0.7}
source_archive="$source_root/cryptography-$CRYPTOGRAPHY_VERSION.tar.gz"
source_dir="$source_root/cryptography-$CRYPTOGRAPHY_VERSION"
about_path='src/cryptography/__about__.py'

rm -rf "$source_root"
mkdir -p "$source_root" "$output_root"

case "$(rustc --version)" in
  "rustc $CRYPTOGRAPHY_RUST_VERSION "*) ;;
  *) echo "rustc $CRYPTOGRAPHY_RUST_VERSION is required" >&2; exit 1 ;;
esac
test "$(patchelf --version)" = "patchelf $CRYPTOGRAPHY_PATCHELF_VERSION"
test "$("$python_bin" -m maturin --version)" = "maturin $CRYPTOGRAPHY_MATURIN_VERSION"
test "$("$python_bin" -c "import cffi; print(cffi.__version__)")" = "$CRYPTOGRAPHY_CFFI_VERSION"
test "$("$python_bin" -c "import importlib.metadata; print(importlib.metadata.version('setuptools'))")" = "$CRYPTOGRAPHY_SETUPTOOLS_VERSION"

curl --disable --retry 8 --retry-all-errors --retry-max-time 300 --remove-on-error --connect-timeout 15 --max-time 300 -fsSL -o "$source_archive" "$CRYPTOGRAPHY_SOURCE_URL"
printf '%s  %s\n' \
  "$CRYPTOGRAPHY_SOURCE_SHA256" "$source_archive" \
  "$CRYPTOGRAPHY_X509_PATCH_SHA256" "$patch_root/GHSA-jwv3-5hgf-82ww.patch" \
  "$CRYPTOGRAPHY_PKCS7_PATCH_SHA256" "$patch_root/GHSA-g6cj-pr64-35w5.patch" \
  | sha256sum -c -

tar -xzf "$source_archive" -C "$source_root"
cd "$source_dir"
test "$(sed -n 's/^version = "\([^"]*\)"$/\1/p' pyproject.toml | head -1)" = "$CRYPTOGRAPHY_VERSION"
patch --batch --fuzz=0 --forward -p1 < "$patch_root/GHSA-jwv3-5hgf-82ww.patch"
patch --batch --fuzz=0 --forward -p1 < "$patch_root/GHSA-g6cj-pr64-35w5.patch"
grep -Fqx '    const DEFAULT_SIGNATURE_CHECK_LIMIT: usize = 1 << 7;' \
  src/rust/cryptography-x509-verification/src/lib.rs
grep -Fqx '            let random_key = crate::backend::rand::get_rand_bytes(py, key_size)?;' \
  src/rust/src/pkcs7.rs

test "$(grep -Fxc "__version__ = \"$CRYPTOGRAPHY_VERSION\"" "$about_path")" = 1
test "$(grep -Fxc "__version__ = \"$CRYPTOGRAPHY_BACKPORT_VERSION\"" "$about_path")" = 0
sed -i "0,/version = \"$CRYPTOGRAPHY_VERSION\"/s//version = \"$CRYPTOGRAPHY_BACKPORT_VERSION\"/" pyproject.toml
sed -i "s/^__version__ = \"$CRYPTOGRAPHY_VERSION\"$/__version__ = \"$CRYPTOGRAPHY_BACKPORT_VERSION\"/" "$about_path"
test "$(sed -n 's/^version = "\([^"]*\)"$/\1/p' pyproject.toml | head -1)" = "$CRYPTOGRAPHY_BACKPORT_VERSION"
test "$(grep -Fxc "__version__ = \"$CRYPTOGRAPHY_VERSION\"" "$about_path")" = 0
test "$(grep -Fxc "__version__ = \"$CRYPTOGRAPHY_BACKPORT_VERSION\"" "$about_path")" = 1

export PYTHONHASHSEED=0
export SOURCE_DATE_EPOCH
cargo test --locked --package cryptography-x509-verification
"$python_bin" -m maturin build --release --strip --locked --out "$output_root"

wheel_file=$(find "$output_root" -maxdepth 1 -type f -name 'cryptography-46.0.7+holyclaude.1-*.whl' -print)
test -n "$wheel_file"
test "$(printf '%s\n' "$wheel_file" | wc -l)" = 1
WHEEL_FILE="$wheel_file" "$python_bin" - <<'PY'
import os
import zipfile

metadata_path = "cryptography-46.0.7+holyclaude.1.dist-info/METADATA"
runtime_version_path = "cryptography/__about__.py"
with zipfile.ZipFile(os.environ["WHEEL_FILE"]) as wheel:
    if wheel.namelist().count(metadata_path) != 1:
        raise SystemExit(f"wheel must contain exactly one {metadata_path}")
    if wheel.namelist().count(runtime_version_path) != 1:
        raise SystemExit(f"wheel must contain exactly one {runtime_version_path}")
    metadata = wheel.read(metadata_path).decode("utf-8")
    runtime_version_source = wheel.read(runtime_version_path).decode("utf-8")
if "\nVersion: 46.0.7+holyclaude.1\n" not in f"\n{metadata}":
    raise SystemExit("wheel metadata version mismatch")
runtime_version_lines = [
    line for line in runtime_version_source.splitlines() if line.startswith("__version__ = ")
]
if runtime_version_lines != ['__version__ = "46.0.7+holyclaude.1"']:
    raise SystemExit("wheel runtime version mismatch")
if "\nRequires-Dist: cffi>=2.0.0 ; python_full_version >= '3.9' and platform_python_implementation != 'PyPy'\n" not in f"\n{metadata}":
    raise SystemExit("wheel cffi dependency mismatch")
PY

cd "$output_root"
wheel_name=$(basename "$wheel_file")
sha256sum "$wheel_name" > SHA256SUMS
