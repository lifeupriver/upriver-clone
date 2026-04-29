Read `.planning/roadmap/HANDOFF.md` first — it has the full state of the previous session (18 commits across workstreams A, B, D, E, F, G, H, all local on `main`, not pushed). Then read `.planning/roadmap/PRODUCT-ROADMAP.md` for the source of truth on remaining work.

Pick up from the next 3 TODOs the handoff lists, in order:

1. **E.4 — one PR per track via `gh pr create`** in `packages/cli/src/improve/agent-runner.ts` and `commands/improve/index.ts`. Branches `improve/<id>` are already produced by E.3; add `--no-pr` (default false), push the branch, then call `gh pr create --base main --head improve/<id> --title "improve(<id>): ..." --body-file <clientDir>/improve/<id>-summary.md`. Generate the summary file as part of `runTrack`.
2. **D.3 — fidelity findings feed into fixes.** In `commands/clone-fidelity.ts`, when a page's `overall < 80`, emit a synthetic `AuditFinding` (id `clone-fidelity-<page-slug>`, priority `p1`, dimension `design`) and write to `clients/<slug>/clone-fidelity-findings.json`. In `commands/fixes/plan.ts`, read that file alongside `audit-package.json` findings.
3. **C.1 — GEO base pass.** New file `packages/audit-passes/src/geo/index.ts` exporting `runGeo(slug, clientDir): Promise<AuditPassResult>`. Heuristic checks: per-section TL;DR presence, `public/llms.txt` existence, structured factoids (year founded, service area, prices), entity disambiguation. Wire into `ALL_PASSES` in `commands/audit.ts:34-45`.

Operating mode is the same as last session:

1. **Context hygiene is the priority.** Use the Agent tool aggressively — spawn a `general-purpose` sub-agent for any unit of work that needs >3 file reads or >5 tool calls. Each gets fresh context; you only see the summary. Never read whole large files (use `Read` with offset/limit, or grep first). Never paste large file contents back into messages.
2. **Brief sub-agents like a smart colleague who just walked in.** Tell them the specific files, lines, and changes. Don't say "based on your findings, do X." You are the planner; sub-agents are executors.
3. **Atomic commits.** Each shippable slice = one commit, <300 lines. `pnpm -r run typecheck` must pass before each commit. Commit messages: `feat(workstream-letter): <slice-id> — one-line summary`, body references the roadmap section. Push nothing.
4. **Track work with TaskCreate / TaskUpdate.** Don't pre-create all tasks — create per-workstream as you go.
5. **Stop conditions** (write `.planning/roadmap/HANDOFF.md` and report when ANY hit):
   - typecheck broken >2 commits
   - same edit failed >3 times
   - missing dependency / external service blocking (Supabase, Vercel, an API key)
   - product decision required that a junior PM couldn't answer alone
   - >40 commits in this session
   - destructive action would be required
6. **Scope guardrails.** No new heavy deps without checking lighter options. Tests only for non-trivial new pure logic. Don't refactor unrelated code (leave `// TODO(roadmap): ...` comments). When a service doesn't exist (Supabase Storage, SMTP), build local-write/console-log fallback behind a flag that errors clearly when unconfigured.
7. **Subprocess security.** Use the `execFile` family with explicit arg arrays — never the shell-template variant. The repo has a pre-tool hook that flags shell-string usage.
8. **No user interaction.** Auto mode. Make reasonable choices, leave `// TODO(roadmap): revisit if X` comments, keep going. Only stop per rule 5.

Begin by reading the handoff, creating tasks for the next 3 TODOs, and starting on E.4. When you ship E.4, move to D.3, then C.1. After that, look at the "What's still pending" section of the handoff and continue in roadmap-priority order (rest of D → rest of E → rest of F → C base passes → C deep passes).
