#!/usr/bin/env python3
"""HolyClaude — Apprise Notification Script
Usage: notify.py stop | notify.py error
Only sends if ~/.claude/notify-on flag file exists AND NOTIFY_* env vars are set.
"""

import os
import sys
import argparse
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


FLAG_FILE = "/home/claude/.claude/notify-on"
LEGACY_TELEGRAM_RE = re.compile(r"^tg://", re.IGNORECASE)
SCHEME_RE = re.compile(r"^([a-z][a-z0-9+.-]*):\/\/", re.IGNORECASE)
EMAIL_SCHEMES = {"mailto", "mailtos", "deltachat", "deltachats"}


def sanitize(value, limit=120):
    if value is None:
        return ""
    text = str(value).replace("\x00", "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        return text[: limit - 3].rstrip() + "..."
    return text


def parse_args(argv):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("event", nargs="?", default="unknown")
    parser.add_argument("--provider")
    parser.add_argument("--session-name")
    parser.add_argument("--session-id")
    parser.add_argument("--reason")
    parser.add_argument("--error")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--debug", action="store_true")
    args, _unknown = parser.parse_known_args(argv)
    return args


def provider_label(provider):
    label = sanitize(provider, 40)
    if not label:
        return ""
    return label[:1].upper() + label[1:]


def session_fragment(args):
    session = sanitize(args.session_name or args.session_id, 80)
    return f" Session: {session}." if session else ""


def provider_event(args):
    provider = provider_label(args.provider)
    if not provider:
        return None

    if args.event == "stop":
        title = f"HolyClaude — {provider} Task Complete"
        body = f"{provider} chat finished."
        reason = sanitize(args.reason, 120) if args.reason is not None else ""
        if reason:
            body += session_fragment(args) + f" Reason: {reason}."
        else:
            body += session_fragment(args)
        return title, body, "info"

    if args.event == "error":
        title = f"HolyClaude — {provider} Task Failed"
        body = f"{provider} chat failed."
        error = sanitize(args.error, 180) if args.error is not None else ""
        if error:
            body += session_fragment(args) + f" Error: {error}."
        else:
            body += session_fragment(args)
        return title, body, "warning"

    return None


def normalize_notify_url(url):
    text = url.strip()
    if LEGACY_TELEGRAM_RE.match(text):
        text = LEGACY_TELEGRAM_RE.sub("tgram://", text, count=1)

    try:
        parsed = urlsplit(text)
    except ValueError:
        return text
    if parsed.scheme.lower() not in EMAIL_SCHEMES or not parsed.query:
        return text

    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    if not any(key == "pgpkey" for key, _value in pairs):
        return text

    has_canonical = any(key == "pgppub" for key, _value in pairs)
    query = urlencode([
        (("pgppub" if key == "pgpkey" else key), value)
        for key, value in pairs
        if not (has_canonical and key == "pgpkey")
    ])
    return urlunsplit(parsed._replace(query=query))


def collect_notify_urls(environ):
    urls = []
    for key, value in environ.items():
        if not key.startswith("NOTIFY_"):
            continue
        if not value or not value.strip():
            continue
        if key == "NOTIFY_URLS":
            urls.extend(
                normalize_notify_url(url)
                for url in value.split(",")
                if url.strip()
            )
        else:
            urls.append(normalize_notify_url(value))
    return urls


def scheme_label(url):
    match = SCHEME_RE.match(url)
    return match.group(1).lower() if match else "unknown"


def validate_notify_urls(urls):
    try:
        import apprise
    except Exception as exc:
        return [(url, False, f"apprise import failed: {type(exc).__name__}") for url in urls]

    results = []
    for url in urls:
        try:
            ap = apprise.Apprise()
            accepted = bool(ap.add(normalize_notify_url(url)))
            results.append((url, accepted, "accepted" if accepted else "rejected"))
        except Exception as exc:
            results.append((url, False, type(exc).__name__))
    return results


def write_debug(stream, flag_enabled, urls, results):
    print(f"[notify] flag: {'present' if flag_enabled else 'missing'}", file=stream)
    print(f"[notify] urls: {len(urls)}", file=stream)
    for url, accepted, reason in results:
        status = "ok" if accepted else "failed"
        print(f"[notify] {scheme_label(url)}: {status} ({reason})", file=stream)


def run_dry_run(flag_file, environ, debug=False, stream=sys.stderr):
    flag_enabled = os.path.isfile(flag_file)
    urls = collect_notify_urls(environ)
    results = validate_notify_urls(urls)
    ok = flag_enabled and bool(urls) and all(accepted for _url, accepted, _reason in results)
    if debug:
        write_debug(stream, flag_enabled, urls, results)
    return 0 if ok else 1


def send_notifications(urls, title, body, notify_type):
    import apprise

    ap = apprise.Apprise()
    for url in urls:
        ap.add(normalize_notify_url(url))
    ap.notify(title=title, body=body, notify_type=notify_type)


def main():
    args = parse_args(sys.argv[1:])

    # Check if notifications are enabled
    if args.dry_run:
        sys.exit(run_dry_run(FLAG_FILE, os.environ, args.debug))

    if not os.path.isfile(FLAG_FILE):
        sys.exit(0)

    # Collect all NOTIFY_* env vars
    urls = collect_notify_urls(os.environ)
    if not urls:
        sys.exit(0)

    # Event mapping
    event = sanitize(args.event, 80)
    events = {
        "stop": ("HolyClaude — Task Complete", "Claude has finished the current task.", "info"),
        "error": ("HolyClaude — Something Went Wrong", "A tool use failure occurred. Check the session for details.", "warning"),
        "test": ("HolyClaude — Test Notification", "HolyClaude notification test.", "info"),
    }
    provider_details = provider_event(args)
    title, body, notify_type = provider_details or events.get(event, (
        "HolyClaude — Notification",
        f"Event: {event}",
        "info",
    ))

    # Send via Apprise — all failures silently ignored
    try:
        send_notifications(urls, title, body, notify_type)
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
