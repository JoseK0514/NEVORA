# Native development synchronization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the approved native app with fetched development `e9c3a66da330959738100884f87cb76fd2af8296`, preserving both histories and concurrent work.

**Architecture:** Keep the direct WKWebView/Android WebView shells and their server contracts. Merge development's application changes. Relocate its separate debug-only Capacitor prototype to `native/capacitor-spike/`, preserving its source and CI checks without mixing two native build systems.

**Tech Stack:** Existing Next.js/React/TypeScript, Swift/UIKit/WebKit, Java/Android WebView; existing pinned toolchains.

**Spec:** `docs/superpowers/specs/2026-11-01-native-employee-owner-design.md`, especially source custody, application structure and staged delivery. Jose explicitly authorized this bounded code update on November 5. Execute locally; no further design choice is needed.

## Global constraints

- Preserve all existing worktrees, native history, signing custody and incoming development UI/business changes.
- Use the existing detached worktree. Create no branch; do not push, retire shared refs, change main, deploy, buy resources or send real notifications.
- Preserve Android 10/API29+ and WebView149+ admission, iOS16 deployment target, exact-origin/session/lifecycle controls and default-off native delivery.
- Source inventory must remain truthful. Classify current extra heads; keep the three-branch ceiling and report its existing six-head failure. Local preparation is permitted by the approved spec; no release gate is waived.
- Do not import the collaboration branch's three unmerged Owner Direction B commits or the unrelated database-rehearsal evidence.

## Review focus

- Prototype/production build collision: retain active native files byte-for-byte, move prototype files, verify both Android and iOS builds and the prototype policy checks.
- Native/web shell coexistence: preserve native device setup and development sidebar/root chrome; run shell/layout unit tests and the owned full-backend contract journeys.
- Session/role regressions: run native security/session tests and owned fictional Employee/Owner/Manager/Lead backend checks.
- Source drift: record exact parent SHAs, branch ancestry/dispositions and post-update gate output; preserve an explicit release blocker for the remote branch count.
- Credential/provider leakage: use clean test environments and owned local databases, retain push disabled, never read/export the signing password or production credentials.

### Task 1: Reconcile development, qualify the local update and hand it off

**Files:** development application changes; `native/capacitor-spike/**`; `.github/workflows/native-spike.yml`; `native/README.md`; `docs/handoffs/2026-10-21-development-assembly-sources.json`; current native status and evidence under `docs/native/evidence/2026-11-05/development-sync/`.

**Interfaces:** Consumes native checkpoint `1ea6e798c522ddcff96d6f315a9feb77d96b0500` and fetched development `e9c3a66d`. Produces a clean local merge containing both, preserved direct-shell contracts, isolated prototype/CI paths and verification receipts. It does not produce a hosted or store candidate.

- [ ] Record source inventory, overlap/conflict preview and baseline native unit results.
- [ ] Merge development without committing; preserve the direct-shell native tree and move the incoming prototype to `native/capacitor-spike/`. Update only its CI working/cache/artifact paths and repository-relative tool path; fix its README evidence link.
- [ ] Classify current heads from actual ancestry: included AI-owner and Employee branch, held collaboration UI and reference database rehearsal. Keep the branch ceiling at three.
- [ ] Verify retained native files, incoming application changes and relocated prototype bytes; inspect the automatic app-shell merge. Commit the resolved local update.
- [ ] Run full root unit suite, typecheck, relevant lint, native Python/Node/Swift checks, Android unit/lint/builds, unsigned iOS build and the owned Next.js/PostgreSQL contract matrix. Preserve any failing evidence and make the smallest justified fix; no assertion weakening.
- [ ] Obtain one fresh read-only whole-update review. Correct Important findings with regression evidence, record Minor findings, and update the handoff/status with exact checks and the still-open shared release gate.
- [ ] Confirm a clean detached checkout and final local commit; no push/deployment or Phase 3 completion claim.
