#!/usr/bin/env python3
import argparse
import os
import stat
import sys


OPEN_DIRECTORY = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
OPEN_FILE = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
OPEN_PATH = getattr(os, "O_PATH", 0)


def fail(message):
    raise RuntimeError(message)


def relative_parts(home, target):
    home = os.path.abspath(home)
    target = os.path.abspath(target)
    if os.path.commonpath((home, target)) != home or target == home:
        fail(f"managed target escapes Claude home: {target}")
    relative = os.path.relpath(target, home)
    parts = relative.split(os.sep)
    if any(part in ("", ".", "..") for part in parts):
        fail(f"managed target contains an unsafe path component: {target}")
    return home, parts


def open_directory_at(parent_fd, name, description):
    try:
        descriptor = os.open(name, OPEN_DIRECTORY, dir_fd=parent_fd)
    except OSError as error:
        fail(f"{description} must be a real directory: {error}")
    return descriptor


def open_repairable_at(
    parent_fd,
    name,
    flags,
    expected_kind,
    uid,
    gid,
    change_owner,
    repair_mode,
    description,
    expected_metadata=None,
):
    try:
        return os.open(name, flags, dir_fd=parent_fd)
    except PermissionError as error:
        if change_owner or not OPEN_PATH:
            fail(f"{description} could not be opened for repair: {error}")
    except OSError as error:
        fail(f"{description} changed before repair: {error}")

    anchor_flags = OPEN_PATH | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        anchor = os.open(name, anchor_flags, dir_fd=parent_fd)
    except OSError as error:
        fail(f"{description} changed before repair: {error}")

    return_anchor = False
    try:
        metadata = os.fstat(anchor)
        if expected_kind == "file" and not stat.S_ISREG(metadata.st_mode):
            fail(f"{description} must be a regular file")
        if expected_kind == "directory" and not stat.S_ISDIR(metadata.st_mode):
            fail(f"{description} must be a directory")
        if expected_kind == "file" and metadata.st_nlink != 1:
            fail(f"{description} must not have multiple hard links")
        if expected_metadata is not None and (
            metadata.st_dev != expected_metadata.st_dev
            or metadata.st_ino != expected_metadata.st_ino
        ):
            fail(f"{description} changed before repair")
        verify_owner(metadata, uid, gid, description)

        if repair_mode is None:
            return_anchor = True
            return anchor

        proc_path = f"/proc/self/fd/{anchor}"
        if not os.path.exists("/proc/self/fd"):
            fail(f"{description} cannot be repaired without procfs")
        os.chmod(proc_path, repair_mode)
        repaired = os.fstat(anchor)
        if stat.S_IMODE(repaired.st_mode) != repair_mode:
            fail(f"{description} mode repair did not take effect")

        descriptor = os.open(name, flags, dir_fd=parent_fd)
        reopened = os.fstat(descriptor)
        if reopened.st_dev != metadata.st_dev or reopened.st_ino != metadata.st_ino:
            os.close(descriptor)
            fail(f"{description} changed during repair")
        return descriptor
    finally:
        if not return_anchor:
            os.close(anchor)


def open_parent(home, parts):
    try:
        descriptor = os.open(home, OPEN_DIRECTORY)
    except OSError as error:
        fail(f"Claude home must be a real directory: {error}")
    try:
        for part in parts[:-1]:
            child = open_directory_at(descriptor, part, f"managed parent {part}")
            os.close(descriptor)
            descriptor = child
        return descriptor
    except Exception:
        os.close(descriptor)
        raise


def verify_owner(metadata, uid, gid, description):
    if metadata.st_uid != uid or metadata.st_gid != gid:
        fail(f"{description} ownership repair did not take effect")


def repair_regular_file(descriptor, uid, gid, change_owner, mode, description):
    metadata = os.fstat(descriptor)
    if not stat.S_ISREG(metadata.st_mode):
        fail(f"{description} must be a regular file")
    if metadata.st_nlink != 1:
        fail(f"{description} must not have multiple hard links")
    if change_owner:
        os.fchown(descriptor, uid, gid)
    if mode is not None:
        os.fchmod(descriptor, mode)
    repaired = os.fstat(descriptor)
    if repaired.st_dev != metadata.st_dev or repaired.st_ino != metadata.st_ino:
        fail(f"{description} changed during repair")
    if repaired.st_nlink != 1:
        fail(f"{description} gained another hard link during repair")
    if change_owner:
        verify_owner(repaired, uid, gid, description)
    if mode is not None and stat.S_IMODE(repaired.st_mode) != mode:
        fail(f"{description} mode repair did not take effect")


def repair_directory(
    descriptor,
    uid,
    gid,
    change_owner,
    sensitive_file,
    prefix="",
    root_device=None,
):
    metadata = os.fstat(descriptor)
    if not stat.S_ISDIR(metadata.st_mode):
        fail("durable target must be a directory")
    if root_device is None:
        root_device = metadata.st_dev
    elif metadata.st_dev != root_device:
        fail(f"durable directory crosses a filesystem boundary: {prefix}")
    if change_owner:
        os.fchown(descriptor, uid, gid)
    os.fchmod(descriptor, 0o700)
    repaired = os.fstat(descriptor)
    if change_owner:
        verify_owner(repaired, uid, gid, "durable directory")
    if stat.S_IMODE(repaired.st_mode) != 0o700:
        fail("durable directory mode repair did not take effect")

    for name in os.listdir(descriptor):
        item_path = f"{prefix}/{name}" if prefix else name
        item = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
        if item_path == sensitive_file and not stat.S_ISREG(item.st_mode):
            fail(f"credential-bearing path must be a regular file: {item_path}")
        if stat.S_ISLNK(item.st_mode):
            continue
        if stat.S_ISDIR(item.st_mode):
            child = open_repairable_at(
                descriptor,
                name,
                OPEN_DIRECTORY,
                "directory",
                uid,
                gid,
                change_owner,
                0o700,
                f"durable directory {item_path}",
                item,
            )
            try:
                opened = os.fstat(child)
                if opened.st_dev != item.st_dev or opened.st_ino != item.st_ino:
                    fail(f"durable directory changed before repair: {item_path}")
                repair_directory(
                    child,
                    uid,
                    gid,
                    change_owner,
                    sensitive_file,
                    item_path,
                    root_device,
                )
            finally:
                os.close(child)
            continue
        if stat.S_ISREG(item.st_mode):
            mode = 0o600 if item_path == sensitive_file else None
            child = open_repairable_at(
                descriptor,
                name,
                OPEN_FILE,
                "file",
                uid,
                gid,
                change_owner,
                mode,
                f"durable file {item_path}",
                item,
            )
            try:
                opened = os.fstat(child)
                if opened.st_dev != item.st_dev or opened.st_ino != item.st_ino:
                    fail(f"durable file changed before repair: {item_path}")
                repair_regular_file(
                    child,
                    uid,
                    gid,
                    change_owner,
                    mode,
                    f"durable file {item_path}",
                )
            finally:
                os.close(child)


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--home", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--kind", choices=("file", "directory"), required=True)
    parser.add_argument("--uid", type=int, required=True)
    parser.add_argument("--gid", type=int, required=True)
    parser.add_argument("--chown", action="store_true")
    parser.add_argument("--owner-only", action="store_true")
    parser.add_argument("--sensitive-file", default="")
    return parser.parse_args()


def main():
    arguments = parse_arguments()
    if arguments.owner_only and arguments.kind != "directory":
        fail("owner-only repair requires a directory target")
    if arguments.sensitive_file and (
        os.path.isabs(arguments.sensitive_file)
        or any(part in ("", ".", "..") for part in arguments.sensitive_file.split("/"))
    ):
        fail("sensitive file must be a safe relative path")

    home, parts = relative_parts(arguments.home, arguments.target)
    parent = open_parent(home, parts)
    try:
        flags = OPEN_FILE if arguments.kind == "file" else OPEN_DIRECTORY
        target = open_repairable_at(
            parent,
            parts[-1],
            flags,
            arguments.kind,
            arguments.uid,
            arguments.gid,
            arguments.chown,
            0o600 if arguments.kind == "file" else 0o700,
            "durable target",
        )
    finally:
        os.close(parent)

    try:
        if arguments.owner_only:
            metadata = os.fstat(target)
            if not stat.S_ISDIR(metadata.st_mode):
                fail("managed parent must be a directory")
            if arguments.chown:
                os.fchown(target, arguments.uid, arguments.gid)
                verify_owner(os.fstat(target), arguments.uid, arguments.gid, "managed parent")
        elif arguments.kind == "file":
            repair_regular_file(
                target,
                arguments.uid,
                arguments.gid,
                arguments.chown,
                0o600,
                "durable file",
            )
        else:
            repair_directory(
                target,
                arguments.uid,
                arguments.gid,
                arguments.chown,
                arguments.sensitive_file,
            )
    finally:
        os.close(target)


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError) as error:
        print(f"[cli-persistence] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
