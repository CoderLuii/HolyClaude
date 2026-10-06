import importlib.util
import io
import sys
import tempfile
import types
import unittest
from urllib.parse import parse_qsl, urlsplit
from contextlib import contextmanager
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NOTIFY_PATH = ROOT / "scripts" / "notify.py"

spec = importlib.util.spec_from_file_location("holyclaude_notify", NOTIFY_PATH)
notify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notify)


class FakeAppriseClient:
    added_urls = []

    def add(self, url):
        self.added_urls.append(url)
        return "[" not in url and url.startswith(("tgram://", "discord://"))

    def notify(self, **_kwargs):
        return True


@contextmanager
def fake_apprise():
    previous = sys.modules.get("apprise")
    sys.modules["apprise"] = types.SimpleNamespace(Apprise=FakeAppriseClient)
    try:
        yield
    finally:
        if previous is None:
            sys.modules.pop("apprise", None)
        else:
            sys.modules["apprise"] = previous


class NotifyTests(unittest.TestCase):
    def setUp(self):
        FakeAppriseClient.added_urls.clear()

    def test_normalizes_legacy_telegram_scheme(self):
        self.assertEqual(
            notify.normalize_notify_url("tg://123456:abcdef/987654"),
            "tgram://123456:abcdef/987654",
        )
        self.assertEqual(
            notify.normalize_notify_url("TG://123456:abcdef/987654"),
            "tgram://123456:abcdef/987654",
        )
        self.assertEqual(
            notify.normalize_notify_url("tgram://123456:abcdef/987654"),
            "tgram://123456:abcdef/987654",
        )

    def test_collect_urls_splits_and_normalizes_notify_urls(self):
        environ = {
            "NOTIFY_TELEGRAM": "tg://123456:abcdef/987654",
            "NOTIFY_URLS": " discord://webhook_id/webhook_token, TG://111111:token/222222 ",
            "OTHER_SETTING": "tg://ignored",
        }

        self.assertEqual(
            notify.collect_notify_urls(environ),
            [
                "tgram://123456:abcdef/987654",
                "discord://webhook_id/webhook_token",
                "tgram://111111:token/222222",
            ],
        )

    def test_normalizes_legacy_email_pgpkey_for_apprise_2(self):
        for scheme in ("mailto", "mailtos", "deltachat", "deltachats"):
            with self.subTest(scheme=scheme):
                normalized = notify.normalize_notify_url(
                    f"{scheme}://user:secret@example.com?to=ops%40example.com&pgpkey=%2Fkeys%2Fold.asc&format=text"
                )
                self.assertEqual(
                    parse_qsl(urlsplit(normalized).query, keep_blank_values=True),
                    [
                        ("to", "ops@example.com"),
                        ("pgppub", "/keys/old.asc"),
                        ("format", "text"),
                    ],
                )

    def test_canonical_pgppub_takes_precedence_without_changing_other_query_pairs(self):
        normalized = notify.normalize_notify_url(
            "mailtos://user:secret@example.com?pgpkey=legacy.asc&to=first%40example.com&pgppub=current.asc&to=second%40example.com"
        )
        self.assertEqual(
            parse_qsl(urlsplit(normalized).query, keep_blank_values=True),
            [
                ("to", "first@example.com"),
                ("pgppub", "current.asc"),
                ("to", "second@example.com"),
            ],
        )

    def test_every_apprise_add_site_migrates_legacy_email_pgpkey(self):
        legacy = "mailto://user:secret@example.com?pgpkey=legacy.asc"
        with fake_apprise():
            notify.validate_notify_urls([legacy])
            notify.send_notifications([legacy], "title", "body", "info")

        self.assertEqual(len(FakeAppriseClient.added_urls), 2)
        for url in FakeAppriseClient.added_urls:
            self.assertNotIn("pgpkey=", url)
            self.assertIn("pgppub=legacy.asc", url)

    def test_empty_environment_has_no_notification_urls(self):
        self.assertEqual(notify.collect_notify_urls({"TZ": "UTC"}), [])

    def test_collect_urls_preserves_malformed_urls_for_apprise_validation(self):
        self.assertEqual(
            notify.collect_notify_urls(
                {"NOTIFY_URLS": " mailto://[, discord://[ "}
            ),
            ["mailto://[", "discord://["],
        )

    def test_dry_run_reports_status_without_secret_values(self):
        with tempfile.NamedTemporaryFile() as flag_file, fake_apprise():
            stream = io.StringIO()
            exit_code = notify.run_dry_run(
                flag_file.name,
                {"NOTIFY_TELEGRAM": "tg://123456:abcdef/987654"},
                debug=True,
                stream=stream,
            )

        output = stream.getvalue()
        self.assertEqual(exit_code, 0)
        self.assertIn("[notify] flag: present", output)
        self.assertIn("[notify] tgram: ok", output)
        self.assertNotIn("123456", output)
        self.assertNotIn("abcdef", output)
        self.assertNotIn("987654", output)
        self.assertNotIn("tg://", output)

    def test_dry_run_fails_when_no_urls_are_configured(self):
        with tempfile.NamedTemporaryFile() as flag_file, fake_apprise():
            stream = io.StringIO()
            exit_code = notify.run_dry_run(
                flag_file.name,
                {"TZ": "UTC"},
                debug=True,
                stream=stream,
            )

        self.assertEqual(exit_code, 1)
        self.assertIn("[notify] urls: 0", stream.getvalue())

    def test_dry_run_rejects_malformed_urls_without_crashing(self):
        with tempfile.NamedTemporaryFile() as flag_file, fake_apprise():
            stream = io.StringIO()
            exit_code = notify.run_dry_run(
                flag_file.name,
                {"NOTIFY_URLS": "mailto://[,discord://["},
                debug=True,
                stream=stream,
            )

        output = stream.getvalue()
        self.assertEqual(exit_code, 1)
        self.assertEqual(
            FakeAppriseClient.added_urls,
            ["mailto://[", "discord://["],
        )
        self.assertIn("[notify] mailto: failed (rejected)", output)
        self.assertIn("[notify] discord: failed (rejected)", output)


if __name__ == "__main__":
    unittest.main()
