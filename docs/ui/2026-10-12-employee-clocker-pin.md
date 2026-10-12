# Employee Clocker PIN setup and reset

Implemented locally on `codex/nevora-employee-clocker-pin-20261012`, based on the single-company development candidate `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`. Its history includes the recorded development checkpoint `0516b7dcbb07a10d926cc5c53f3b650343cad9bd`. This is a source-bound local candidate; no remote publication, merge, hosted validation or deployment occurred.

## Scope and implementation

The route remains `/app/employees/[employeeId]/clocker-pin`. Authorized management can create or reset an employee's four-digit shared-tablet PIN. The page has employee identity, two labeled masked inputs, one primary action, cancel/back navigation, reset consequences, and concise contextual guidance. Desktop uses a form-and-guidance composition; mobile stacks the content, with 44px minimum controls and compact form spacing. The existing application navigation and kiosk workflow remain intact.

Changed files: the route page, `clocker-pin-form.tsx`, its existing CSS module, a small authored SVG icon component, eight page tests, and a focused PIN integration-test configuration. The Inter font and its SIL license are bundled locally. The supplied DESIGN.MD is retained as the reference. No package dependency, schema, server action or PIN data-access implementation changed.

The form preserves its four fields (`employeeId`, `expectedVersion`, `pin`, `confirmPin`). PIN values stay out of React state, are removed from the DOM before submission, and are deleted from FormData after completion. Server-confirmed versions drive subsequent resets. Pending requests are locked; uncertain or stale saves block further writes until reload. Feedback receives keyboard focus and uses accessible status/alert announcements.

## Design evidence and decisions

Reference recovered through the local "Find redesigned NEVORA pages" evidence: `2026-10-10/np/outputs/nevora-typeface/DESIGN.MD`. Its orange `#ED724C`, dark orange `#D8613C`, charcoal `#111827`, neutral surfaces, Inter font, 18px panel radius and 17px control radius guide this scoped implementation. Success and danger use the existing semantic tokens. The current single-company base retains its established global blue navigation/official logo; page styling is isolated so integration can apply the approved global theme separately.

Mobbin research examined [Jomo passcode confirmation](https://mobbin.com/screens/41c266ec-f0fd-49d5-b3b9-31fcd5932c09), [Klarna code confirmation](https://mobbin.com/screens/fab85215-08e8-4e8c-bd30-bafee52b163a), [Starling passcode confirmation](https://mobbin.com/screens/e9f02dd7-8814-4018-8565-04c5aa5644d5), [Dropbox Dash password change](https://mobbin.com/screens/c0736ebc-4a50-42c3-9687-477175fa69ce), and [Customer.io security settings](https://mobbin.com/screens/0c87ec69-6ed3-42b9-8ef7-c4dff0802e6b). Adopted clear entry/confirmation, explicit next action, masked input, restrained hierarchy, and contextual recovery.

21st.dev's `21st` MCP search returned [OTP Pin Input](https://21st.dev/@ai2/components/inputs-otp), [Input OTP](https://21st.dev/@halaska-studio/components/input-otp), [OTP PIN Field](https://21st.dev/@sean0205/components/c-input-otp-5), and [shadcn Input OTP](https://21st.dev/@shadcn/components/input-otp). Options were shown to Jose. No paid retrieval or dependency installation was used. The existing native password inputs were adapted to preserve secret handling and server contracts.

The requested gpt-taste and mobbin-design skills were read. Marketing heroes, AIDA chapters, randomized component selection, marquees, testimonials, stock media, pinned scrolling and new GSAP dependencies were not introduced: the actual management purpose and DESIGN.MD's workforce-specific restrictions govern this page. Existing motion is retained, controls have restrained hover/press transitions, and reduced-motion content remains static.

## Verification

- 19 focused tests passed: 11 existing server-action tests and 8 new page tests.
- 60 existing PIN crypto, allocation/authorization/concurrency and transport integration tests passed on a new owned local PostgreSQL cluster; the cluster was stopped by the runner.
- 35 browser checks passed in Chromium and WebKit against the actual Next application, server actions and a separate fictional local PostgreSQL database. The scratch runtime substitutes only the database transport. The source manifest records the tested file hashes.
- Browser widths: 320, 375, 390, 430, 768, 1024 and 1440. Checked loaded Inter, no horizontal overflow, heading wrapping, 44px controls, keyboard input/submission and visible focus, setup/reset, leading zero, clearing secrets, server version updates, mismatch, incomplete input, duplicate PIN privacy, loading/double-submit lock, stale version/reload, cancel, long names, inactive targets, restricted Owner targets, ambiguous response recovery and unavailable storage.
- Lint, TypeScript and production build passed. `git diff --check` passed. Protected backend/package files have no diff.

Evidence directory: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-36/outputs`. `browser-report.json`, `source-manifest.json`, the build/lint/typecheck/focused/security logs and screenshots bind the claims above.

## Remaining findings and limits

No failures were observed on the PIN page. The final harness recorded two WebKit access-control errors from the unchanged Dashboard (`/app`) widgets after login: `/api/manager/action-center` and `/api/manager/clock-monitor`. They remain in the report. They were not changed or claimed resolved by this PIN redesign.

The manual Impeccable scan returned 38 generic warnings/advisories across the shared module: prescribed Inter, compact workforce font sizes, neutral tint/radius details, and pre-existing kiosk rules. The font alias hook finding was fixed by naming the face Inter. No ignore rules or detector suppressions were added. Compact typography and inherited kiosk geometry are intentionally retained under the explicit DESIGN.MD guidance; the raw scan remains in `design-check.json`. Its findings are explained design choices, not a clean scan claim.

Browser emulation is not physical-device or hosted verification. Product/Experience supports the focused operational form; Engineering preserves server/UI separation; Security retains role checks, origin checks, hashing, uniqueness and version enforcement; Governance permits local review with integration/release acceptance still separate. This chat owns implementation and evidence. No new policy exception or Jose decision is required to review the local result. The next release step is integration on the intended development candidate, with source-specific review and hosted checks before any production authorization.

Rollback: revert the PIN UI commit. No schema or data migration is involved.
