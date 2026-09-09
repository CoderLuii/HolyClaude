#!/usr/bin/env python3

import hashlib
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import subprocess
import sys
import time
import zipfile

VERSION = "3220.1"
ARCHITECTURES = {"amd64", "arm64"}
JAR_PATH = f"/home/claude/.local/share/junie/versions/{VERSION}/lib/app/junie-nightly-{VERSION}.jar"
JAR_SHA256 = "86c6899a7478c5a5884c1ddaf50f7c8e794b51d92a41c597512989e162886ec1"
NETTY_VERSION = "4.2.9.Final"
NETTY_PROPERTIES = "META-INF/maven/io.netty/netty-handler/pom.properties"
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
    "com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/http/GatewayServerKt.class": "fcc58ed411567c0e03f1968e42472ed085a3f2b76fa2181c773a409de90b8aea",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/MainKt.class": "0447ad9e5f7c4e8ebd96bafafa4a2eac81340396e3d03f2692c099b710a55642",
    "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/MainKt.class": "bb30e63ba85ace4a353ed4e5036e89232aa7508308f7d690ac002a9731b63869",
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
STATUS_PATTERN = re.compile(r"PID:\s*(\d+).*?Host:\s*(\S+).*?Port:\s*(\d+)", re.DOTALL)
STATUS_LINE_PATTERN = re.compile(r"^Gateway status:\s*(.+?)\s*$", re.MULTILINE)


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

    return {
        "jar_path": path,
        "jar_sha256": jar_hash,
        "class_count": len(class_names),
        "netty_handler_version": netty_version,
        "sni_matches_outside_io_netty": outside_netty,
        "ssl_connector_matches": ssl_connector_matches,
        "application_tls_marker_matches": application_tls_matches,
        "gateway_class_sha256": gateway_hashes,
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


def owned_listeners(pid):
    inodes = set()
    for fd in os.listdir(f"/proc/{pid}/fd"):
        try:
            target = os.readlink(f"/proc/{pid}/fd/{fd}")
        except FileNotFoundError:
            continue
        match = re.fullmatch(r"socket:\[(\d+)\]", target)
        if match:
            inodes.add(match.group(1))
    return sorted((row for row in socket_rows() if row["inode"] in inodes), key=lambda row: (row["port"], row["table"]))


def capture_client_hello():
    context = ssl.create_default_context()
    incoming = ssl.MemoryBIO()
    outgoing = ssl.MemoryBIO()
    wrapped = context.wrap_bio(incoming, outgoing, server_side=False, server_hostname="protected.example")
    try:
        wrapped.do_handshake()
    except ssl.SSLWantReadError:
        pass
    hello = outgoing.read()
    if len(hello) < 9 or hello[0] != 22 or hello[5] != 1:
        raise RuntimeError("could not generate a TLS ClientHello")
    record_length = int.from_bytes(hello[3:5], "big")
    return hello[:5 + record_length]


def recv_bounded(connection):
    connection.settimeout(3)
    chunks = []
    try:
        while sum(map(len, chunks)) < 512:
            chunk = connection.recv(512)
            if not chunk:
                break
            chunks.append(chunk)
    except (ConnectionResetError, socket.timeout):
        pass
    return b"".join(chunks)


def validate_listener_set(listeners, port):
    if len(listeners) != 1 or listeners[0]["address"] != "127.0.0.1" or listeners[0]["port"] != port:
        raise RuntimeError(f"Junie gateway listener is not exactly loopback-only: {listeners}")
    return listeners


def validate_tls_parser_rejection(response):
    if not response.startswith(b"HTTP/1.0 400 Bad Request") or b"Line Feed must be preceded by Carriage Return" not in response:
        raise RuntimeError(f"TLS ClientHello rejection was ambiguous: {response[:80]!r}")


def validate_cleanup(pid_alive, listeners):
    if pid_alive or listeners:
        raise RuntimeError(f"Junie gateway remained after stop: pid={pid_alive} listeners={listeners}")


def validate_post_stop_status(
    returncode, output, match, pid, reported_host, port, pid_alive, listeners,
):
    validate_cleanup(pid_alive, listeners)
    if returncode != 0:
        raise RuntimeError(f"Junie gateway status command failed with status {returncode}: {output}")

    status_lines = STATUS_LINE_PATTERN.findall(output)
    if not match and not status_lines and "No gateway is currently running." in output:
        return "no_config"
    if not match or len(status_lines) != 1:
        raise RuntimeError(f"Junie gateway post-stop status is invalid: {output}")

    observed = int(match.group(1)), match.group(2), int(match.group(3))
    expected = pid, reported_host, port
    if observed != expected:
        raise RuntimeError(f"Junie gateway post-stop status changed gateway tuple: {observed} != {expected}")
    if status_lines[0] == "not running (stale config)":
        return "stale_config"
    if status_lines[0] == "running":
        raise RuntimeError(f"Junie gateway post-stop status has unexplained running status: {output}")
    raise RuntimeError(f"Junie gateway post-stop status is invalid: {output}")


def validate_architecture(architecture):
    if architecture not in ARCHITECTURES:
        raise RuntimeError(f"unsupported architecture: {architecture}")
    return architecture


def run_probes(port):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
    connection.request("GET", "/")
    response = connection.getresponse()
    http_result = {"status": response.status, "content_length": response.getheader("Content-Length"), "body_hex": response.read(64).hex()}
    connection.close()
    if http_result != {"status": 404, "content_length": "0", "body_hex": ""}:
        raise RuntimeError(f"unexpected gateway HTTP response: {http_result}")

    hello = capture_client_hello()
    with socket.create_connection(("127.0.0.1", port), timeout=3) as normal:
        normal.sendall(hello)
        normal_response = recv_bounded(normal)
    validate_tls_parser_rejection(normal_response)

    payload = hello[5:]
    first = hello[:3] + (1).to_bytes(2, "big") + payload[:1]
    second = hello[:3] + (len(payload) - 1).to_bytes(2, "big") + payload[1:]
    with socket.create_connection(("127.0.0.1", port), timeout=3) as fragmented:
        fragmented.sendall(first)
        time.sleep(0.05)
        fragmented.sendall(second)
        fragmented_response = recv_bounded(fragmented)
    validate_tls_parser_rejection(fragmented_response)

    return {
        "http": http_result,
        "normal_tls_client_hello": {"handshake_completed": False, "response_hex": normal_response[:160].hex()},
        "fragmented_tls_client_hello": {
            "handshake_completed": False,
            "handshake_header_spans_records": True,
            "first_record_payload_bytes": 1,
            "second_record_payload_bytes": len(payload) - 1,
            "response_hex": fragmented_response[:160].hex(),
        },
    }


def status(launcher, environment):
    process = subprocess.Popen(
        [launcher, "--gateway-status"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=environment,
    )
    try:
        stdout, stderr = process.communicate(timeout=15)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        output = f"{stdout}\n{stderr}".strip()
        raise RuntimeError(f"Junie gateway status command timed out: {output}")
    output = f"{stdout}\n{stderr}".strip()
    return process.returncode, output, STATUS_PATTERN.search(output), process.pid


def stop_gateway(supervisor, launcher, environment, pid):
    supervisor_terminated = supervisor.poll() is None
    if supervisor_terminated:
        supervisor.terminate()
        try:
            supervisor.wait(timeout=5)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError(
                f"Junie gateway supervisor could not be terminated: supervisor pid {supervisor.pid}, gateway pid {pid}"
            ) from error

    stopped = subprocess.run(
        [launcher, "--gateway-stop"], check=False, text=True, capture_output=True, timeout=15, env=environment,
    )
    if stopped.returncode != 0:
        raise RuntimeError(f"Junie gateway stop failed: {stopped.stdout} {stopped.stderr}")
    return stopped, supervisor_terminated


def run_runtime(launcher):
    environment = os.environ.copy()
    environment.update({"HOME": "/tmp/junie-guard-home", "NO_PROXY": "127.0.0.1,localhost"})
    os.makedirs(environment["HOME"], mode=0o700, exist_ok=True)
    start = subprocess.Popen(
        [launcher, "--gateway", "--skip-update-check", "--config-default-locations=false"],
        text=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=environment,
    )
    match = None
    status_output = ""
    for _ in range(120):
        if start.poll() not in (None, 0):
            raise RuntimeError(f"Junie gateway launcher exited with status {start.returncode}")
        _, status_output, match, _ = status(launcher, environment)
        if match:
            break
        time.sleep(0.5)
    if not match:
        raise RuntimeError(f"Junie gateway status unavailable: {status_output}")
    pid, reported_host, port = int(match.group(1)), match.group(2), int(match.group(3))
    listeners_before = owned_listeners(pid)
    validate_listener_set(listeners_before, port)
    probes = run_probes(port)
    listeners_after = owned_listeners(pid)
    if listeners_after != listeners_before:
        raise RuntimeError(f"Junie gateway listener set changed during probes: {listeners_after}")

    stopped, supervisor_terminated_before_stop = stop_gateway(start, launcher, environment, pid)
    for _ in range(30):
        if not os.path.exists(f"/proc/{pid}") and not any(row["port"] == port for row in socket_rows()):
            break
        time.sleep(0.2)
    pid_alive_after_stop = os.path.exists(f"/proc/{pid}")
    listeners_after_stop = [row for row in socket_rows() if row["port"] == port]
    validate_cleanup(pid_alive_after_stop, listeners_after_stop)
    post_stop_returncode, post_stop_status, post_stop_match, status_command_pid = status(launcher, environment)
    pid_alive_after_status = os.path.exists(f"/proc/{pid}")
    listeners_after_status = [row for row in socket_rows() if row["port"] == port]
    post_stop_status_validation = validate_post_stop_status(
        post_stop_returncode,
        post_stop_status,
        post_stop_match,
        pid,
        reported_host,
        port,
        pid_alive_after_status,
        listeners_after_status,
    )

    return {
        "pid": pid,
        "reported_host": reported_host,
        "port": port,
        "listeners_before": listeners_before,
        "listeners_after": listeners_after,
        **probes,
        "stop_output": f"{stopped.stdout}\n{stopped.stderr}".strip(),
        "post_stop_status": post_stop_status,
        "post_stop_status_validation": post_stop_status_validation,
        "status_command_pid": status_command_pid,
        "supervisor_terminated_before_stop": supervisor_terminated_before_stop,
        "pid_alive_after_stop": pid_alive_after_stop,
        "listeners_after_stop": listeners_after_stop,
        "pid_alive_after_status": pid_alive_after_status,
        "listeners_after_status": listeners_after_status,
    }


def main():
    architecture = subprocess.run(["dpkg", "--print-architecture"], check=True, text=True, capture_output=True).stdout.strip()
    validate_architecture(architecture)
    static = inspect_jar(JAR_PATH)
    runtime = run_runtime(f"/home/claude/.local/share/junie/versions/{VERSION}/bin/junie")
    print(json.dumps({"schema_version": 1, "version": VERSION, "architecture": architecture, "static": static, "runtime": runtime}, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Junie applicability guard failed: {error}", file=sys.stderr)
        raise SystemExit(1)
