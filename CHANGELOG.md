# Changelog

All notable changes to the browser extension are documented in this file.

## [Unreleased]

## [0.0.3] - 2026-05-21
- Add in-extension settings page (toolbar icon + options page) for relay URL and x-api-key, persisted in
- chrome.storage.local
- Stop reading PLASMO_PUBLIC_PI_NOTIFICATION_RELAY_API_KEY from .env — extension is now configured entirely through its
- own UI
- Add relay connection status indicator in the popup with gear icon and Settings button
- Add public GET /ping endpoint to the relay so the popup can distinguish offline relay vs invalid API key
- Rewrite the relay on Express 5 with a proper controllers/routes/middleware/services folder structure
- Add dotenv support to the relay with PI_NOTIFICATION_RELAY_API_KEY, PI_NOTIFICATION_RELAY_PORT, and
- PI_NOTIFICATION_RELAY_HOST
- Add graceful shutdown on SIGINT and SIGTERM to the relay
- Update README with a full Quick Start walkthrough, settings reference, and troubleshooting section


## [0.0.2] - 2026-05-21
- Add x-api-key authentication between the agent extension, relay, and browser extension
- Relay now requires PI_NOTIFICATION_RELAY_API_KEY and rejects requests missing or with an invalid x-api-key
- Browser extension authenticates the WebSocket via ?api_key= query and sends x-api-key on dismiss
- Agent extension loads .env next to project-finish-notify.ts and forwards x-api-key on notify


## [0.0.1] - 2026-05-21
- Initial Release

