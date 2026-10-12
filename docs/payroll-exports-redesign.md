# Payroll exports redesign

Implemented October 12, 2026 after Jose approved the researched direction. Route: `/app/payroll-export`.

## Source and scope

Branch: `codex/nevora-payroll-exports-20261012`.
Development base: `b58496b84b21690f7be22474f7570da2d81af6c3`.
Isolated checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-26/work/payroll`.

The approved DESIGN.MD was located through **Find redesigned NEVORA pages**, at `/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`. SHA-256: `efb980c5bf4f1f716fd261288e417c8c4449f4af3c718bad5316449fce980837`. That retained checkout was read only. The development base lacks its global theme, so approved tokens are scoped to the payroll route with `body:has(.payroll-page)` and a CSS module; they stop applying after navigation away.

The redesign uses the orange portal palette, licensed local Inter and JetBrains Mono, Phosphor icons, white surfaces, 18px cards, 17px controls, and a small GSAP icon entrance with reduced-motion support. Existing navigation remains available.

## Workflow and preserved functionality

1. Choose 1–31 days and view finalized time. Edited dates are distinguished from the loaded period; generation requires loaded dates.
2. Select finalized employees individually or select up to 100 finalized employees. Other states stay visible and unavailable. Selected totals use integer nanoseconds before the existing hours/minutes formatting. Recorded elapsed time explicitly includes breaks.
3. Review the mapping and generate files. An uncertain outcome retains the same operation for retry. Verified replies expose mapped CSV and canonical JSON, the stored mapping name/revision, receipt and hash. Selection changes and mapping saves clear the previous displayed result.
4. Expand mapping when needed. All original fields remain: name, product/edition, layout, requirements, date format, precision, ordered columns, fixed values, add/remove controls, provider identifiers, review confirmation and profile save.

Desktop shows employees beside the export summary. Mobile stacks period, employees, summary, files and mapping. Controls have explicit labels and 44px minimum targets, with 16px mobile inputs. Native select appearance is normalized because WebKit initially rendered shorter controls.

Manager/Owner page authorization, actor headers, timecard parsing, revisions/fingerprints, mapping revisions, command IDs, same-command retries, reply verification, generation fencing, and offline/visibility/access clearing use the existing handlers. API, SQL, export model and service files were not changed. Existing development code is the source of truth; other chats' unreleased lifecycle work was not imported.

Dependencies match the approved baseline and are pinned: `@phosphor-icons/react@2.1.10`, `gsap@3.15.0`, `@gsap/react@2.1.2`. Both font directories include the SIL Open Font License.

## Verification

- Default Vitest suite: **202 files, 2,125 tests passed**. One initial sandbox subprocess failure was caused by denied local listeners; the isolated rerun and full listener-enabled rerun passed without changing tests or assertions.
- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: passed.
- Browser runner: **47 checks passed**, no page errors, in Chromium and WebKit. Overview geometry: 320, 390, 768, 1024, 1440px. Expanded mapping: 320, 390, 1440px. Files: 390, 1440px. Real save/export/download interactions ran on desktop Chromium and mobile WebKit.
- Real local login, fictional employees, API approval/finalization, profile saves and export generation used an owned Next application and disposable PostgreSQL. Only the scratch application's database transport was substituted. A completed export response was deliberately dropped; retry submitted the identical command and retrieved its verified receipt. Downloaded CSV and JSON preserved exact recorded/break values; the CSV matched the displayed SHA-256.
- Keyboard selection/focus, disclosure activation, period guard/validation, non-finalized rows, ADP controls, fixed values, custom column addition/removal, provider IDs, review gate, pending controls, conflict, loading, empty, error, offline recovery, reduced motion, 101 long employee names, the 100-selection cap and access-loss clearing were checked. Empty/error/conflict/access-loss and large-list states used explicit test-only route interception. Successful saves and exports used the real owned API.
- Owned resources were stopped and disposed. No production credentials, customer records, outbound messages or hosted deployment were used.

Local evidence does not establish physical-device, screen-reader or hosted Vercel/Neon acceptance. Full-page screenshots include the existing fixed mobile navigation at the first viewport's bottom.

`npm audit` reports five pre-existing high-severity development-tool advisories in `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. The base lockfile already contains those versions. Added design dependencies did not appear in the report. The suggested fix downgrades eslint-config-next across a major version and was not applied during this UI task.

## Resume and review

User-facing evidence: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-26/outputs`. Research/options: `payroll-exports-design-review.md`. Reports: `payroll-evidence/`. Patch: `payroll-exports.patch`.

Rerun the browser verification with existing PostgreSQL binaries and an evidence directory outside the repository. Leave DATABASE_URL unset; the runner creates its own loopback cluster and ownership-marked database:

```sh
NEVORA_TEST_PG_BIN=/path/to/postgresql/bin \
NEVORA_PAYROLL_EVIDENCE_DIR=/absolute/path/outside/repository \
node --import tsx scripts/payroll-exports-ui-qa.mjs
```

Playwright resolves from the project or existing bundled Codex runtime. `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE` can identify another installed runtime package. The branch has not been pushed, merged or deployed. Review/integration into development is the next release action.
