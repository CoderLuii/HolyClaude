import hashlib
import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("junie_guard", Path(__file__).with_name("junie_applicability_guard.py"))
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


class JunieGuardTests(unittest.TestCase):
    def make_jar(self, extra_classes=None, omit_ssl_baseline=False):
        root = tempfile.TemporaryDirectory()
        path = Path(root.name) / "fixture.jar"
        classes = {
            name: b"plain application bytecode"
            for name in guard.GATEWAY_CLASSES
        }
        classes["com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/trust/ProjectTrustStore.class"] = b"keyStore"
        if not omit_ssl_baseline:
            for name in guard.SSL_CONNECTOR_BASELINE:
                classes[name] = b"sslConnector"
        classes.update(extra_classes or {})
        with zipfile.ZipFile(path, "w") as archive:
            for name, content in sorted(classes.items()):
                archive.writestr(name, content)
            archive.writestr(guard.NETTY_PROPERTIES, f"version={guard.NETTY_VERSION}\n")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        gateway_hashes = {name: hashlib.sha256(classes[name]).hexdigest() for name in guard.GATEWAY_CLASSES}
        return root, path, digest, gateway_hashes

    def inspect(self, path, digest, gateway_hashes):
        return guard.inspect_jar(path, digest, gateway_hashes)

    def test_rejects_non_netty_sni_reference(self):
        root, path, digest, hashes = self.make_jar({"com/jetbrains/junie/NewGateway.class": guard.SNI_NAMES[0]})
        with root, self.assertRaisesRegex(RuntimeError, "non-Netty SNI handler"):
            self.inspect(path, digest, hashes)

    def test_rejects_new_application_tls_marker(self):
        root, path, digest, hashes = self.make_jar({"com/jetbrains/junie/NewGateway.class": b"clientAuth"})
        with root, self.assertRaisesRegex(RuntimeError, "unexpected application TLS configuration"):
            self.inspect(path, digest, hashes)

    def test_accepts_only_explicit_application_tls_baseline(self):
        root, path, digest, hashes = self.make_jar()
        with root:
            result = self.inspect(path, digest, hashes)
        self.assertEqual(result["application_tls_marker_matches"], {
            "clientAuth": [],
            "keyStore": ["com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/trust/ProjectTrustStore.class"],
            "sslConnector": [],
            "trustStore": [],
        })

    def test_rejects_missing_ktor_ssl_connector_baseline(self):
        root, path, digest, hashes = self.make_jar(omit_ssl_baseline=True)
        with root, self.assertRaisesRegex(RuntimeError, "reviewed sslConnector baseline missing"):
            self.inspect(path, digest, hashes)

    def test_rejects_wildcard_and_extra_listeners(self):
        self.assertEqual(guard.decode_address("/proc/net/tcp", "0100007F"), "127.0.0.1")
        self.assertEqual(guard.decode_address("/proc/net/tcp6", "0000000000000000FFFF00000100007F"), "127.0.0.1")
        self.assertEqual(guard.decode_address("/proc/net/tcp", "00000000"), "0.0.0.0")
        allowed = [{"address": "127.0.0.1", "port": 1234}]
        self.assertEqual(guard.validate_listener_set(allowed, 1234), allowed)
        with self.assertRaisesRegex(RuntimeError, "loopback-only"):
            guard.validate_listener_set([{"address": "0.0.0.0", "port": 1234}], 1234)
        with self.assertRaisesRegex(RuntimeError, "loopback-only"):
            guard.validate_listener_set(allowed * 2, 1234)

    def test_normal_tls_requires_parser_rejection(self):
        guard.validate_tls_parser_rejection(b"HTTP/1.0 400 Bad Request\r\n\r\nLine Feed must be preceded by Carriage Return")
        for response in (b"HTTP/1.1 200 OK\r\n\r\n", b"HTTP/1.1 404 Not Found\r\n\r\n", b""):
            with self.subTest(response=response), self.assertRaisesRegex(RuntimeError, "TLS ClientHello rejection"):
                guard.validate_tls_parser_rejection(response)

    def test_cleanup_requires_pid_and_listener_absence(self):
        guard.validate_cleanup(False, [])
        with self.assertRaisesRegex(RuntimeError, "remained after stop"):
            guard.validate_cleanup(True, [])
        with self.assertRaisesRegex(RuntimeError, "remained after stop"):
            guard.validate_cleanup(False, [{"address": "127.0.0.1", "port": 1234}])

    def test_post_stop_status_rejects_running_even_when_status_reuses_gateway_pid(self):
        output = "Gateway status: running\nPID: 396\nHost: 127.0.0.1\nPort: 41027\nWork dir: /root/.junie"
        match = guard.STATUS_PATTERN.search(output)
        with self.assertRaisesRegex(RuntimeError, "running status"):
            guard.validate_post_stop_status(0, output, match, 396, "127.0.0.1", 41027, False, [])

    def test_post_stop_status_accepts_exact_stale_config_after_cleanup(self):
        output = "Gateway status: not running (stale config)\nPID: 396\nHost: 127.0.0.1\nPort: 41027\nWork dir: /root/.junie"
        match = guard.STATUS_PATTERN.search(output)
        self.assertEqual(
            guard.validate_post_stop_status(0, output, match, 396, "127.0.0.1", 41027, False, []),
            "stale_config",
        )

    def test_post_stop_status_rejects_drift_and_rechecks_cleanup(self):
        changed = "Gateway status: running\nPID: 999\nHost: 127.0.0.1\nPort: 41027"
        with self.assertRaisesRegex(RuntimeError, "changed gateway tuple"):
            guard.validate_post_stop_status(
                0, changed, guard.STATUS_PATTERN.search(changed), 396, "127.0.0.1", 41027, False, [],
            )
        stopped = "No gateway is currently running."
        with self.assertRaisesRegex(RuntimeError, "remained after stop"):
            guard.validate_post_stop_status(0, stopped, None, 396, "127.0.0.1", 41027, True, [])
        with self.assertRaisesRegex(RuntimeError, "status command failed"):
            guard.validate_post_stop_status(1, stopped, None, 396, "127.0.0.1", 41027, False, [])

    def test_stop_gateway_terminates_supervisor_before_shutdown(self):
        events = []

        class Supervisor:
            pid = 172

            def poll(self):
                return None

            def terminate(self):
                events.append("terminate-supervisor")

            def wait(self, timeout):
                events.append(("wait-supervisor", timeout))
                return -15

        def stop_command(*args, **kwargs):
            events.append(("gateway-stop", args, kwargs))
            return SimpleNamespace(returncode=0, stdout="Gateway stopped (pid 173).", stderr="")

        with patch.object(guard.subprocess, "run", side_effect=stop_command):
            stopped, terminated = guard.stop_gateway(Supervisor(), "/junie", {"HOME": "/tmp/home"}, 173)

        self.assertTrue(terminated)
        self.assertEqual(stopped.returncode, 0)
        self.assertEqual(events[0:2], ["terminate-supervisor", ("wait-supervisor", 5)])
        self.assertEqual(
            events[2],
            (
                "gateway-stop",
                (["/junie", "--gateway-stop"],),
                {
                    "check": False,
                    "text": True,
                    "capture_output": True,
                    "timeout": 15,
                    "env": {"HOME": "/tmp/home"},
                },
            ),
        )

    def test_stop_gateway_does_not_shutdown_when_supervisor_survives(self):
        class Supervisor:
            pid = 172

            def poll(self):
                return None

            def terminate(self):
                pass

            def wait(self, timeout):
                raise guard.subprocess.TimeoutExpired("junie --gateway", timeout)

        with patch.object(guard.subprocess, "run") as stop_command:
            with self.assertRaisesRegex(RuntimeError, "supervisor could not be terminated"):
                guard.stop_gateway(Supervisor(), "/junie", {"HOME": "/tmp/home"}, 173)
        stop_command.assert_not_called()

    def test_rejects_unsupported_architecture(self):
        self.assertEqual(guard.validate_architecture("amd64"), "amd64")
        self.assertEqual(guard.validate_architecture("arm64"), "arm64")
        with self.assertRaisesRegex(RuntimeError, "unsupported architecture"):
            guard.validate_architecture("riscv64")


if __name__ == "__main__":
    unittest.main()
