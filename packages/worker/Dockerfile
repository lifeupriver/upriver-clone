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
# Every workspace importer's package.json must be present or
# `pnpm install --frozen-lockfile` rejects the lockfile — the lockfile lists
# nine importers (see pnpm-lock.yaml `importers:`), so all nine are copied.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/admin-template/package.json packages/admin-template/
COPY packages/app-prototype-template/package.json packages/app-prototype-template/
COPY packages/audit-passes/package.json packages/audit-passes/
COPY packages/cli/package.json packages/cli/
COPY packages/core/package.json packages/core/
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/scaffold-template/package.json packages/scaffold-template/
COPY packages/schemas/package.json packages/schemas/
COPY packages/worker/package.json packages/worker/

RUN pnpm install --frozen-lockfile

# Now copy sources + build. Dashboard is intentionally skipped — the worker
# has no use for it and Astro's build pulls in extra browser tooling.
COPY packages/audit-passes packages/audit-passes
COPY packages/cli packages/cli
COPY packages/core packages/core
COPY packages/scaffold-template packages/scaffold-template
COPY packages/schemas packages/schemas
COPY packages/worker packages/worker
COPY tsconfig.base.json ./

RUN pnpm --filter @upriver/core --filter @upriver/schemas --filter @upriver/audit-passes --filter @upriver/scaffold-template --filter @upriver/cli --filter @upriver/worker run build

# Prune dev deps for the runtime stage. Keeps the final image lean.
# `pnpm deploy` accepts exactly one --filter; it automatically resolves and
# bundles the target's workspace dependencies (cli, core, audit-passes, etc.).
# `--legacy` opts out of pnpm v10's new injected-workspace-packages requirement
# (the workspace doesn't set inject-workspace-packages=true).
RUN pnpm --filter @upriver/worker --prod deploy /deploy/worker --legacy

# ---- runtime ---------------------------------------------------------------
# Playwright's official image already has Chromium + system libs preinstalled,
# which is the bulk of what the audit/clone stages need. Pin to the exact
# Playwright version used by the CLI.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy AS runtime

ENV NODE_ENV=production \
    PORT=8288 \
    # Node heap cap. fly.toml overrides this to 3072 to pair with its 4 GB VM
    # ([[vm]] memory) while leaving headroom for the CLI's child processes
    # (claude, Chromium, Lighthouse). This default only applies when the image
    # runs outside Fly. Never set it equal to the VM size — the heap would
    # starve the subprocess tree.
    NODE_OPTIONS="--max-old-space-size=3072" \
    # `pnpm deploy` places workspace deps under node_modules, not packages/ —
    # point run-stage's CLI resolution at the deployed location.
    UPRIVER_CLI_BIN=/app/node_modules/@upriver/cli/bin/run.js

# Install global CLIs the pipeline shells out to. Keep this list pinned and
# minimal — every binary added here grows the cold-start surface.
# Exact pins (no @latest): a worker rebuild must not silently change tool
# behavior. Bump deliberately — see "Pinned tool versions" in DEPLOY.md.
# claude-code: 2.1.175 verified working against this repo's pipeline 2026-06-12.
# squirrelscan: verified on npm 2026-04-29 (npm view squirrelscan → 0.0.38).
RUN npm install -g \
      @anthropic-ai/claude-code@2.1.175 \
      lighthouse@12 \
      squirrelscan@0.0.38 \
    && npm cache clean --force

# Runtime shell-outs beyond npm globals: CLI stages run `pnpm` (scaffold /
# clone / prototype installs), `gh` (repo provisioning), and `zip` (report
# bundles). The Playwright base ships none of them. gh comes from GitHub's
# apt repo — it is not in Ubuntu jammy's default repos.
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates zip \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
         -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
         > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bring in the pruned workspace deploy from the builder stage.
COPY --from=builder /deploy/worker .

# Fly's checks block hits this. Healthz is a tiny Express route already wired
# in serve.ts; nothing extra needed at the Docker layer.
EXPOSE 8288

# Run the worker's HTTP entrypoint. Inngest Cloud delivers function
# invocations to /api/inngest on this port.
# `pnpm deploy /deploy/worker` flattens the worker package's contents into the
# deploy root, so dist/serve.js lives at /app/dist/serve.js (not under
# packages/worker/). Mirrors the package.json "start" script.
CMD ["node", "dist/serve.js"]
