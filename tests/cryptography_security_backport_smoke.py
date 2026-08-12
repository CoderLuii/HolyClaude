import datetime
import cryptography
import os
import subprocess
import sys
import tempfile
import time
from importlib.metadata import version

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
from cryptography.x509.verification import DNSName, PolicyBuilder, Store, VerificationError
from packaging.requirements import Requirement
from packaging.version import Version


EXPECTED_VERSION = Version("46.0.7+holyclaude.1")
NOW = datetime.datetime(2026, 8, 12, tzinfo=datetime.timezone.utc)


def certificate_name(common_name):
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])


def certificate_builder(subject, issuer, public_key, serial):
    return (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(public_key)
        .serial_number(serial)
        .not_valid_before(NOW - datetime.timedelta(days=1))
        .not_valid_after(NOW + datetime.timedelta(days=30))
    )


def make_ca(common_name, serial):
    key = ec.generate_private_key(ec.SECP256R1())
    subject = certificate_name(common_name)
    certificate = (
        certificate_builder(subject, subject, key.public_key(), serial)
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            True,
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), False)
        .sign(key, hashes.SHA256())
    )
    return key, certificate


def check_dependency_constraints():
    module_version = Version(cryptography.__version__)
    distribution_version = Version(version("cryptography"))
    assert module_version == EXPECTED_VERSION, module_version
    assert distribution_version == EXPECTED_VERSION, distribution_version
    assert module_version == distribution_version
    assert distribution_version in Requirement("cryptography<49,>=2.5").specifier
    assert distribution_version in Requirement("cryptography<47,>=46.0.0").specifier
    subprocess.run([sys.executable, "-m", "pip", "check"], check=True)


def check_azure_cli():
    with tempfile.TemporaryDirectory(prefix="holyclaude-az-smoke-") as config_dir:
        environment = os.environ.copy()
        environment["AZURE_CONFIG_DIR"] = config_dir
        environment["AZURE_CORE_COLLECT_TELEMETRY"] = "no"
        for command in (
            ["az", "version"],
            ["az", "--help"],
            ["az", "config", "get", "core.collect_telemetry"],
        ):
            subprocess.run(
                command,
                check=True,
                env=environment,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )


def check_x509_verification_budget(expect_fixed=True):
    _, unrelated_root = make_ca("unrelated root", 2)
    issuer_key = ec.generate_private_key(ec.SECP256R1())
    issuer_name = certificate_name("candidate CA")
    candidates = [make_ca("candidate CA", index + 1)[1] for index in range(129)]
    leaf_key = ec.generate_private_key(ec.SECP256R1())
    leaf = (
        certificate_builder(
            certificate_name("leaf"),
            issuer_name,
            leaf_key.public_key(),
            1000,
        )
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), True)
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("example.com")]), False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_key.public_key()),
            False,
        )
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), False)
        .sign(issuer_key, hashes.SHA256())
    )
    verifier = (
        PolicyBuilder()
        .store(Store([unrelated_root]))
        .time(NOW)
        .max_chain_depth(8)
        .build_server_verifier(DNSName("example.com"))
    )
    started = time.monotonic()
    try:
        verifier.verify(leaf, candidates)
    except VerificationError as exc:
        error = str(exc)
    else:
        raise AssertionError("invalid candidate chain was accepted")
    elapsed = time.monotonic() - started
    assert elapsed < 2.0, elapsed
    budget_error = "Exceeded maximum signature check limit"
    if expect_fixed:
        assert budget_error in error, error
    else:
        assert budget_error not in error, error
    return elapsed, error


def check_pkcs7_oracle_mitigation(expect_fixed=True):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = certificate_name("PKCS7 recipient")
    certificate = (
        certificate_builder(subject, subject, private_key.public_key(), 200)
        .sign(private_key, hashes.SHA256())
    )
    der = (
        pkcs7.PKCS7EnvelopeBuilder()
        .set_data(b"HolyClaude cryptography backport\n")
        .add_recipient(certificate)
        .encrypt(serialization.Encoding.DER, [])
    )
    public_key = certificate.public_key()
    assert isinstance(public_key, rsa.RSAPublicKey)
    key_bytes = public_key.key_size // 8
    marker = b"\x04\x82" + key_bytes.to_bytes(2, "big")
    assert der.count(marker) == 1
    offset = der.index(marker) + len(marker)

    outcomes = []
    for encrypted_key in (
        b"\x00" * key_bytes,
        public_key.encrypt(b"A" * 15, padding.PKCS1v15()),
        public_key.encrypt(b"A" * 17, padding.PKCS1v15()),
        public_key.encrypt(b"A" * 32, padding.PKCS1v15()),
        public_key.encrypt(b"A" * 16, padding.PKCS1v15()),
    ):
        tampered = der[:offset] + encrypted_key + der[offset + key_bytes :]
        try:
            pkcs7.pkcs7_decrypt_der(tampered, certificate, private_key, [])
        except ValueError as exc:
            outcomes.append(f"ValueError: {exc}")
        else:
            outcomes.append("success")

    normalized_outcomes = {"success", "ValueError: Invalid padding bytes."}
    if expect_fixed:
        assert set(outcomes) <= normalized_outcomes, outcomes
    else:
        assert any(outcome not in normalized_outcomes for outcome in outcomes), outcomes
    return outcomes


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--regression-only":
        assert sys.argv[2] in {"fixed", "vulnerable"}, sys.argv[2]
        expect_fixed = sys.argv[2] == "fixed"
        elapsed, error = check_x509_verification_budget(expect_fixed)
        outcomes = check_pkcs7_oracle_mitigation(expect_fixed)
        print(f"x509_elapsed={elapsed:.6f} x509_error={error}")
        print(f"pkcs7_outcomes={outcomes}")
        return
    assert len(sys.argv) == 1, sys.argv[1:]
    check_dependency_constraints()
    check_azure_cli()
    check_x509_verification_budget()
    check_pkcs7_oracle_mitigation()
    print("cryptography security backport smoke passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"cryptography security backport smoke failed: {exc}", file=sys.stderr)
        raise
