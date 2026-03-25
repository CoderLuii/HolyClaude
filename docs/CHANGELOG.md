# Changelog

All notable changes to HolyClaude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 03/25/2026

### Added
- Apprise notification engine with support for 100+ services (Discord, Telegram, Slack, Email, Gotify, and more)
- Individual `NOTIFY_*` environment variables for easy per-service configuration
- Catch-all `NOTIFY_URLS` for any Apprise-supported service

### Changed
- Notification backend replaced from Pushover to Apprise

### Removed
- **BREAKING:** `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` environment variables removed. Migrate to `NOTIFY_PUSHOVER=pover://user_key@app_token`. See [configuration docs](configuration.md#notifications-apprise) for details.

## [1.0.0] - 03/21/2026

Initial public release.
