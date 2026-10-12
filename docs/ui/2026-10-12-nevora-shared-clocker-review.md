# Shared Clocker redesign

Implemented the user-approved tablet/kiosk direction for `/clocker/[location]`: NEVORA orange and white, a location/live-clock panel beside a focused PIN or time action, and a single-column mobile layout. The employee verifies their PIN, sees their actual clock state, chooses an action, and receives confirmation. Setup, break selection, clock-out confirmation, receipts, and recovery remain available.

## Source and scope

- Isolated checkout: `work/checkout` in the Codex task directory `using-the-structure-layout-and-animation-35`.
- Branch: `codex/nevora-shared-clocker-20261012`.
- Starting commit: `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`.
- Remote `development` verified during this task: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- The starting commit is one local single-company setup commit above that remote development commit. Clocker components, routes, and library code are identical between those two commits. This redesign's patch contains only this task's changes; it does not include the existing single-company setup commit.
- The original Fuel Scheduler checkout was preserved. No push, merge, production deployment, hosted database access, or real employee data was used.

The modern approved design source was recovered from the earlier NEVORA redesign work and the "Find redesigned NEVORA pages" chat. The principal source was `/Users/josek0514/Documents/Codex/2026-10-10/np/outputs/nevora-typeface/DESIGN.MD`, supported by its login/manager-home variants and the later reset-access `DESIGN.MD`. The orange portal palette applies to this kiosk; access-page blue variants do not define the kiosk palette.

## Design decisions

- Inter variable font bundled locally with its OFL license; no external font request. NEVORA's existing wordmark and brand footer are retained.
- Primary orange `#ED724C`, canvas `#FAFAFA`, white task surface, ink `#111827`, muted text `#5B616D`, and restrained neutral borders. Dark primary-button text satisfies the measured contrast check.
- Tablet and desktop use a split frame; mobile places location and time above the task. Compact spacing keeps the PIN action visible in the tested 390x844 and 1024x768 viewports. Long names wrap without clipping.
- PIN progress uses four masked dots over the existing native password input. PIN values remain outside React state. The keypad, Clear, Delete, physical keyboard, and native form submission are preserved.
- Large rounded action buttons use a coherent set of authored SVG icons. Icons supplement explicit action labels.
- GSAP state transitions move only 6px over 240ms, with cleanup on state changes. Reduced-motion users receive a static task. No scroll animation delays the kiosk workflow.
- Device status describes registration, rather than implying verified internet connectivity. Employee identity appears only in the task and clears through the existing privacy flow.

## Research and component options

The requested `gpt-taste` and `mobbin-design` skills were read and used. Mobbin research preceded implementation. The direction was approved in this chat before editing.

Mobbin references inspected:

| Reference | Useful pattern |
| --- | --- |
| [Jomo passcode](https://mobbin.com/screens/46153052-2d7f-41cc-801d-cd64e37378db) | Four masked positions, spacious keypad, calm hierarchy |
| [Klarna passcode](https://mobbin.com/screens/a0f17c45-6dc6-4714-aa28-18cbe1b80d45) | Clear instruction and focused numeric entry |

Timer references from Jomo and InsightTimer were also reviewed, but their meditation/overlay layouts were less relevant to a shared employee terminal.

The `21st` MCP server showed these options in its picker:

| Option | Decision |
| --- | --- |
| [clevision Input OTPs](https://21st.dev/@clevision/components/input-otps) | Considered for four-position entry presentation |
| [educalvolpz OTP Input](https://21st.dev/@educalvolpz/components/otp-input) | Considered for compact entry layout |
| [ddoemonn OTP Input](https://21st.dev/@ddoemonn/components/otp-input) | Masked progress and keyboard-feedback inspiration |
| [halaska-studio Input OTP](https://21st.dev/@halaska-studio/components/input-otp) | Alternative entry treatment |
| [shugar rounded Button](https://21st.dev/@shugar/components/button-1) | Rounded touch-control inspiration |
| [Origin UI Button](https://21st.dev/@originui/components/button) | Explicit label with directional icon inspiration |
| [Kokonut Particle Button](https://21st.dev/@kokonutd/components/particle-button) | Reviewed; decorative effects omitted from the kiosk workflow |

Only search metadata and visual patterns were used. No third-party OTP protocol or component source was imported. NEVORA's existing verification and punch logic remains authoritative. No paid component generation or deep research was used.

## Implementation

New reusable components provide the shell, scoped design tokens, icon set, and motion hook. Setup, PIN, and punch components adopt them without changing server routes, database schemas, authorization, or punch contracts. Two exact dependencies were added: `gsap@3.15.0` and `@gsap/react@2.1.2`.

Existing browser selectors were updated for the new sentence-case setup/PIN headings. The punch browser suite gained PIN masking, invalid PIN, keyboard submission, reduced-motion, local font loading, and viewport checks. Existing business assertions were retained. Screenshots wait for the state transition to finish and hide only the Next development toolbar; runtime and hydration errors are still collected.

## Verification

| Check actually run | Result |
| --- | --- |
| `npm run build` | Passed; 35 static routes generated |
| `npm run typecheck` | Passed |
| Scoped ESLint on changed React components and punch QA script | Passed |
| Six targeted Clocker test files | 124 tests passed |
| Final punch/PIN suite, Chromium and WebKit | 90 checks passed; no runtime or hydration errors |
| Device/setup suite, Chromium and WebKit | 62 checks passed; no recorded errors |
| Initial punch regression run | 70 checks passed |
| Final browser source manifest | All 638 captured file hashes match the final application source |
| `git diff --check` | Passed |
| `npm audit --omit=dev --json` | Zero reported runtime dependency advisories |

Browser coverage includes widths 320, 375, 390, 430, 768, 1024, and 1440; tablet portrait and landscape; keyboard/focus; invalid PIN; loading/unavailable views; successful enrollment and punches; all four clock/break transitions; canceled clock-out; duplicate clicks; lost responses; same-command retries; expired verification; stale tablets; cross-employee isolation; blocked recovery storage; stale/archived break types; long names; receipt auto-reset; and reduced motion. Primary-button text contrast was measured at at least 4.5:1, with a visible focus outline.

The setup suite ran before the final compact spacing adjustment. The final expanded punch/PIN suite used the final source. Its report records the pre-edit base commit and `sourceClean: false`; the manifest's individual hashes, rather than that base label, establish the tested application source. The only scratch-runtime substitution was `src/lib/db.ts` to use an owned local PostgreSQL transport. The original database file's hash also matched the source manifest. Test clusters were stopped after the runs.

The owned browser runners were invoked with `DATABASE_URL` unset, an existing local PostgreSQL bin directory, and the engineering-toolkit Playwright package. Use `node scripts/phase-c-clocker-postgres.mjs --punch-ui` for punch/PIN scenarios and `--ui` for setup/device scenarios. Set `NEVORA_TEST_PG_BIN`, `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE`, and a task-specific `PHASE_C_EVIDENCE_DIR`; do not point the runner at a hosted database.

## Retained failure and limits

An extended punch run executed concurrently with the setup suite stopped after 78 checks. WebKit timed out waiting for PIN entry to become usable after receipt auto-reset. The server log records `POST /api/clocker/2/pin 503` in 3.9 seconds. The UI blocked entry and showed recovery guidance. The failed report, log, and screenshot are retained under `outputs/failed-run`; the complete original runtime remains under `work/failed-browser-concurrent-run`. The cause of that local 503 was not established. The final isolated rerun passed all 90 checks without weakening assertions or changing server behavior.

The full dependency audit still reports five existing high-severity development-tooling advisories in the braces/micromatch/Next ESLint dependency chain. Those versions match the baseline; the added GSAP packages are not identified in those advisories. No unrelated dependency downgrade or audit auto-fix was applied.

This is local browser verification using synthetic fixtures, not physical-device, hosted, or production acceptance. The final deliverables include screenshots, reports, logs, this handoff, and a binary-capable patch. Integration onto the development line and deployment remain separate actions.
