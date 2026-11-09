# Assisted account recovery redesign

Implemented locally on `codex/nevora-assisted-recovery-20261012`, from observed local single-company development checkpoint `8950786` (`Verify single-company employee persistence and role boundaries`). This isolated clone is separate from other active chats and from the older `origin/development` checkpoint. It is not a claim about the current GitHub head.

## Scope and source of truth

Route: `/app/account-recovery`, for Owner/Manager assisted recovery. This is distinct from employee Forgot access and Reset access. Existing Employee ID, verification record, independent-identity confirmation, current role/actor enforcement, proof issuance and reset destination remain available. Recovery SQL, HTTP endpoints, authentication/session logic and migration files are unchanged.

The approved reference was located through the **Find redesigned NEVORA pages** chat and its inventory at `/Users/josek0514/Documents/Codex/2026-10-11/d/outputs/nevora-page-inventory-evidence.json`. The controlling visual reference is the reviewed `DESIGN.MD` from `/Users/josek0514/Documents/Codex/2026-10-10/np/work/nevora-typeface/checkout`; a copy with this explicit extension is retained in the candidate root.

The explicit redesign permits page layout improvements. The reference's orange portal palette and Inter typography take precedence over gpt-taste's randomized marketing layouts and fonts. Mobbin contributes hierarchy, calm white surfaces and progressive disclosure. This operational page keeps the portal shell, modest spacing, native controls and restrained motion.

## Implementation

- `src/components/assisted-recovery.tsx`: dedicated presentation, verification form, supporting guidance, focused error/issued feedback, actual expiry, proof selection, private-transfer instructions and fresh verification when preparing another proof.
- `src/components/account-recovery.tsx`: dispatches assisted presentation through the existing controller. Request and reset field contracts remain available. Request generation, actor header, credential handling, timeout, response validation, expiry and lifetime cancellation remain unchanged.
- `src/app/app/account-recovery/assisted-recovery.css`: scoped orange portal tokens, locally bundled approved fonts, 18px card/17px control corners, 52px main action, mobile stacking, keyboard focus and reduced motion. The shell color override only applies while this page is present.
- `src/app/app/account-recovery/page.tsx`: retains `requireRoles(['OWNER','MANAGER'])`, current actor ID and route composition, with one stylesheet import.
- `src/components/assisted-recovery.test.tsx`: six presentation/contract tests.
- `package.json`/lock: exact existing reference versions, Phosphor 2.1.10 and GSAP 3.15.0. Locally reused dependency bytes were copied into the isolated checkout. The offline package metadata lookup was unavailable, so the two lock entries came from the reviewed reference lockfile; their integrity values are retained.
- `public/fonts/assisted-recovery`: approved Inter and JetBrains Mono font bytes, licenses and provenance. Inter SHA-256: `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`; JetBrains Mono SHA-256: `48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda`.

The proof remains available only in the active page, with the inherited blur, hidden-document, offline, pagehide, timeout and expiry clearing. Preparing another form clears the local receipt and requires fresh identity confirmation; only actual issuance retires prior proofs. The page never claims the employee has already reset their password. It explains session revocation and retained role/work records.

## References and component options

Mobbin research was performed before implementation, with returned previews visually inspected:

- [Cleo recovery fallback flow](https://mobbin.com/flows/bc1208c0-96b2-41e1-a644-3ced48777d9c): explicit registered-channel and alternative recovery actions.
- [Square identity verification](https://mobbin.com/screens/55fe70b0-78e9-445f-bd02-14c14ca832e7): focused fields and a reason for verification.
- [Airbuds restoration](https://mobbin.com/flows/3266706e-ec2d-4eaf-93f8-874610ab7534): compact recovery-method choices; its SMS workflow was not imported.

The named `21st` MCP server was attempted. Initialization failed with HTTP 429, `Rate limit exceeded: 1000 requests per hour`, so an MCP component search could not execute. Plugin discovery returned no alternative `21st` plugin. The following public component pages were verified as a fallback and shown to Jose:

- [Forgot Password Form](https://21st.dev/@cnippet-dev/components/v-form-11): form/confirmation hierarchy.
- [Nav List Card](https://21st.dev/@arihantcodes_1f7b8c4d/components/nav-list-card): icon and action grouping.

No component source was retrieved and no metered AI generation, paid subscription or premium scan was invoked. The reference workflows do not replace NEVORA's identity attestation or security controls.

## Evidence actually run

- Baseline: three focused auth suites, 25 tests passed.
- Final: four focused suites, 31 tests passed, including all six new presentation cases. Command: `npm test -- --maxWorkers=2 src/components/assisted-recovery.test.tsx src/app/api/auth/recovery/route.test.ts src/app/login/actions.test.ts src/lib/auth/recovery-delivery.test.ts`.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build`: exit 0, real Next production compilation and route generation.
- `git diff --check`: exit 0.
- Browser: **48 checks passed, zero recorded runtime errors**, Chromium and WebKit, with actual Next and an owned disposable loopback PostgreSQL database. Widths: 320, 375, 390, 430, 768, 1024, 1440. Checks cover overflow, heading wrapping, 44px action targets, bundled typography, keyboard navigation, checkbox/disclosure behavior, native required/minimum-length guards, real proof issuance with stored verification and actual expiry, receipt focus, proof selection, fresh verification, error/denial/pending states, mismatched-employee proof rejection, late-response cancellation, expiry, blur/offline/pagehide/hidden-document clearing, reduced motion, role access and no-JavaScript fallback.

Real issuance used fictional accounts and the unchanged API/SQL. Pending, failure, mismatched-employee and shortened-expiry scenarios used explicit browser response fixtures. No existing database, customer record, real email/SMS delivery or production credentials were used. Owned app/database resources were stopped after verification. Hidden-document behavior used a synthetic lifecycle event; this is not physical-device or hidden-tab certification.

The earlier browser run retained 48 passed scenarios but recorded five WebKit access-control messages when login dashboard polling was interrupted by immediate navigation. The final run waits for login network activity to settle before entering recovery, retains the strict zero-error assertion, and passes. The earlier diagnostics remain in `outputs/evidence/browser-navigation-errors.json` and `.log`; no application failure assertion was suppressed. A speculative lowercase-ID probe received an actual server `unavailable` response; the existing exact-ID contract was retained and the hint now explicitly says “exact ID.”

Initial environment checks found a Turbopack restriction on an external node_modules symlink. Copying the existing dependency bytes into the isolated checkout resolved it; the final build passed. The initial no-JavaScript assertion checked a zero-height inline `noscript` container; the final check targets its visible message and verifies both message text and disabled controls. The explanation now precedes the disabled form.

The design hook flagged a temporary Inter alias and a system monospace fallback. Both declarations were replaced with the two approved font families. The final hook scan has no deterministic findings; no ignores or suppressions were added.

Full application-wide database/concurrency suites, live SMTP delivery, hosted checks, physical iOS/Android devices and real screen readers were not rerun. This presentation change leaves all backend recovery controls untouched. Local browser evidence is not independent certification or production acceptance.

## Handoff and release state

Implementation/evidence owner: Codex. Product/Experience: focused assisted workflow, no new signup or verification service. Engineering: presentation separated from the existing controller. Security: existing role/actor checks, proof validation and lifetime gates retained. Governance: local evidence only, no policy exception or independent finding closure. Delivery: candidate is ready for visual review and later integration; production release remains a separate authorized action.

No push, pull request, merge or deployment was performed. The generated review, screenshots, patch, source archive and evidence are in this chat's `outputs/` directory. The HTML review displays actual application captures and links to reference options; it is not an interactive recovery backend. Rollback is reverting the isolated design commit. When integrating into a checkout that already has the Typeface fonts/dependencies or newer public recovery presentation, retain those existing assets and add only this assisted renderer, its scoped styles, route import and controller dispatch.
