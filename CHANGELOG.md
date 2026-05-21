# Changelog

All notable changes to the browser extension are documented in this file.

## [Unreleased]

## [0.0.2] - 2026-05-21
- Add x-api-key authentication between the agent extension, relay, and browser extension
- Relay now requires PI_NOTIFICATION_RELAY_API_KEY and rejects requests missing or with an invalid x-api-key
- Browser extension authenticates the WebSocket via ?api_key= query and sends x-api-key on dismiss
- Agent extension loads .env next to project-finish-notify.ts and forwards x-api-key on notify


## [0.0.1] - 2026-05-21
- Initial Release

