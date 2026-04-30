# syntax=docker/dockerfile:1.7
#
# Worker container for the upriver pipeline. Hosts the Inngest serve handler
# and runs the upriver CLI inside the same process — pulling client artifacts
# from Supabase Storage, executing the requested pipeline stage, and pushing
# results back. Built and pushed to GHCR by .github/workflows/worker-image.yml.
#
# Stages:
#   builder — install workspace deps, compile every TS package.
#   runtime — Playwright base (already has Chromium + system libs), copy built
#             output, install global CLIs (claude, lighthouse, squirrelscan).

# ---- builder ---------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME=/usr/local/pnpm \
    PATH=/usr/local/pnpm:$PATH \
    CI=true

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

WORKDIR /repo

# Bring lockfile + workspace manifest first for cache-friendly installs.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/audit-passes/package.json packages/audit-passes/
COPY packages/cli/package.json packages/cli/
COPY packages/core/package.json packages/core/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/scaffold-template/package.json packages/scaffold-template/
COPY packages/worker/package.json packages/worker/

RUN pnpm install --frozen-lockfile

# Now copy sources + build. Dashboard is intentionally skipped — the worker
# has no use for it and Astro's build pulls in extra browser tooling.
COPY packages/audit-passes packages/audit-passes
COPY packages/cli packages/cli
COPY packages/core packages/core
COPY packages/scaffold-template packages/scaffold-template
COPY packages/worker packages/worker
COPY tsconfig.base.json ./

RUN pnpm --filter @upriver/core --filter @upriver/audit-passes --filter @upriver/scaffold-template --filter @upriver/cli --filter @upriver/worker run build

# Prune dev deps for the runtime stage. Keeps the final image lean.
RUN pnpm --filter @upriver/worker --filter @upriver/cli --filter @upriver/core --filter @upriver/audit-passes --filter @upriver/scaffold-template --prod deploy /deploy/worker

# ---- runtime ---------------------------------------------------------------
# Playwright's official image already has Chromium + system libs preinstalled,
# which is the bulk of what the audit/clone stages need. Pin to the exact
# Playwright version used by the CLI.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS runtime

ENV NODE_ENV=production \
    PORT=8288 \
    # Inngest sends step state through the serve handler — keep the body cap
    # generous so large pipeline outputs round-trip cleanly.
    NODE_OPTIONS="--max-old-space-size=2048"

# Install global CLIs the pipeline shells out to. Keep this list pinned and
# minimal — every binary added here grows the cold-start surface.
RUN npm install -g \
      @anthropic-ai/claude-code@latest \
      lighthouse@12 \
      squirrelscan@latest \
    && npm cache clean --force

WORKDIR /app

# Bring in the pruned workspace deploy from the builder stage.
COPY --from=builder /deploy/worker .

# Fly's checks block hits this. Healthz is a tiny Express route already wired
# in serve.ts; nothing extra needed at the Docker layer.
EXPOSE 8288

# Run the worker's HTTP entrypoint. Inngest Cloud delivers function
# invocations to /api/inngest on this port.
CMD ["node", "packages/worker/dist/serve.js"]
