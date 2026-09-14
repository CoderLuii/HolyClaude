#!/usr/bin/env python3

import ctypes
import hashlib
import ipaddress
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
import zipfile

VERSION = "3196.4"
ARCHITECTURES = {"amd64", "arm64"}
JAR_PATH = f"/home/claude/.local/share/junie/versions/{VERSION}/lib/app/junie-release-{VERSION}.jar"
JAR_SHA256 = "24cc3269086af0d31f475229b138bd3f965bbde8d41f879cc1ee38a4a94aff9f"
NETTY_VERSION = "4.2.9.Final"
NETTY_PROPERTIES = "META-INF/maven/io.netty/netty-handler/pom.properties"
MANIFEST_PATH = "META-INF/MANIFEST.MF"
MAIN_CLASS = "com.intellij.ml.llm.matterhorn.ej.app.cli.standalone.MainKt"
LAUNCHER_PATH = f"/home/claude/.local/share/junie/versions/{VERSION}/bin/junie"
GATEWAY_DISABLED_MESSAGE = "The --gateway option is not available in this version. Please use the Nightly build."
DIAGNOSTIC_LIMIT = 4096
PROCESS_ACCESS_RETRY_SECONDS = 0.1
PR_SET_CHILD_SUBREAPER = 36
PR_GET_CHILD_SUBREAPER = 37
SNI_NAMES = (
    b"io/netty/handler/ssl/SniHandler",
    b"io/netty/handler/ssl/AbstractSniHandler",
    b"io/netty/handler/ssl/SslClientHelloHandler",
)
SSL_CONNECTOR_BASELINE = {
    "io/ktor/server/engine/EngineConnectorConfigJvmKt.class",
    "io/ktor/server/engine/EnvironmentUtilsJvmKt.class",
}
GATEWAY_CLASSES = {
    "com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/http/GatewayServerKt.class": "6a1da55c9a946f73d5d5795c1f51a641c712d75fdd5421e852f2ab7a239c5221",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/MainKt.class": "0447ad9e5f7c4e8ebd96bafafa4a2eac81340396e3d03f2692c099b710a55642",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/MainKt.class": "bb30e63ba85ace4a353ed4e5036e89232aa7508308f7d690ac002a9731b63869",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/JunieCli.class": "ae45398e83a1c4401a13899bf88000478861030ef26c53cebdfe05a2fe6e19d0",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/options/SystemOptionsGroup.class": "5a953748e13fcd3b0006b007c77616651358522fa4f38a86d7a31ec18c14cf4d",
}
TLS_CONFIG_NAMES = (b"sslConnector", b"clientAuth", b"keyStore", b"trustStore")
APPLICATION_PREFIXES = (
    "com/intellij/ml/llm/matterhorn/",
    "com/jetbrains/junie/",
)
APPLICATION_TLS_BASELINE = {
    "sslConnector": [],
    "clientAuth": [],
    "keyStore": ["com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/trust/ProjectTrustStore.class"],
    "trustStore": [],
}
def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inspect_jar(path, expected_sha256=JAR_SHA256, expected_gateway_hashes=GATEWAY_CLASSES):
    with open(path, "rb") as source:
        jar_hash = sha256(source.read())
    if jar_hash != expected_sha256:
        raise RuntimeError(f"Junie JAR SHA-256 mismatch: {jar_hash}")

    with zipfile.ZipFile(path) as archive:
        class_names = sorted(name for name in archive.namelist() if name.endswith(".class"))
        if not class_names:
            raise RuntimeError("Junie JAR contains no classes")
        matches = {name.decode(): [] for name in SNI_NAMES}
        ssl_connector_matches = []
        application_tls_matches = {marker.decode(): [] for marker in TLS_CONFIG_NAMES}
        gateway_hashes = {}
        for class_name in class_names:
            data = archive.read(class_name)
            for internal_name in SNI_NAMES:
                if internal_name in data:
                    matches[internal_name.decode()].append(class_name)
            if b"sslConnector" in data:
                ssl_connector_matches.append(class_name)
            if class_name in expected_gateway_hashes:
                gateway_hashes[class_name] = sha256(data)
            if class_name.startswith(APPLICATION_PREFIXES):
                for marker in TLS_CONFIG_NAMES:
                    if marker in data:
                        application_tls_matches[marker.decode()].append(class_name)

        outside_netty = {
            name: [class_name for class_name in names if not class_name.startswith("io/netty/")]
            for name, names in matches.items()
        }
        if any(outside_netty.values()):
            raise RuntimeError(f"non-Netty SNI handler references found: {outside_netty}")
        unexpected_ssl_connectors = sorted(set(ssl_connector_matches) - SSL_CONNECTOR_BASELINE)
        if unexpected_ssl_connectors:
            raise RuntimeError(f"unexpected sslConnector references found: {unexpected_ssl_connectors}")
        if set(ssl_connector_matches) != SSL_CONNECTOR_BASELINE:
            raise RuntimeError(f"reviewed sslConnector baseline missing: {ssl_connector_matches}")
        unexpected_tls = {
            marker: sorted(set(classes) - set(APPLICATION_TLS_BASELINE[marker]))
            for marker, classes in application_tls_matches.items()
            if set(classes) - set(APPLICATION_TLS_BASELINE[marker])
        }
        if unexpected_tls:
            raise RuntimeError(f"unexpected application TLS configuration found: {unexpected_tls}")
        if application_tls_matches != APPLICATION_TLS_BASELINE:
            raise RuntimeError(f"reviewed application TLS baseline missing: {application_tls_matches}")
        if gateway_hashes != expected_gateway_hashes:
            raise RuntimeError(f"gateway class identity mismatch: {gateway_hashes}")

        properties = archive.read(NETTY_PROPERTIES).decode("utf-8")
        version_match = re.search(r"^version=(.+)$", properties, re.MULTILINE)
        netty_version = version_match.group(1).strip() if version_match else None
        if netty_version != NETTY_VERSION:
            raise RuntimeError(f"embedded netty-handler version mismatch: {netty_version}")

        manifest = archive.read(MANIFEST_PATH).decode("utf-8")
        main_class_match = re.search(r"^Main-Class:\s*(.+)$", manifest, re.MULTILINE)
        main_class = main_class_match.group(1).strip() if main_class_match else None
        if main_class != MAIN_CLASS:
            raise RuntimeError(f"Junie manifest Main-Class mismatch: {main_class}")

    return {
        "jar_path": path,
        "jar_sha256": jar_hash,
        "class_count": len(class_names),
        "netty_handler_version": netty_version,
        "sni_matches_outside_io_netty": outside_netty,
        "ssl_connector_matches": ssl_connector_matches,
        "application_tls_marker_matches": application_tls_matches,
        "gateway_class_sha256": gateway_hashes,
        "manifest_main_class": main_class,
    }


def decode_address(table, value):
    raw = bytes.fromhex(value)
    if table.endswith("tcp"):
        return str(ipaddress.IPv4Address(raw[::-1]))
    words = b"".join(raw[index:index + 4][::-1] for index in range(0, 16, 4))
    address = ipaddress.IPv6Address(words)
    return str(address.ipv4_mapped or address)


def socket_rows():
    rows = []
    for table in ("/proc/net/tcp", "/proc/net/tcp6"):
        with open(table, encoding="utf-8") as source:
            for line in list(source)[1:]:
                fields = line.split()
                if fields[3] != "0A":
                    continue
                address_hex, port_hex = fields[1].split(":")
                rows.append({
                    "table": table,
                    "address_hex": address_hex,
                    "address": decode_address(table, address_hex),
                    "port": int(port_hex, 16),
                    "inode": fields[9],
                })
    return rows


def process_metadata(pid):
    try:
        with open(f"/proc/{pid}/stat", encoding="utf-8") as source:
            fields = source.read().rpartition(") ")[2].split()
        return {
            "pid": pid,
            "state": fields[0],
            "ppid": int(fields[1]),
            "process_group": int(fields[2]),
            "session": int(fields[3]),
            "start_time": int(fields[19]),
        }
    except FileNotFoundError:
        return None
    except PermissionError as error:
        raise RuntimeError(f"cannot inspect live process {pid}") from error
    except (ValueError, IndexError) as error:
        raise RuntimeError(f"malformed process metadata for {pid}") from error


def process_table():
    processes = {}
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        process = process_metadata(int(entry))
        if process is not None:
            processes[process["pid"]] = process
    return processes


def child_subreaper_state():
    state = ctypes.c_int()
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(PR_GET_CHILD_SUBREAPER, ctypes.byref(state), 0, 0, 0) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))
    return bool(state.value)


def set_child_subreaper(enabled):
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(PR_SET_CHILD_SUBREAPER, int(enabled), 0, 0, 0) != 0:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))


def direct_child_identities(parent_pid, processes):
    return {
        (pid, process["start_time"])
        for pid, process in processes.items()
        if process["ppid"] == parent_pid
    }


def observe_owned_processes(root_pid, identities, adopter_pid, baseline_children):
    processes = process_table()
    discovered = {pid for pid, process in processes.items() if process["session"] == root_pid}
    discovered.update(pid for pid, start_time in identities.items() if processes.get(pid, {}).get("start_time") == start_time)
    discovered.update(
        pid
        for pid, process in processes.items()
        if process["ppid"] == adopter_pid and (pid, process["start_time"]) not in baseline_children
    )
    changed = True
    while changed:
        expanded = {pid for pid, process in processes.items() if process["ppid"] in discovered}
        changed = not expanded.issubset(discovered)
        discovered.update(expanded)
    for pid in discovered:
        identities.setdefault(pid, processes[pid]["start_time"])
    live = {
        pid: processes[pid]
        for pid, start_time in identities.items()
        if pid in processes and processes[pid]["start_time"] == start_time and processes[pid]["state"] != "Z"
    }
    return live


def process_identity_ended(pid, expected_start_time):
    process = process_metadata(pid)
    return process is None or process["state"] == "Z" or process["start_time"] != expected_start_time


def retry_process_access(operation, pid, expected_start_time, message):
    deadline = time.monotonic() + PROCESS_ACCESS_RETRY_SECONDS
    while True:
        if process_identity_ended(pid, expected_start_time):
            return None
        try:
            return operation()
        except FileNotFoundError:
            return None
        except PermissionError as error:
            if time.monotonic() >= deadline:
                if process_identity_ended(pid, expected_start_time):
                    return None
                raise RuntimeError(message) from error
            time.sleep(0.005)


def owned_listeners(pids):
    inodes = set()
    for pid in pids:
        try:
            descriptors = os.listdir(f"/proc/{pid}/fd")
        except FileNotFoundError:
            continue
        except PermissionError:
            descriptors = retry_process_access(
                lambda: os.listdir(f"/proc/{pid}/fd"),
                pid,
                pids[pid]["start_time"],
                f"cannot inspect file descriptors for live process {pid}",
            )
            if descriptors is None:
                continue
        for descriptor in descriptors:
            try:
                target = os.readlink(f"/proc/{pid}/fd/{descriptor}")
            except FileNotFoundError:
                continue
            except PermissionError:
                target = retry_process_access(
                    lambda: os.readlink(f"/proc/{pid}/fd/{descriptor}"),
                    pid,
                    pids[pid]["start_time"],
                    f"cannot inspect file descriptor {descriptor} for live process {pid}",
                )
                if target is None:
                    continue
            match = re.fullmatch(r"socket:\[(\d+)\]", target)
            if match:
                inodes.add(match.group(1))
    return sorted(
        (row for row in socket_rows() if row["inode"] in inodes),
        key=lambda row: (row["table"], row["address"], row["port"], row["inode"]),
    )


def bounded_diagnostics(stdout, stderr):
    output = f"{stdout}\n{stderr}".strip()
    if len(output) > DIAGNOSTIC_LIMIT:
        raise RuntimeError(f"Junie gateway diagnostics exceeded {DIAGNOSTIC_LIMIT} characters")
    return output


def validate_gateway_rejection(returncode, output):
    if returncode != 1:
        raise RuntimeError(f"Junie disabled gateway expected status 1, got {returncode}: {output}")
    if output != GATEWAY_DISABLED_MESSAGE:
        raise RuntimeError(f"unexpected disabled-gateway output: {output}")
    return output


def validate_runtime_residue(launcher_alive, descendants, listeners):
    if launcher_alive:
        raise RuntimeError("Junie disabled gateway launcher survived its rejection")
    if descendants:
        raise RuntimeError(f"Junie disabled gateway descendants survived: {descendants}")
    if listeners:
        raise RuntimeError(f"Junie disabled gateway listener appeared: {listeners}")


def validate_architecture(architecture):
    if architecture not in ARCHITECTURES:
        raise RuntimeError(f"unsupported architecture: {architecture}")
    return architecture


def signal_owned_processes(root_pid, identities, adopter_pid, baseline_children, signum):
    live = observe_owned_processes(root_pid, identities, adopter_pid, baseline_children)
    for pid in sorted(live, reverse=True):
        try:
            os.kill(pid, signum)
        except ProcessLookupError:
            continue
        except PermissionError as error:
            raise RuntimeError(f"cannot signal test-owned process {pid}") from error


def reap_owned_children(identities, exclude_pid):
    for pid in identities:
        if pid == exclude_pid:
            continue
        try:
            os.waitpid(pid, os.WNOHANG)
        except ChildProcessError:
            continue


def terminate_owned_processes(root_pid, identities, adopter_pid, baseline_children):
    signal_owned_processes(root_pid, identities, adopter_pid, baseline_children, signal.SIGTERM)
    deadline = time.monotonic() + 5
    while observe_owned_processes(root_pid, identities, adopter_pid, baseline_children) and time.monotonic() < deadline:
        reap_owned_children(identities, root_pid)
        time.sleep(0.05)
    if observe_owned_processes(root_pid, identities, adopter_pid, baseline_children):
        signal_owned_processes(root_pid, identities, adopter_pid, baseline_children, signal.SIGKILL)
    deadline = time.monotonic() + 5
    while observe_owned_processes(root_pid, identities, adopter_pid, baseline_children) and time.monotonic() < deadline:
        reap_owned_children(identities, root_pid)
        time.sleep(0.05)
    reap_owned_children(identities, root_pid)
    survivors = observe_owned_processes(root_pid, identities, adopter_pid, baseline_children)
    if survivors:
        raise RuntimeError(f"could not clean up test-owned Junie processes: {sorted(survivors)}")


def run_runtime(launcher, timeout_seconds=30):
    environment = os.environ.copy()
    environment.update({"HOME": "/tmp/junie-guard-home", "NO_PROXY": "127.0.0.1,localhost"})
    os.makedirs(environment["HOME"], mode=0o700, exist_ok=True)
    observed_listeners = {}
    surviving_descendants = []
    timed_out = False
    identities = {}
    adopter_pid = os.getpid()
    previous_subreaper = child_subreaper_state()
    set_child_subreaper(True)
    try:
        baseline_children = direct_child_identities(adopter_pid, process_table())
        with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stdout, tempfile.TemporaryFile(
            mode="w+", encoding="utf-8",
        ) as stderr:
            start = subprocess.Popen(
                [launcher, "--gateway", "--skip-update-check", "--config-default-locations=false"],
                text=True, stdout=stdout, stderr=stderr, env=environment, start_new_session=True,
            )
            deadline = time.monotonic() + timeout_seconds
            try:
                while start.poll() is None:
                    if time.monotonic() >= deadline:
                        timed_out = True
                        break
                    live = observe_owned_processes(start.pid, identities, adopter_pid, baseline_children)
                    for row in owned_listeners(live):
                        observed_listeners[(row["table"], row["address"], row["port"], row["inode"])] = row
                    time.sleep(0.02)
                live = observe_owned_processes(start.pid, identities, adopter_pid, baseline_children)
                for row in owned_listeners(live):
                    observed_listeners[(row["table"], row["address"], row["port"], row["inode"])] = row
                surviving_descendants = sorted(pid for pid in live if pid != start.pid)
            finally:
                terminate_owned_processes(start.pid, identities, adopter_pid, baseline_children)
                if start.poll() is None:
                    start.wait(timeout=5)
                reap_owned_children(identities, start.pid)
            stdout.seek(0)
            stderr.seek(0)
            output = bounded_diagnostics(stdout.read(DIAGNOSTIC_LIMIT + 1), stderr.read(DIAGNOSTIC_LIMIT + 1))
    finally:
        set_child_subreaper(previous_subreaper)

    if timed_out:
        raise RuntimeError(f"Junie disabled gateway command timed out: {output}")
    listeners = list(observed_listeners.values())
    validate_runtime_residue(start.poll() is None, surviving_descendants, listeners)
    rejection = validate_gateway_rejection(start.returncode, output)

    return {
        "command": ["--gateway", "--skip-update-check", "--config-default-locations=false"],
        "exit_status": start.returncode,
        "diagnostics": rejection,
        "surviving_descendants": surviving_descendants,
        "observed_listeners": listeners,
    }


def main():
    architecture = subprocess.run(["dpkg", "--print-architecture"], check=True, text=True, capture_output=True).stdout.strip()
    validate_architecture(architecture)
    static = inspect_jar(JAR_PATH)
    runtime = run_runtime(LAUNCHER_PATH)
    print(json.dumps({"schema_version": 1, "version": VERSION, "architecture": architecture, "static": static, "runtime": runtime}, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Junie applicability guard failed: {error}", file=sys.stderr)
        raise SystemExit(1)
