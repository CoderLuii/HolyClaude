#!/usr/bin/env python3

import argparse
import fnmatch
import json
import os
import re
import stat
import subprocess
from pathlib import Path


PACKAGE_VERSION = "2.9.14+dfsg-1.3~deb12u6"
ARCHITECTURES = {
    "amd64": "/usr/lib/x86_64-linux-gnu",
    "arm64": "/usr/lib/aarch64-linux-gnu",
}
SCAN_ROOTS = (
    "/usr/local",
    "/usr/lib",
    "/opt",
    "/home/claude/.local",
    "/root/.local",
)
PYTHON_REFERENCE = re.compile(r"libpython|PyInit_|_Py|Py[A-Z]|pythonAttributeDecl")
COMMAND_TIMEOUT_SECONDS = 30


def run_command(command, runner=subprocess.run):
    result = runner(
        command,
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "LC_ALL": "C"},
        timeout=COMMAND_TIMEOUT_SECONDS,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(command[:2])} failed: {result.stderr.strip()}")
    return result.stdout


def verify_absent_python_package(runner=subprocess.run):
    command = ["dpkg-query", "-W", "-f=${db:Status-Abbrev}", "python3-libxml2"]
    result = runner(
        command,
        check=False,
        capture_output=True,
        text=True,
        env={**os.environ, "LC_ALL": "C"},
        timeout=COMMAND_TIMEOUT_SECONDS,
    )
    if result.returncode == 0:
        raise RuntimeError("python3-libxml2 package is installed")
    if result.returncode != 1 or "no packages found matching python3-libxml2" not in result.stderr:
        raise RuntimeError(f"could not prove python3-libxml2 absent: {result.stderr.strip()}")


def binding_name(name):
    return (
        name in {"libxml2.py", "drv_libxml2.py"}
        or fnmatch.fnmatchcase(name, "libxml2mod*.so*")
        or fnmatch.fnmatchcase(name, "_libxml2mod*.so*")
    )


def find_binding_artifacts(roots):
    matches = []
    for root_value in roots:
        root = Path(root_value)
        try:
            root_stat = os.lstat(root)
        except FileNotFoundError:
            continue
        except OSError as error:
            raise RuntimeError(f"could not inspect binding root {root}: {error}") from error
        if not stat.S_ISDIR(root_stat.st_mode):
            raise RuntimeError(f"binding root is not a directory: {root}")

        pending = [root]
        while pending:
            directory = pending.pop()
            try:
                with os.scandir(directory) as entries:
                    for entry in entries:
                        path = Path(entry.path)
                        if binding_name(entry.name):
                            matches.append(path)
                        try:
                            if entry.is_dir(follow_symlinks=False):
                                pending.append(path)
                        except OSError as error:
                            raise RuntimeError(f"could not inspect binding artifact {path}: {error}") from error
            except OSError as error:
                raise RuntimeError(f"could not inspect binding root {directory}: {error}") from error
    return sorted(matches, key=lambda path: str(path))


def reject_python_references(label, output):
    match = PYTHON_REFERENCE.search(output)
    if match:
        raise RuntimeError(f"{label} contains Python ABI reference: {match.group(0)}")


def verify_package(package, architecture, runner=subprocess.run):
    output = run_command(
        ["dpkg-query", "-W", "-f=${db:Status-Abbrev}\t${Version}\t${Architecture}", package],
        runner,
    ).strip()
    expected = f"ii \t{PACKAGE_VERSION}\t{architecture}"
    if output != expected:
        raise RuntimeError(f"{package} package tuple mismatch: {output!r} != {expected!r}")


def verify(variant, architecture, roots, library_root, runner=subprocess.run):
    if variant not in {"full", "slim"}:
        raise RuntimeError(f"unsupported variant: {variant}")
    if architecture not in ARCHITECTURES:
        raise RuntimeError(f"unsupported architecture: {architecture}")

    packages = {"libxml2", "libxml2-dev"} if variant == "full" else {"libxml2"}
    for package in sorted(packages):
        verify_package(package, architecture, runner)
    verify_absent_python_package(runner)

    binding_artifacts = find_binding_artifacts(roots)
    if binding_artifacts:
        raise RuntimeError(f"libxml2 Python binding artifact found: {binding_artifacts[0]}")

    library_root = Path(library_root)
    shared_library = library_root / "libxml2.so.2"
    if not shared_library.exists():
        raise RuntimeError(f"core libxml2 shared library is missing: {shared_library}")
    reject_python_references(
        "core libxml2 dynamic section",
        run_command(["readelf", "-dW", str(shared_library)], runner),
    )
    reject_python_references(
        "core libxml2 symbol table",
        run_command(["readelf", "-Ws", str(shared_library)], runner),
    )

    static_library = library_root / "libxml2.a"
    if variant == "full":
        if not static_library.exists():
            raise RuntimeError(f"required full-image static libxml2 archive is missing: {static_library}")
        reject_python_references(
            "static libxml2 archive",
            run_command(["nm", "-A", str(static_library)], runner),
        )

    return {
        "architecture": architecture,
        "binding_artifacts": binding_artifacts,
        "packages": packages,
        "shared_library": str(shared_library),
        "static_library_checked": variant == "full",
        "variant": variant,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--variant", choices=("full", "slim"), required=True)
    args = parser.parse_args()
    architecture = run_command(["dpkg", "--print-architecture"]).strip()
    if architecture not in ARCHITECTURES:
        raise RuntimeError(f"unsupported architecture: {architecture}")
    result = verify(
        args.variant,
        architecture,
        [Path(root) for root in SCAN_ROOTS],
        Path(ARCHITECTURES[architecture]),
    )
    print(json.dumps(result, sort_keys=True, default=list))


if __name__ == "__main__":
    main()
