# Pi Notification Extension

A small two-part project that turns Pi task completion events into a fullscreen browser overlay.

## Structure

- `extension/` — Plasmo + React + TypeScript Chrome extension
- `relay/` — local Node.js relay server that receives Pi completion events and pushes them to the extension

## What it does

When a Pi agent run completes:

1. Pi shows the native desktop/terminal notification.
2. Pi also POSTs the completion payload to the local relay.
3. The relay broadcasts that event over WebSocket.
4. The Chrome extension stores the active notification and shows a fullscreen overlay in normal browser tabs.
5. Closing the overlay in one tab clears it everywhere.

## Browser behavior

The overlay covers the full page viewport inside normal tabs (`http://` / `https://`).
It cannot cover restricted browser pages such as `chrome://*` or the Chrome Web Store.

## Setup

### 1) Install dependencies

```bash
cd /home/hosan/projects/pi-notification-extension
npm install
```

### 2) Start the relay

```bash
npm run dev:relay
```

Default relay URLs:

- HTTP: `http://127.0.0.1:48291`
- WebSocket: `ws://127.0.0.1:48291`

### 3) Build the extension

```bash
npm run build:extension
```

Then load the unpacked extension from:

```text
/home/hosan/projects/pi-notification-extension/extension/build/chrome-mv3-prod
```

You can also use Plasmo dev mode:

```bash
npm run dev:extension
```

## Extension releases

Releases are driven by tags so the built zip, GitHub release, package version, and changelog all point at the same source commit.

1. Run the **Prepare Extension Release** GitHub Action on the branch you want to release.
2. Enter `patch`, `minor`, `major`, or an exact `x.y.z` version.
3. Add release notes. The action writes them to `CHANGELOG.md`, bumps `extension/package.json`, commits the change, and creates an annotated `vX.Y.Z` tag.
4. The `vX.Y.Z` tag automatically starts the **Publish Extension** workflow.

The publish workflow installs dependencies with pnpm, builds the Plasmo extension, packages `extension/build/chrome-mv3-prod.zip`, uploads it as a workflow artifact, and creates or updates a GitHub release with the changelog notes.

To also publish to browser extension stores, add a repository secret named `BPP_KEYS` containing the Plasmo Browser Platform Publisher JSON credentials. If `BPP_KEYS` is absent, the workflow still publishes the GitHub release zip and skips store publishing.

### 4) Reload Pi

Your Pi extension at:

```text
/home/hosan/.pi/agent/extensions/project-finish-notify.ts
```

now sends both:

- native notifications
- browser notification events to the relay

Run `/reload` inside Pi or restart Pi.

## Relay configuration

The Pi extension posts to this endpoint by default:

```text
http://127.0.0.1:48291/notify
```

You can override it with:

```bash
export PI_BROWSER_NOTIFICATION_RELAY_URL="http://127.0.0.1:48291/notify"
```

The relay port can also be changed with:

```bash
export PI_NOTIFICATION_RELAY_PORT=48291
```

## Payload shape

```json
{
  "id": "unique-id",
  "title": "Task complete",
  "projectName": "my-project",
  "projectPath": "/home/hosan/projects/my-project",
  "model": "anthropic/claude-sonnet-4-5",
  "timestamp": 1712345678901
}
```

## bash code for release
```base
pnpm release:extension:prepare -- --version patch --notes "Your release note here"
```

```bash
VERSION="$(node -p "require('./extension/package.json').version")"

git add extension/package.json CHANGELOG.md
git commit -m "chore: release extension v${VERSION}"

git tag -a "v${VERSION}" -m "Pi Notification Extension v${VERSION}"

git push origin HEAD
git push origin "v${VERSION}"
```