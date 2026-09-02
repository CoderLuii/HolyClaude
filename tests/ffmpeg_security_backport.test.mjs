import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const builderPath = 'scripts/build-ffmpeg-security-backport.sh';
const dockerfilePath = 'Dockerfile';
const attributesPath = '.gitattributes';
const immutableInputsPath = 'security/immutable-inputs.yml';
const runtimeChecksPath = 'tests/browser_runtime_container_checks.sh';
const dvbsubPatchPath = 'security/patches/ffmpeg/CVE-2026-70628.patch';
const cfhdPatchPath = 'security/patches/ffmpeg/CVE-2026-70632.patch';
const ristPatchPath = 'security/patches/ffmpeg/CVE-2026-75143.patch';
const reproducibleGzipPatchPath = 'security/patches/ffmpeg/reproducible-ptx-gzip.patch';

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('FFmpeg builder is executable at the Docker copy boundary', () => {
  const dockerfile = readFileSync(dockerfilePath, 'utf8');
  assert.match(
    dockerfile,
    /^COPY --chmod=0755 scripts\/build-ffmpeg-security-backport\.sh \/usr\/local\/bin\/build-ffmpeg-security-backport\.sh$/m,
  );
  assert.match(dockerfile, /RUN test -x \/usr\/local\/bin\/build-ffmpeg-security-backport\.sh && \\\n/);
});

test('FFmpeg backport inputs bind the exact Debian source and upstream fixes', () => {
  for (const path of [builderPath, dvbsubPatchPath, cfhdPatchPath, ristPatchPath, reproducibleGzipPatchPath]) {
    assert.ok(existsSync(path), `${path} must exist`);
  }

  const builder = readFileSync(builderPath, 'utf8');
  assert.match(builder, /FFMPEG_DEBIAN_VERSION='7:5\.1\.9-0\+deb12u1'/);
  assert.match(builder, /FFMPEG_BACKPORT_VERSION='7:5\.1\.9-0\+deb12u1\+holyclaude2'/);
  assert.match(builder, /FFMPEG_DSC_SHA256='055f82fca9a92f1d47216be2c2488d09373c7ca154806fbc36b0127c191d5104'/);
  assert.match(builder, /FFMPEG_ORIG_SHA256='d9b593bb2ba93d4b50f74177e0cdcd41747e708596367deed0c30348a71dd176'/);
  assert.match(builder, /FFMPEG_ORIG_ASC_SHA256='443e6cdfe1560aab22f90ec40a967866ee04d5bbea32bc32625bd6e514d589f4'/);
  assert.match(builder, /FFMPEG_DEBIAN_TAR_SHA256='71b20472ecd2764bc98e3229d34c0f7c8dcfe4a6cbacc23fd5604c23bac04632'/);
  assert.match(builder, /FFMPEG_DVBSUB_UPSTREAM_COMMIT='02fc47e13f903768b75f7985a2706a6223ab4506'/);
  assert.match(builder, /FFMPEG_CFHD_UPSTREAM_COMMIT='16b2049d4d5222db6cd7c031409058571c94f6a9'/);
  assert.match(builder, /FFMPEG_RIST_UPSTREAM_COMMIT='8880a174d08131f94f58a0492d1c8c6d68b74f67'/);
  assert.match(builder, /FFMPEG_REPRODUCIBLE_GZIP_UPSTREAM_COMMIT='1a7a85137e593f5164027da7ce53219829253f65'/);
  assert.match(builder, /FFMPEG_DVBSUB_PATCH_SHA256='d68cd830fb5f5dd2f597918def2efcdbf15306a9c8697cdae44636d1dd76c179'/);
  assert.match(builder, /FFMPEG_CFHD_PATCH_SHA256='a45eaa63baad988a38aacdd4c58470e3b80ef49ecd19f3e53c68b954317594a7'/);
  assert.match(builder, /FFMPEG_RIST_PATCH_SHA256='e3f65cffd2e3788809d6d6a7771df6eeb85121bdcc85d4f7267f30c4b7a7ed75'/);
  assert.match(builder, /FFMPEG_REPRODUCIBLE_GZIP_PATCH_SHA256='7958bf202bc5c88c6b90ba66fab05d0849df49e2b86cc1d2698bf3d826461e5f'/);
  const immutableInputs = readFileSync(immutableInputsPath, 'utf8');
  assert.match(immutableInputs, /FFmpeg CVE-2026-75143 backport[\s\S]{0,200}8880a174d08131f94f58a0492d1c8c6d68b74f67[\s\S]{0,200}e3f65cffd2e3788809d6d6a7771df6eeb85121bdcc85d4f7267f30c4b7a7ed75/);
  assert.match(immutableInputs, /FFmpeg reproducible PTX gzip backport[\s\S]{0,200}1a7a85137e593f5164027da7ce53219829253f65[\s\S]{0,200}7958bf202bc5c88c6b90ba66fab05d0849df49e2b86cc1d2698bf3d826461e5f/);
  assert.match(builder, /sha256sum -c/);
  assert.match(builder, /patch --batch --fuzz=0 --forward -p1/);
  assert.ok(builder.includes('patch --batch --fuzz=0 --forward -p1 < "$patch_root/CVE-2026-75143.patch"'));
  assert.ok(builder.includes("grep -Fqx '    size = FFMIN(data_block->payload_len, size);' libavformat/librist.c"));
  assert.match(readFileSync(dockerfilePath, 'utf8'), /ARG FFMPEG_BACKPORT_VERSION=7:5\.1\.9-0\+deb12u1\+holyclaude2/);
  assert.match(builder, /Wed, 02 Sep 2026 00:00:00 \+0000/);
  assert.match(builder, /SOURCE_DATE_EPOCH='1788307200'/);
  assert.doesNotMatch(builder, /\bdch\b/);
  assert.match(builder, /case "\$TARGETARCH" in\s+amd64\|arm64\)/);
  assert.match(builder, /"\$\{package_name\}_\*_\$\{TARGETARCH\}\.deb"/);
  assert.match(builder, /dpkg-deb --field "\$package_file" Architecture/);
  const oldGzipRule = '\t$(M)gzip -c9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@';
  const newGzipRule = '\t$(M)gzip -nc9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@';
  assert.ok(builder.includes(`test "$(grep -Fxc '${oldGzipRule}' ffbuild/common.mak)" = 1`));
  assert.ok(builder.includes(`test "$(grep -Fxc '${newGzipRule}' ffbuild/common.mak)" = 0`));
  assert.ok(builder.includes('patch --batch --fuzz=0 --forward -p1 < "$patch_root/reproducible-ptx-gzip.patch"'));
  assert.ok(builder.includes(`test "$(grep -Fxc '${oldGzipRule}' ffbuild/common.mak)" = 0`));
  assert.ok(builder.includes(`test "$(grep -Fxc '${newGzipRule}' ffbuild/common.mak)" = 1`));
  assert.match(builder, /dpkg-buildpackage -b -uc -us/);
});

test('FFmpeg backport patches are byte-bound to the reviewed upstream commits', () => {
  for (const path of [dvbsubPatchPath, cfhdPatchPath, ristPatchPath, reproducibleGzipPatchPath]) {
    assert.ok(existsSync(path), `${path} must exist`);
  }
  assert.equal(sha256(dvbsubPatchPath), 'd68cd830fb5f5dd2f597918def2efcdbf15306a9c8697cdae44636d1dd76c179');
  assert.equal(sha256(cfhdPatchPath), 'a45eaa63baad988a38aacdd4c58470e3b80ef49ecd19f3e53c68b954317594a7');
  assert.equal(sha256(ristPatchPath), 'e3f65cffd2e3788809d6d6a7771df6eeb85121bdcc85d4f7267f30c4b7a7ed75');
  assert.equal(sha256(reproducibleGzipPatchPath), '7958bf202bc5c88c6b90ba66fab05d0849df49e2b86cc1d2698bf3d826461e5f');

  const dvbsubPatch = readFileSync(dvbsubPatchPath, 'utf8');
  const cfhdPatch = readFileSync(cfhdPatchPath, 'utf8');
  const ristPatch = readFileSync(ristPatchPath, 'utf8');
  assert.match(dvbsubPatch, /buf_size - buf_pos > PARSE_BUF_SIZE - pc->packet_index/);
  assert.equal((cfhdPatch.match(/lowpass_width \* 2 > s->plane\[plane\]\.width/g) ?? []).length, 2);
  assert.match(ristPatch, /^\+    size = FFMIN\(data_block->payload_len, size\);$/m);
  const reproducibleGzipPatch = readFileSync(reproducibleGzipPatchPath, 'utf8');
  assert.match(reproducibleGzipPatch, /^-\t\$\(M\)gzip -c9 /m);
  assert.match(reproducibleGzipPatch, /^\+\t\$\(M\)gzip -nc9 /m);
  for (const patch of [dvbsubPatch, cfhdPatch, ristPatch, reproducibleGzipPatch]) {
    assert.doesNotMatch(patch, /^(From|From:|Subject:|Signed-off-by:|Co-authored-by:|Co-signed-by:)/mi);
  }
  assert.match(
    readFileSync(attributesPath, 'utf8'),
    /^\*\.patch text eol=lf whitespace=-blank-at-eol,-blank-at-eof,-space-before-tab$/m,
  );
});

test('FFmpeg RIST security patch applies exactly and rejects source drift', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'holyclaude-ffmpeg-rist-'));
  const patchPath = resolve(ristPatchPath);
  const vulnerableLine = '    size = data_block->payload_len;';
  const fixedLine = '    size = FFMIN(data_block->payload_len, size);';
  const source = [
    '    if (data_block->flags & RIST_DATA_FLAGS_OVERFLOW) {',
    '        if (!s->overrun_nonfatal) {',
    '            size = AVERROR(EIO);',
    '            goto out_free;',
    '        }',
    '    }',
    '',
    vulnerableLine,
    '    memcpy(buf, data_block->payload, size);',
    'out_free:',
    '    rist_receiver_data_block_free2(&data_block);',
    '    return size;',
    '',
  ].join('\n');

  try {
    const acceptedRoot = join(fixtureRoot, 'accepted');
    mkdirSync(join(acceptedRoot, 'libavformat'), { recursive: true });
    writeFileSync(join(acceptedRoot, 'libavformat', 'librist.c'), source);
    assert.equal(spawnSync('git', ['apply', '--check', patchPath], { cwd: acceptedRoot }).status, 0);
    assert.equal(spawnSync('git', ['apply', patchPath], { cwd: acceptedRoot }).status, 0);
    const patched = readFileSync(join(acceptedRoot, 'libavformat', 'librist.c'), 'utf8');
    assert.equal(patched.includes(vulnerableLine), false);
    assert.equal(patched.split(fixedLine).length - 1, 1);

    const driftedRoot = join(fixtureRoot, 'drifted');
    mkdirSync(join(driftedRoot, 'libavformat'), { recursive: true });
    writeFileSync(join(driftedRoot, 'libavformat', 'librist.c'), source.replace(vulnerableLine, '    size = (int)data_block->payload_len;'));
    assert.notEqual(spawnSync('git', ['apply', '--check', patchPath], { cwd: driftedRoot }).status, 0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('FFmpeg reproducibility patch applies exactly and rejects source drift', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'holyclaude-ffmpeg-gzip-'));
  const patchPath = resolve(reproducibleGzipPatchPath);
  const originalRule = '\t$(M)gzip -c9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@';
  const patchedRule = '\t$(M)gzip -nc9 $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) >$@';
  const source = [
    '$(BIN2CEXE): ffbuild/bin2c_host.o',
    '\t$(HOSTLD) $(HOSTLDFLAGS) $(HOSTLD_O) $^ $(HOSTEXTRALIBS)',
    '',
    'ifdef CONFIG_PTX_COMPRESSION',
    '%.ptx.gz: TAG = GZIP',
    '%.ptx.gz: %.ptx',
    originalRule,
    '',
    '%.ptx.c: %.ptx.gz $(BIN2CEXE)',
    '\t$(BIN2C) $(patsubst $(SRC_PATH)/%,$(SRC_LINK)/%,$<) $@ $(subst .,_,$(basename $(notdir $@)))',
    '',
  ].join('\n');

  try {
    const acceptedRoot = join(fixtureRoot, 'accepted');
    mkdirSync(join(acceptedRoot, 'ffbuild'), { recursive: true });
    writeFileSync(join(acceptedRoot, 'ffbuild', 'common.mak'), source);
    assert.equal(spawnSync('git', ['apply', '--check', patchPath], { cwd: acceptedRoot }).status, 0);
    assert.equal(spawnSync('git', ['apply', patchPath], { cwd: acceptedRoot }).status, 0);
    const patched = readFileSync(join(acceptedRoot, 'ffbuild', 'common.mak'), 'utf8');
    assert.equal(patched.includes(originalRule), false);
    assert.equal(patched.split(patchedRule).length - 1, 1);

    const driftedRoot = join(fixtureRoot, 'drifted');
    mkdirSync(join(driftedRoot, 'ffbuild'), { recursive: true });
    writeFileSync(join(driftedRoot, 'ffbuild', 'common.mak'), source.replace('gzip -c9', 'gzip -c8'));
    assert.notEqual(spawnSync('git', ['apply', '--check', patchPath], { cwd: driftedRoot }).status, 0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('FFmpeg backport exports every runtime package from the source revision', () => {
  assert.ok(existsSync(builderPath), `${builderPath} must exist`);
  const builder = readFileSync(builderPath, 'utf8');
  const expectedPackages = [
    'ffmpeg',
    'libavcodec59',
    'libavdevice59',
    'libavfilter8',
    'libavformat59',
    'libavutil57',
    'libpostproc56',
    'libswresample4',
    'libswscale6',
  ];
  assert.match(builder, new RegExp(`runtime_packages='${expectedPackages.join(' ')}'`));
  assert.match(builder, /dpkg-deb --field "\$package_file" Version/);
  assert.match(builder, /dpkg-deb --field "\$package_file" Architecture/);
});

test('full-image FFmpeg smoke probe is deterministic and externally bounded', () => {
  const runtimeChecks = readFileSync(runtimeChecksPath, 'utf8');
  assert.match(runtimeChecks, /timeout 20s ffmpeg -hide_banner -loglevel error/);
  assert.match(runtimeChecks, /-fflags \+bitexact -flags:v \+bitexact -flags:a \+bitexact/);
  assert.match(runtimeChecks, /-metadata creation_time=1970-01-01T00:00:00Z/);
  assert.match(runtimeChecks, /timeout 20s ffprobe -v error -select_streams v:0/);
  assert.match(runtimeChecks, /-show_entries stream=codec_name,width,height -of csv=p=0/);
  assert.match(runtimeChecks, /ffv1,16,16/);
  assert.match(runtimeChecks, /timeout 20s ffprobe -v error -select_streams a:0/);
  assert.match(runtimeChecks, /-show_entries stream=codec_name,sample_rate -of csv=p=0/);
  assert.match(runtimeChecks, /pcm_s16le,8000/);
  assert.match(runtimeChecks, /timeout 20s ffmpeg -v error -i/);
  assert.match(runtimeChecks, /media_sha256=\$\(sha256sum/);
});

test('runtime smoke requires the current FFmpeg security backport revision', () => {
  const smoke = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
  assert.match(smoke, /ffmpeg_backport_version='7:5\.1\.9-0\+deb12u1\+holyclaude2'/);
});
