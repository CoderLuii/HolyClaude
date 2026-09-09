import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "libxml2_guard", Path(__file__).with_name("libxml2_python_binding_guard.py")
)
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


class FakeRunner:
    def __init__(self, architecture="amd64", package_version=guard.PACKAGE_VERSION, overrides=None):
        self.architecture = architecture
        self.package_version = package_version
        self.overrides = overrides or {}
        self.commands = []

    def __call__(self, command, **_kwargs):
        self.commands.append(command)
        key = tuple(command)
        if key in self.overrides:
            return self.overrides[key]
        if command == ["dpkg-query", "-W", "-f=${db:Status-Abbrev}", "python3-libxml2"]:
            return SimpleNamespace(
                returncode=1,
                stdout="",
                stderr="dpkg-query: no packages found matching python3-libxml2\n",
            )
        if command[:3] == ["dpkg-query", "-W", "-f=${db:Status-Abbrev}\t${Version}\t${Architecture}"]:
            return SimpleNamespace(
                returncode=0,
                stdout=f"ii \t{self.package_version}\t{self.architecture}",
                stderr="",
            )
        if command[:2] == ["readelf", "-dW"]:
            return SimpleNamespace(returncode=0, stdout="Shared library: [libc.so.6]\n", stderr="")
        if command[:2] == ["readelf", "-Ws"]:
            return SimpleNamespace(returncode=0, stdout="1: 0 FUNC GLOBAL DEFAULT UND xmlReadMemory\n", stderr="")
        if command[:2] == ["nm", "-A"]:
            return SimpleNamespace(returncode=0, stdout="libxml2.a: parser.o: T xmlReadMemory\n", stderr="")
        raise AssertionError(f"unexpected command: {command}")


class Libxml2PythonBindingGuardTests(unittest.TestCase):
    def make_layout(self, include_static=True):
        root = tempfile.TemporaryDirectory()
        base = Path(root.name)
        library_root = base / "lib"
        scan_root = base / "scan"
        library_root.mkdir()
        scan_root.mkdir()
        (library_root / "libxml2.so.2").write_bytes(b"shared")
        if include_static:
            (library_root / "libxml2.a").write_bytes(b"static")
        return root, library_root, scan_root

    def test_accepts_exact_full_and_slim_native_layouts(self):
        for variant, include_static, expected_packages in (
            ("full", True, {"libxml2", "libxml2-dev"}),
            ("slim", False, {"libxml2"}),
        ):
            root, library_root, scan_root = self.make_layout(include_static)
            runner = FakeRunner()
            with root:
                result = guard.verify(variant, "amd64", [scan_root], library_root, runner)
            self.assertEqual(result["packages"], expected_packages)
            self.assertEqual(result["binding_artifacts"], [])
            self.assertEqual(any(command[:2] == ["nm", "-A"] for command in runner.commands), variant == "full")

    def test_rejects_installed_python_binding_package_and_dpkg_errors(self):
        installed = FakeRunner(overrides={
            ("dpkg-query", "-W", "-f=${db:Status-Abbrev}", "python3-libxml2"):
                SimpleNamespace(returncode=0, stdout="ii ", stderr=""),
        })
        with self.assertRaisesRegex(RuntimeError, "python3-libxml2 package is installed"):
            guard.verify_absent_python_package(installed)

        broken = FakeRunner(overrides={
            ("dpkg-query", "-W", "-f=${db:Status-Abbrev}", "python3-libxml2"):
                SimpleNamespace(returncode=2, stdout="", stderr="database failure"),
        })
        with self.assertRaisesRegex(RuntimeError, "could not prove python3-libxml2 absent"):
            guard.verify_absent_python_package(broken)

    def test_bounds_external_commands_and_fails_closed_on_timeout(self):
        def timed_out(_command, **kwargs):
            self.assertEqual(kwargs["timeout"], 30)
            raise subprocess.TimeoutExpired(_command, kwargs["timeout"])

        with self.assertRaises(subprocess.TimeoutExpired):
            guard.run_command(["readelf", "-dW", "/fixture/libxml2.so.2"], timed_out)
        with self.assertRaises(subprocess.TimeoutExpired):
            guard.verify_absent_python_package(timed_out)

    def test_rejects_every_canonical_binding_name_under_every_scan_root(self):
        names = ["libxml2.py", "drv_libxml2.py", "libxml2mod.so", "libxml2mod.so.1", "_libxml2mod.so"]
        with tempfile.TemporaryDirectory() as temporary:
            roots = [Path(temporary) / name for name in ("usr-local", "usr-lib", "opt", "claude-local", "root-local")]
            for root in roots:
                root.mkdir()
            for root in roots:
                for name in names:
                    candidate = root / "nested" / name
                    candidate.parent.mkdir(exist_ok=True)
                    candidate.write_bytes(b"binding")
                    with self.subTest(root=root.name, name=name):
                        self.assertIn(candidate, guard.find_binding_artifacts(roots))
                    candidate.unlink()

    def test_rejects_a_canonical_binding_symlink_without_following_it(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            target = root / "target"
            target.write_bytes(b"binding")
            link = root / "libxml2.py"
            try:
                link.symlink_to(target)
            except (OSError, NotImplementedError) as error:
                self.skipTest(f"symlinks unavailable: {error}")
            self.assertEqual(guard.find_binding_artifacts([root]), [link])

    def test_fails_closed_on_filesystem_enumeration_errors(self):
        with tempfile.TemporaryDirectory() as temporary:
            with patch.object(guard.os, "scandir", side_effect=PermissionError("denied")):
                with self.assertRaisesRegex(RuntimeError, "could not inspect binding root"):
                    guard.find_binding_artifacts([Path(temporary)])

    def test_rejects_shared_and_static_python_abi_references(self):
        for output in (
            "Shared library: [libpython3.11.so.1.0]",
            "PyInit_libxml2mod",
            "_Py_Dealloc",
            "PyObject_Call",
            "pythonAttributeDecl",
        ):
            with self.subTest(output=output), self.assertRaisesRegex(RuntimeError, "Python ABI reference"):
                guard.reject_python_references("fixture", output)

        root, library_root, scan_root = self.make_layout()
        shared_runner = FakeRunner(overrides={
            ("readelf", "-Ws", str(library_root / "libxml2.so.2")):
                SimpleNamespace(returncode=0, stdout="PyInit_libxml2mod", stderr=""),
        })
        with root, self.assertRaisesRegex(RuntimeError, "core libxml2 symbol table contains Python ABI reference"):
            guard.verify("full", "amd64", [scan_root], library_root, shared_runner)

        root, library_root, scan_root = self.make_layout()
        static_runner = FakeRunner(overrides={
            ("nm", "-A", str(library_root / "libxml2.a")):
                SimpleNamespace(returncode=0, stdout="parser.o: U _Py_Dealloc", stderr=""),
        })
        with root, self.assertRaisesRegex(RuntimeError, "static libxml2 archive contains Python ABI reference"):
            guard.verify("full", "amd64", [scan_root], library_root, static_runner)

    def test_rejects_command_failure_missing_core_and_missing_full_static_library(self):
        root, library_root, scan_root = self.make_layout()
        failed = FakeRunner(overrides={
            ("readelf", "-dW", str(library_root / "libxml2.so.2")):
                SimpleNamespace(returncode=1, stdout="", stderr="bad ELF"),
        })
        with root, self.assertRaisesRegex(RuntimeError, "readelf -dW failed"):
            guard.verify("full", "amd64", [scan_root], library_root, failed)

        root, library_root, scan_root = self.make_layout(include_static=False)
        with root, self.assertRaisesRegex(RuntimeError, "required full-image static libxml2 archive is missing"):
            guard.verify("full", "amd64", [scan_root], library_root, FakeRunner())

        root, library_root, scan_root = self.make_layout(include_static=False)
        (library_root / "libxml2.so.2").unlink()
        with root, self.assertRaisesRegex(RuntimeError, "core libxml2 shared library is missing"):
            guard.verify("slim", "amd64", [scan_root], library_root, FakeRunner())

    def test_rejects_package_version_architecture_and_variant_drift(self):
        root, library_root, scan_root = self.make_layout()
        with root, self.assertRaisesRegex(RuntimeError, "package tuple mismatch"):
            guard.verify("full", "amd64", [scan_root], library_root, FakeRunner(package_version="2.9.14"))

        root, library_root, scan_root = self.make_layout()
        with root, self.assertRaisesRegex(RuntimeError, "package tuple mismatch"):
            guard.verify("full", "amd64", [scan_root], library_root, FakeRunner(architecture="arm64"))

        with self.assertRaisesRegex(RuntimeError, "unsupported variant"):
            guard.verify("other", "amd64", [], Path("/tmp"), FakeRunner())
        with self.assertRaisesRegex(RuntimeError, "unsupported architecture"):
            guard.verify("slim", "riscv64", [], Path("/tmp"), FakeRunner())


if __name__ == "__main__":
    unittest.main()
