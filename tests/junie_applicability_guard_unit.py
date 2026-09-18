import hashlib
import importlib.util
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("junie_guard", Path(__file__).with_name("junie_applicability_guard.py"))
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


class JunieGuardTests(unittest.TestCase):
    def test_binds_official_stable_jar_identity(self):
        self.assertEqual(guard.VERSION, "3196.5")
        self.assertEqual(
            guard.JAR_PATH,
            "/home/claude/.local/share/junie/versions/3196.5/lib/app/junie-release-3196.5.jar",
        )
        self.assertEqual(guard.JAR_SHA256, "f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7")
        self.assertEqual(
            guard.GATEWAY_CLASSES[
                "com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/http/GatewayServerKt.class"
            ],
            "6a1da55c9a946f73d5d5795c1f51a641c712d75fdd5421e852f2ab7a239c5221",
        )
        self.assertEqual(guard.MAIN_CLASS, "com.intellij.ml.llm.matterhorn.ej.app.cli.standalone.MainKt")
        self.assertEqual(
            guard.GATEWAY_CLASSES[
                "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/JunieCli.class"
            ],
            "f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438",
        )
        self.assertEqual(
            guard.GATEWAY_CLASSES[
                "com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/options/SystemOptionsGroup.class"
            ],
            "5a953748e13fcd3b0006b007c77616651358522fa4f38a86d7a31ec18c14cf4d",
        )

    def make_jar(self, extra_classes=None, omit_ssl_baseline=False, netty_version=None, main_class=None):
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
            archive.writestr(guard.NETTY_PROPERTIES, f"version={netty_version or guard.NETTY_VERSION}\n")
            archive.writestr(
                guard.MANIFEST_PATH,
                f"Manifest-Version: 1.0\nMain-Class: {main_class or guard.MAIN_CLASS}\n",
            )
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

    def test_rejects_wrong_gateway_class_hash(self):
        root, path, digest, hashes = self.make_jar()
        hashes[next(iter(hashes))] = "0" * 64
        with root, self.assertRaisesRegex(RuntimeError, "gateway class identity mismatch"):
            self.inspect(path, digest, hashes)

    def test_rejects_wrong_embedded_netty_version(self):
        root, path, digest, hashes = self.make_jar(netty_version="4.2.10.Final")
        with root, self.assertRaisesRegex(RuntimeError, "embedded netty-handler version mismatch"):
            self.inspect(path, digest, hashes)

    def test_rejects_changed_manifest_entrypoint(self):
        root, path, digest, hashes = self.make_jar(main_class="example.UnsupportedMain")
        with root, self.assertRaisesRegex(RuntimeError, "manifest Main-Class mismatch"):
            self.inspect(path, digest, hashes)

    def test_decodes_listener_addresses(self):
        self.assertEqual(guard.decode_address("/proc/net/tcp", "0100007F"), "127.0.0.1")
        self.assertEqual(guard.decode_address("/proc/net/tcp6", "0000000000000000FFFF00000100007F"), "127.0.0.1")
        self.assertEqual(guard.decode_address("/proc/net/tcp", "00000000"), "0.0.0.0")

    def test_accepts_exact_stable_gateway_rejection(self):
        self.assertEqual(
            guard.validate_gateway_rejection(1, guard.GATEWAY_DISABLED_MESSAGE),
            guard.GATEWAY_DISABLED_MESSAGE,
        )

    def test_rejects_wrong_gateway_exit_and_output(self):
        for returncode in (0, 2):
            with self.subTest(returncode=returncode), self.assertRaisesRegex(RuntimeError, "expected status 1"):
                guard.validate_gateway_rejection(returncode, guard.GATEWAY_DISABLED_MESSAGE)
        with self.assertRaisesRegex(RuntimeError, "unexpected disabled-gateway output"):
            guard.validate_gateway_rejection(1, "gateway unavailable")

    def test_bounds_gateway_diagnostics(self):
        self.assertEqual(guard.bounded_diagnostics("", guard.GATEWAY_DISABLED_MESSAGE), guard.GATEWAY_DISABLED_MESSAGE)
        with self.assertRaisesRegex(RuntimeError, "diagnostics exceeded"):
            guard.bounded_diagnostics("x" * (guard.DIAGNOSTIC_LIMIT + 1), "")

    def test_rejects_listener_descendant_and_launcher_survivors(self):
        guard.validate_runtime_residue(False, [], [])
        with self.assertRaisesRegex(RuntimeError, "launcher survived"):
            guard.validate_runtime_residue(True, [], [])
        with self.assertRaisesRegex(RuntimeError, "descendants survived"):
            guard.validate_runtime_residue(False, [173], [])
        with self.assertRaisesRegex(RuntimeError, "listener appeared"):
            guard.validate_runtime_residue(False, [], [{"address": "127.0.0.1", "port": 1234}])

    def test_fd_permission_race_skips_only_ended_exact_process_identity(self):
        observed = {173: {"start_time": 9001}}
        ended = (
            None,
            {"pid": 173, "state": "Z", "start_time": 9001},
            {"pid": 173, "state": "S", "start_time": 9002},
        )
        for current in ended:
            with self.subTest(current=current), patch.object(
                guard.os, "listdir", side_effect=PermissionError("process exited")
            ), patch.object(guard, "process_metadata", return_value=current), patch.object(
                guard, "socket_rows", return_value=[]
            ):
                self.assertEqual(guard.owned_listeners(observed), [])

    def test_fd_permission_for_same_live_identity_still_fails_closed(self):
        observed = {173: {"start_time": 9001}}
        current = {"pid": 173, "state": "S", "start_time": 9001}
        permission_cases = (
            (PermissionError("fd directory denied"), None),
            (["4"], PermissionError("fd link denied")),
        )
        for descriptors, link in permission_cases:
            with self.subTest(descriptors=descriptors, link=link), patch.object(
                guard.os, "listdir", side_effect=descriptors if isinstance(descriptors, Exception) else None,
                return_value=None if isinstance(descriptors, Exception) else descriptors,
            ), patch.object(guard.os, "readlink", side_effect=link), patch.object(
                guard, "process_metadata", return_value=current
            ):
                with self.assertRaisesRegex(RuntimeError, "cannot inspect file descriptor"):
                    guard.owned_listeners(observed)

    def test_transient_fd_permission_for_same_live_identity_is_retried(self):
        observed = {173: {"start_time": 9001}}
        current = {"pid": 173, "state": "R", "start_time": 9001}
        with patch.object(
            guard.os, "listdir", side_effect=[PermissionError("exec transition"), ["1"]]
        ), patch.object(guard.os, "readlink", return_value="pipe:[42]"), patch.object(
            guard, "process_metadata", return_value=current
        ), patch.object(guard, "socket_rows", return_value=[]):
            self.assertEqual(guard.owned_listeners(observed), [])

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires Linux process and socket metadata")
    def test_runs_exact_disabled_gateway_launcher_contract(self):
        subreaper_before = guard.child_subreaper_state()
        with tempfile.TemporaryDirectory() as root:
            launcher = self.make_launcher(root, f'printf "%s\\n" "{guard.GATEWAY_DISABLED_MESSAGE}" >&2\nexit 1')
            result = guard.run_runtime(launcher, timeout_seconds=2)
        self.assertEqual(guard.child_subreaper_state(), subreaper_before)
        self.assertEqual(result["exit_status"], 1)
        self.assertEqual(result["diagnostics"], guard.GATEWAY_DISABLED_MESSAGE)
        self.assertEqual(result["surviving_descendants"], [])
        self.assertEqual(result["observed_listeners"], [])

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires Linux process and socket metadata")
    def test_runtime_rejects_transient_owned_listener(self):
        with tempfile.TemporaryDirectory() as root:
            listener = (
                "import socket,time; s=socket.socket(); s.bind(('127.0.0.1',0)); "
                "s.listen(); time.sleep(0.3)"
            )
            launcher = self.make_launcher(
                root,
                f"python3 -c \"{listener}\"\n"
                f'printf "%s\\n" "{guard.GATEWAY_DISABLED_MESSAGE}" >&2\nexit 1',
            )
            with self.assertRaisesRegex(RuntimeError, "listener appeared"):
                guard.run_runtime(launcher, timeout_seconds=2)

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires Linux process and socket metadata")
    def test_runtime_rejects_and_cleans_double_forked_session_escape_without_killing_unrelated_child(self):
        subreaper_before = guard.child_subreaper_state()
        with tempfile.TemporaryDirectory() as root:
            child_pid = Path(root) / "child.pid"
            escaped = (
                "import os,pathlib,time; first=os.fork(); "
                "first and os._exit(0); os.setsid(); second=os.fork(); second and os._exit(0); "
                f"pathlib.Path({str(child_pid)!r}).write_text(str(os.getpid())); time.sleep(30)"
            )
            launcher = self.make_launcher(
                root,
                f"python3 -c \"{escaped}\"\n"
                f'printf "%s\\n" "{guard.GATEWAY_DISABLED_MESSAGE}" >&2\nexit 1',
            )
            unrelated = subprocess.Popen(["sleep", "30"])
            try:
                with self.assertRaisesRegex(RuntimeError, "descendants survived"):
                    guard.run_runtime(launcher, timeout_seconds=2)
                pid = int(child_pid.read_text())
                for _ in range(50):
                    if not Path(f"/proc/{pid}").exists():
                        break
                    time.sleep(0.02)
                self.assertFalse(Path(f"/proc/{pid}").exists())
                self.assertIsNone(unrelated.poll())
                self.assertEqual(guard.child_subreaper_state(), subreaper_before)
            finally:
                unrelated.terminate()
                unrelated.wait(timeout=2)

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires Linux process and socket metadata")
    def test_runtime_times_out_and_cleans_test_owned_launcher(self):
        with tempfile.TemporaryDirectory() as root:
            launcher_pid = Path(root) / "launcher.pid"
            launcher = self.make_launcher(root, f'printf "%s" "$$" > {launcher_pid!s}\nsleep 30')
            with self.assertRaisesRegex(RuntimeError, "command timed out"):
                guard.run_runtime(launcher, timeout_seconds=0.1)
            pid = int(launcher_pid.read_text())
            self.assertFalse(Path(f"/proc/{pid}").exists())

    def make_launcher(self, root, gateway_body):
        launcher = Path(root) / "junie"
        launcher.write_text(
            "#!/bin/sh\n"
            'if [ "$1" = "--gateway" ]; then\n'
            f"{gateway_body}\n"
            "fi\n"
            "exit 64\n",
            encoding="utf-8",
        )
        launcher.chmod(0o700)
        return str(launcher)

    def test_rejects_unsupported_architecture(self):
        self.assertEqual(guard.validate_architecture("amd64"), "amd64")
        self.assertEqual(guard.validate_architecture("arm64"), "arm64")
        with self.assertRaisesRegex(RuntimeError, "unsupported architecture"):
            guard.validate_architecture("riscv64")


if __name__ == "__main__":
    unittest.main()
