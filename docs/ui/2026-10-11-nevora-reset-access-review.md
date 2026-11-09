# NEVORA Reset Access / New Password

## Delivery

Reset Access now follows the approved NEVORA authentication composition: cobalt/cyan original artwork, Inter, white stationary form, Phosphor icons, workspace identity, official slogan and Velani ownership. Desktop retains the split layout; mobile uses the compact artwork strip and naturally scrolling form. Jose requested replacing the help chevron during review; the final indicator is a subtle Plus that becomes Minus when the native disclosure opens.

Implementation is local on `codex/nevora-reset-access-20261011`, isolated from central development successor `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`. Feature edits are uncommitted in this isolated checkout. No remote publication, merge or deployment occurred.

Preview: <http://127.0.0.1:3217/reset-access>. It uses an owned local server with database credentials removed. Workspace unavailable is the truthful configuration fallback, not a customer identity. Browser POST tests use fictional proofs/passwords and intercepted fixture responses; no real account password was changed or email sent.

## Changes

- `src/app/reset-access/page.tsx`: shared branded shell and configured public workspace identity.
- `src/app/reset-access/reset-visual.tsx`: page-specific artwork with the existing GSAP motion controller, explicit Pause/Play and reduced motion.
- `src/app/reset-access/reset.css`: reset-scoped form, feedback and disclosure styles.
- `src/components/recovery-reset.tsx`: clearer proof/password fields, shared visibility toggle, feedback focus, recovery help, confirmed-success sign-in action and explicit uncertain-outcome guidance.
- `src/components/account-recovery.tsx`: delegates reset presentation while retaining its request/lifecycle logic. The resulting assisted JSX is equivalent to its preceding branch.
- `src/components/account-recovery.test.tsx` and `src/app/reset-access/page.test.tsx`: constraints, truthful feedback, branding, missing configuration and workflow boundaries.
- `DESIGN.MD`, asset README and manifest: authorized scope extension and original-art provenance.

The required 43-character proof, minimum-eight/maximum-1024-character passwords, names and autocomplete remain. Fragment intake and clearing, duplicate-submit guard, 12-second abort, lifecycle cancellation, response generation fence, request headers/body and outcome messages are retained. The reset endpoint, recovery server, Login/Forgot access/Activation files and shared motion controller have zero diff against the base. No new authentication dependency or policy was introduced.

## Research and design choices

Mobbin web references inspected: [Klaviyo](https://mobbin.com/screens/b694cb3b-da48-4e6c-98b9-d41f59a57ea0), [H&M](https://mobbin.com/screens/f0df5b28-c857-44f5-90be-aef74af466a2), [Shopify](https://mobbin.com/screens/09702688-37c4-4737-af65-2f51d05d0d03). Mobile references inspected: [Blue Apron](https://mobbin.com/screens/a42fe4d8-596b-49f8-b3bb-809fd7d31ef1), [Public](https://mobbin.com/screens/bc15deb0-822d-48d7-8114-a2831db6e681). Borrowed focused field hierarchy, concise guidance and clear action placement. Their current-password, strength-meter and stricter minimum rules were not adopted.

21st MCP search and search_picker presented [New Password Form](https://21st.dev/@diarmuradi/components/new-password-2), [Reset Password Form](https://21st.dev/@lavikatiyar/components/reset-password-form) and [Reset Password Card](https://21st.dev/@diarmuradi/components/reset-password-icon-card). New Password Form was the best visibility-control reference. Metadata only: no paid component retrieval, imported authentication implementation or registry install.

gpt-taste and mobbin-design informed the refinement. The user's explicit NEVORA structure and DESIGN.MD override incompatible marketing templates and random fonts: retained the approved split, pinned Inter and existing artwork motion. No scroll pinning, carousel or marketing sections interrupt recovery. The seed and adaptation are recorded in the task's `work/reset-access-plan.md`.

## Verification

| Check | Actual result |
|---|---|
| Initial recovery baseline | 11 tests passed in two files |
| Final targeted recovery, public page and brand tests | 23 tests passed in four files |
| TypeScript | Passed |
| Changed-source ESLint | Passed, no warnings |
| Whole-project ESLint | Zero errors; one existing `react-hooks/exhaustive-deps` warning in `employee-weekly-confirmation.tsx:18`, confirmed present in the base |
| Optimized build | Passed; final-build receipt is in the task outputs |
| Broad suite | First concurrent run: 6733 passed, 801 skipped, 12 failures in process/migration timing checks. All four affected files rerun with one worker: 227 passed, unchanged assertions/timeouts |
| Actual candidate browser | 40 checks passed in Chromium and WebKit |
| Whitespace/diff | Passed |

Browser checks cover 320, 375, 390, 430, 768, 800, 1024 and 1440px widths; no horizontal overflow; 16px input text; targets at least 44px; loaded artwork and reserved dimensions; correct split/stack breakpoint; keyboard focus; shared show/hide; plus/minus and recovery link; native proof guard; mismatch without POST; invalid proof; malformed-response uncertainty; pending disabled controls; confirmed success and sign-in; a new hash proof after success with URL clearing; pagehide cancellation of late success; Pause; reduced motion; and visible no-JavaScript guidance with native help/link access.

WebKit uses Option-Tab for all-control navigation, consistent with [Apple's Safari keyboard guidance](https://support.apple.com/en-ie/guide/safari/cpsh003/27.0/mac/27). Initial harness corrections accounted for optimized image sizes, Next's separate route-announcer alert, async media state, text-selector exclusion of noscript and responsive image loading. None required changing production behavior or weakening product assertions. Intentional invalid-proof HTTP 400 console entries are retained in the browser report; no unexpected console or runtime errors remain.

## Evidence and limits

The task's `outputs/reset-access/browser-report.json` records all browser cases and screenshot paths. User-facing desktop/mobile captures are retained under `outputs/reset-access`; this review lives in repository `docs/ui`. The reproducible browser script is `work/reset-access-browser-qa.mjs` in the calling task directory. The local optimized preview passed its separate post-build check; `preview-report.json` records HTTP 200, no-store, no-referrer, desktop/mobile captures, the expanded Minus state and zero unexpected errors. The owned preview listens only on 127.0.0.1:3217 (Next process PID 42868 at delivery); stop only that owned preview when no longer needed.

This verifies presentation and existing client request/outcome behavior with fixture responses. It is not a production account-reset or tenant/database migration certification. Existing auth server files are unchanged. Physical hidden-tab behavior is inherited from the unchanged controller; this task does not independently certify it.

Next dev added its documented AGENTS.md guidance block; Impeccable generated a local hook cache. Those tool side effects are outside the bounded feature files. The pre-existing `.impeccable/design.json` remains its historical three-surface snapshot; the authorized Reset Access extension is specified in DESIGN.MD. No unrelated design-system resync was performed.

## Artwork provenance

Final file: `public/assets/illustrations/reset-access-blue.png`, generated using built-in imagegen on 2026-10-11. Transparent RGBA, 1536x1024, alpha range 0-254, 1,801,599 bytes. SHA-256 `1d185be707913b1d0549c338e211791b6a55141f4e424f95e7743f2f64ca40de`. Its full exact generation prompt is recorded in [the asset manifest](../../public/assets/manifest.json); the source PNG has no embedded text metadata. It is decorative and implies no verified recovery status.

## Resume

Apply only the bounded feature files to the current reviewed development successor; reconcile DESIGN.MD with newer auth work if present. Run the retained targeted tests and browser script against that integrated candidate before release. The local implementation needs no additional UI decision. Any central integration, remote PR or deployment is a separate step.
