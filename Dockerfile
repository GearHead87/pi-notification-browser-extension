# ============================================
# Pi Notification Relay — Docker image
# ============================================
#
# Multi-stage Dockerfile that builds and ships ONLY the `relay` package out
# of the pnpm workspace. The browser extension is intentionally excluded.
#
# Runtime configuration is supplied via environment variables (see the
# `relay/.env.example` for the full list). At minimum you MUST set
# `PI_NOTIFICATION_RELAY_API_KEY` when running the container.
#
# IMPORTANT: Node.js Version Maintenance
# This Dockerfile pins Node.js 22-slim to stay in sync with the
# `actions/setup-node` version used by the extension publish workflow.
# Regularly bump the NODE_VERSION ARG to the latest LTS.
ARG NODE_VERSION=22-slim

# ============================================
# Stage 1: Base image with pnpm enabled
# ============================================
FROM node:${NODE_VERSION} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Match the `packageManager` field in the root package.json so workspace
# installs use the exact same pnpm version locally and in CI.
ARG PNPM_VERSION=10.33.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app


# ============================================
# Stage 2: Install workspace dependencies and build the relay
# ============================================
FROM base AS builder

# Copy only the files needed to resolve the workspace + relay dependency
# graph first, so this layer caches across source-only changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY relay/package.json ./relay/

# Install the relay's deps (including dev deps) with a frozen lockfile so
# builds are reproducible. The `--filter ./relay...` selector restricts the
# install to the relay package and any workspace deps it might gain later.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter ./relay...

# Now bring in the relay source and build it.
COPY relay ./relay

ENV NODE_ENV=production
RUN pnpm --filter ./relay build

# `pnpm deploy` produces a self-contained, production-only copy of the
# relay package (with hoisted node_modules) at /prod/relay. This is what
# we ship in the final stage — no workspace symlinks, no dev deps.
#
# `--legacy` is required from pnpm 10 onward when the deployed package
# does not opt in to injected workspace dependencies. The relay only
# depends on third-party packages today, so the legacy behaviour is
# both safe and what we want.
RUN pnpm --filter ./relay --legacy deploy --prod /prod/relay


# ============================================
# Stage 3: Minimal runtime image
# ============================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Sensible defaults. All of these can (and should) be overridden at
# runtime via `docker run -e ...` / compose / your orchestrator.
#
# `PI_NOTIFICATION_RELAY_API_KEY` is intentionally NOT set here — the
# relay refuses to start without one, which is the desired behaviour.
ENV NODE_ENV=production
ENV PI_NOTIFICATION_RELAY_HOST=0.0.0.0
ENV PI_NOTIFICATION_RELAY_PORT=48291

# Copy the deployed relay (dist + production node_modules + package.json).
COPY --from=builder --chown=node:node /prod/relay ./

# Drop privileges before running the server.
USER node

EXPOSE 48291

# `relay/package.json` compiles to `dist/index.js` (CommonJS). Invoke node
# directly so we don't need pnpm at runtime.
CMD ["node", "dist/index.js"]
