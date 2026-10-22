# Owner AI manager implementation plan

**Goal:** Build the first executable increment of Jose's Owner-only senior operations advisor.
**Architecture:** Authorized database context and explicit saved priorities feed a bounded provider-independent investigation service. Neon AI Gateway is the preferred configured adapter, with optional direct OpenAI. The UI presents current evidence, conversation and connection state.
**Spec:** `docs/superpowers/specs/2026-10-22-owner-advisor-design.md`
**Tech stack:** Existing Next 16/React 19/TypeScript/PostgreSQL/Vitest and native fetch; no new dependencies.

## Global constraints

- Separate branch from development 0f8ffee5; no main/production merge, real messages, live model spending or production credentials.
- Owner authorization at every boundary; original authority rechecked after asynchronous model work.
- Default off; explicit provider/data/model/daily-cap configuration; no fake production model.
- Existing business rules own facts and calculations. All model output is untrusted text/proposals.
- Explicit saved priorities only; bounded private server-owned history and evidence; no automatic preference learning.
- No business writes/background autonomy in this increment. Document their subsequent delivery gates.

## Task 1: secure investigation backend

- [x] Own `src/lib/owner-advisor/**`, `src/app/api/owner/advisor/**`, `db/migrations/0036_owner_advisor.sql`, canonical migration classification/disposable literal and backend integration tests.
- [x] Define/export typed client contracts; preserve clean separation of provider, tools, persistence, HTTP and authorization.
- [x] Write and observe failing behavior tests, then implement feature/config gates, bounded Responses tool loop, real investigation tools, authority revalidation, owner-scoped persistence and atomic usage reservation.
- [x] Verify mocked provider scenarios and real disposable PostgreSQL cases; commit only owned files. Report exact commands and evidence.
- [x] Review task for spec and code quality; fix material findings before task 2. Approved at `22b5fdc2`; 23 focused and 19 owned PostgreSQL checks, TypeScript and lint passed.

## Task 2: Owner UI and discovery

- [x] Own page/components/CSS and minimal navigation/Home integration; consume Task 1 contracts without weakening server authority.
- [x] Implement briefing, conversation, saved priorities and clear pending/error/disconnected states with current design system. Default off, Owner only.
- [x] Verify rendering/interaction tests, keyboard, narrow widths, source links, state retirement and owned browser journeys. 55 focused tests and 18 final owned Chromium/WebKit groups passed at `f67ad18d` after red/green conflict regressions; local commits explicitly authorized.
- [x] Review task; fix material findings. Final lost-update finding closed after red/green regressions and exact-source browser proof; scoped review APPROVE/WATCH with no blockers.

## Task 3: whole-feature validation and handoff

- [x] Run appropriate focused regressions, typecheck, lint, optimized build, real SQL integration and owned browser checks. Final default suite 9343 passed/801 existing skips; full lint/type/build passed. Backend 19 real SQL checks map to unchanged backend bytes. Root personally used the fictional Owner demo.
- [x] Obtain fresh-context whole-branch code review; resolve material findings. Original review and superseding approval preserved in `docs/reviews/2026-10-22-owner-advisor-engineering.md`.
- [x] Finish handoff with completed functionality, activation settings, remaining autonomous-management roadmap, verification and production hold. Preserve the reviewable local branch; publishing/integration require the applicable authorization and are separate from local commit permission.

## Review focus

Revocation during a slow model call; stale authority on source links; request retry causing duplicate charges or turns; malicious notes/tool output; partial/truncated staffing and false completeness; owner/company isolation; explicit deployment activation; finite usage in horizontally scaled servers; truthful disconnected/UI states; cancellation preserving history and usage correctness.
