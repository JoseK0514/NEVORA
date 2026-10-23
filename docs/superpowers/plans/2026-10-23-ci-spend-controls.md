# CI Spending Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Native execution is the smallest implementation for this bounded workflow change; one scoped review follows verification.

**Goal:** Stop draft updates from launching the complete release suite while preserving complete checks on ready candidates and development/main.

**Architecture:** A Node event policy exports the full-run decision from the preflight job. Existing heavy jobs depend on successful preflight; final acceptance keeps rejecting skipped or failed mandatory jobs. Same-ref superseded runs cancel automatically.

**Tech Stack:** Existing Node24, node:test, js-yaml and GitHub Actions.

**Spec:** docs/superpowers/specs/2026-10-23-ci-spend-controls-design.md

## Global Constraints

- Preserve all release test commands, assertions, exact-SHA custody, artifact checks, budgets, read-only permissions and deployment hold.
- Draft preflight is never release acceptance. Ready/manual/development/main runs require all mandatory jobs.
- Preserve other worktrees and active runs. No paid validation, inference or account billing change.
- Do not commit or publish before explicit authorization for this new CI increment.

## Review Focus

- Missing or nonboolean draft metadata must fail before publishing an output decision.
- Ready/converted events must trigger new checks even when no commit changes.
- Preflight failure must not launch expensive jobs or accidentally pass final acceptance.
- Failed/skipped/cancelled leaves must remain rejected by final aggregation.
- Manual dispatch and same-ref cancellation must not collide with other workflows/branches.

## Task1: event policy and execution wiring

**Files:** scripts/ci-cost-policy.mjs, scripts/ci-cost-policy.check.mjs, scripts/release-ci-contract.check.mjs, .github/workflows/ci.yml, scripts/phase-e-browser-evidence.mjs (existing validator test seam), AGENTS.md (draft-first operating instructions).

- [x] Add meaningful failing event/output/workflow tests and observe RED. Initial dependency-only baseline lacked js-yaml; locked local dependencies restored before implementation tests.
- [x] Implement ciMode(eventName,payload), full output writing, and cheap preflight. Gate existing heavy jobs on full output and successful preflight.
- [x] Add ready/converted/manual triggers and same-ref cancellation. Preserve a failed release verdict for draft-only preflight. Manual dispatch remains contingent on default-branch registration; main is unchanged.
- [x] Run policy/contract12 and release-engineering108 checks, ESLint, diff/actionlint. One scoped review found H1; root fixed it with observed actual-consumer RED/GREEN and final affected suite. No material finding remains knowingly unresolved.
- [x] Record evidence, reviewable diff and activation state in docs/handoffs/2026-10-23-ci-spend-controls.md. Jose subsequently authorized the verified commit and draft PR; publish and check cheap hosted behavior without launching full release verification on the draft.
