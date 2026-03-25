#!/usr/bin/env python3
"""HolyClaude — Apprise Notification Script
Usage: notify.py stop | notify.py error
Only sends if ~/.claude/notify-on flag file exists AND NOTIFY_* env vars are set.
"""

import os
import sys

def main():
    # Check if notifications are enabled
    flag_file = "/home/claude/.claude/notify-on"
    if not os.path.isfile(flag_file):
        sys.exit(0)

    # Collect all NOTIFY_* env vars
    urls = []
    for key, value in os.environ.items():
        if not key.startswith("NOTIFY_"):
            continue
        if not value or not value.strip():
            continue
        if key == "NOTIFY_URLS":
            # Catch-all: split on commas for multiple URLs
            urls.extend(u.strip() for u in value.split(",") if u.strip())
        else:
            urls.append(value.strip())

    if not urls:
        sys.exit(0)

    # Event mapping
    event = sys.argv[1] if len(sys.argv) > 1 else "unknown"
    events = {
        "stop": ("HolyClaude — Task Complete", "Claude has finished the current task.", "info"),
        "error": ("HolyClaude — Something Went Wrong", "A tool use failure occurred. Check the session for details.", "warning"),
    }
    title, body, notify_type = events.get(event, (
        "HolyClaude — Notification",
        f"Event: {event}",
        "info",
    ))

    # Send via Apprise — all failures silently ignored
    try:
        import apprise
        ap = apprise.Apprise()
        for url in urls:
            ap.add(url)
        ap.notify(title=title, body=body, notify_type=notify_type)
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
