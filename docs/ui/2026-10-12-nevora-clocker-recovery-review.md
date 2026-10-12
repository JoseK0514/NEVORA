# NEVORA Clocker action recovery review

Implemented locally at `/app/clocker-recovery` on `codex/nevora-clocker-recovery-20261012`, based on the observed single-company development checkpoint `8950786`. The original repository and concurrent redesign checkouts were preserved. An isolated bare clone and linked worktree hold this candidate.

## Result

The manager/Owner can enter a saved action reference, check the existing protected receipt endpoint, review the employee/action/time/tablet/location, and guide the employee back to the same registered tablet. Timecards and the existing correction workflow remain available. Receipt checking does not commit, replay, cancel, or delete a punch.

The page uses a focused desktop workspace and a deliberate mobile stack. The reference form and receipt evidence lead; supporting instructions and the native plus/minus disclosure follow. Labels distinguish a recorded action, an unconfirmed action, unavailable review, expired observation, and ended access. Offline submission now gives explicit feedback. Without JavaScript the form is disabled with guidance while navigation, timecards and disclosure remain available.

## Source and approved design

The requested DESIGN.MD was found through **Find redesigned NEVORA pages** at:
`/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`.

Its portal rules take precedence over incompatible marketing defaults in gpt-taste: pinned local Inter, Phosphor icons, white/gray surfaces, orange `#ED724C`, darker orange `#9F3821` for small accents, charcoal labels, 18px surfaces, 17px controls, 44px minimum targets, and restrained motion. The blue/cyan variant is scoped to authentication; this manager surface follows the portal palette. The incumbent navigation structure and official brand assets are retained.

The stylesheet applies the recovered portal tokens only while this review page is mounted. Global CSS and other product pages were not changed. Existing canvas aliases defined in global CSS have inherited historical dependencies; this candidate keeps their relationship and scopes its own page variables. The entry animation uses existing pinned GSAP packages, has automatic cleanup, and respects reduced motion. No pinned scrolling or moving content interrupts the task.

## Changed files

- `src/components/clocker-recovery-review.tsx`: workflow presentation, reference normalization, focus feedback, fresh reference handling, offline feedback and short GSAP entrance.
- `src/components/clocker-recovery-review.module.css`: scoped design tokens, desktop/mobile layouts, control/focus/disclosure states.
- `src/components/clocker-recovery-review.test.tsx`: three actual-component/controller regressions.
- `src/app/app/clocker-recovery/page.tsx`: authorized page supplies the workspace's actual time zone.
- `public/fonts/clocker-review/`: existing locally bundled Inter variable font and SIL Open Font License.
- `package.json` and lockfile: the same pinned GSAP 3.15.0, @gsap/react 2.1.2 and Phosphor 2.1.10 already used by approved redesigns.
- This handoff.

## Reference research and component options

Inspected Mobbin previews:
- [Unify review panel](https://mobbin.com/screens/c15113e0-484d-4f30-b4fe-a33f1a7dbd4d): grouped details and restrained status.
- [LinkedIn mobile history](https://mobbin.com/screens/e3fba0c3-6d24-4c3e-93af-effaeed6bbea): readable rows and expandable information.
- [Insight Timer confirmation](https://mobbin.com/screens/38672287-5c7e-4e92-bc8b-c90bc3a53220): explicit action consequences. No destructive confirmation was imported because this review is read-only.

The `21st` MCP search_picker and search calls did not return results and were terminated after bounded waits. Its public catalog was used as the fallback, and the options were shown in chat:
- **Recommended:** [Accordion Space](https://21st.dev/%40shadcnspace/components/accordion-space), for concise supporting disclosure.
- [Accordion Two](https://21st.dev/%40shadcnspace/components/accordion-space/accordion-two), for deeper nested grouping if needed.
- [Agent Activity](https://preview.21st.dev/%40starc007/components/agent-activity), for status and next-step sequencing.

These informed the design; no paid component retrieval, external generation, registry install or imported workflow was used. Native HTML disclosure and the project's packages implement the result.

## Defect evidence

On the unchanged baseline, checking reference A, editing the field to B and dispatching a storage lifecycle event fetched and displayed A again. The input showed B while the receipt still showed A. The old onChange handler cleared only presentation and retained selected.current.

The fix retires the selected reference and pauses the controller before restarting without a selection. This cancels the in-flight read, removes private evidence and fences older responses. A new submission selects B explicitly. The strict regression test failed on the original baseline with two reads of A and passes on the candidate. Both browser engines also verify the fixed behavior.

## Checks actually run

| Check | Result |
|---|---|
| Recovery/punch PostgreSQL integration suite | 48 passed |
| Existing recovery delivery and Clocker runner tests | 9 passed |
| New component regressions | 3 passed |
| Browser QA | 53 passed; zero runtime errors |
| Typecheck | Passed |
| Whole-project ESLint | Passed, no warnings |
| Production build | Passed |
| Git diff whitespace check | Passed |
| Visual inspection | Actual desktop and mobile screenshots reviewed |

Browser widths: 320, 375, 390, 430, 768, 1024 and 1440px. Coverage includes initial/pending/recorded/unconfirmed/error/denied/expired/wrong-reference states, native UUID validation, uppercase normalization, timezone display, keyboard focus, native disclosure, 44px targets, 16px mobile inputs, overflow, offline submission, blur/pagehide/offline privacy clearing, late responses, reduced motion, manager/employee route access, and no JavaScript.

The initial runner failure was sandbox `EPERM` on local bind before fixture startup. The same tests passed with authorized loopback access. WebKit's default Tab skips buttons under the host's current macOS Keyboard Navigation setting; the strict same-button assertion passes using [Apple's documented Option-Tab shortcut](https://support.apple.com/en-gb/guide/safari/cpsh003/mac). A blank-page probe confirmed that behavior; no system preference or product tabindex was changed.

## Environment and practical limits

QA created an ownership-marked PostgreSQL cluster and fictional accounts on loopback. External requests and notification sending were disabled. The real Next.js runtime substituted only its scratch database adapter, as recorded in source-manifest.json. Browser receipt/fault/lifecycle cases used explicit response fixtures; the absent-receipt endpoint and role checks were real. The existing SQL suite exercised actual committed receipts, idempotency and authorization. Screenshots show fictional data; the small Next development indicator belongs to the local QA runtime.

The app and database were stopped after QA. No real email/SMS, order, customer record, remote push, PR, merge or deployment occurred. Physical devices, installed Safari releases and screen readers were not certified. The full repository unit suite was not run; focused suites and whole-project build/type/lint were run.

## Applicable leadership positions and next gate

Product/Experience: GO for the requested single-reference review; no queue or resolution policy was invented.
Engineering: bounded presentation change with existing server contracts and controller behavior retained.
Security/Policy: current roles, actor binding, bounded receipt authority and lifecycle clearing remain; stale evidence is now retired on edit.
Governance: local review evidence is complete; hosted release and independent certification are separate gates.
Program/Delivery: implementation and local verification complete. Next action is visual review and integration into the reviewed development successor, followed by its release checks and any deployment authorization.

Rollback: restore the bounded feature files and dependency additions from the recorded base. No schema/data rollback is needed.
