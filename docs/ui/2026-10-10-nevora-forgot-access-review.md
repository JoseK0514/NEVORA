# NEVORA Forgot access local review — 2026-10-10

Forgot access now follows the approved Employee Login composition: clean cobalt/cyan artwork, a stationary white form, compact mobile presentation and focused assistance. The Impeccable finish review's disposition is **ship**, with no material rendered-surface fixes. This disposition supports the bounded local candidate; it is not production or independent QA certification.

## Scope and source of truth

This is an ordinary extension of `nevora-typeface-auth-blue-cyan`, with no replacement world, new PRODUCT.md or separately approved recovery comp. Jose approved the existing blue/cyan login and requested its established layout, motion and DESIGN.MD direction for recovery, with mobile usability and Apple-inspired restraint. The approved login desktop/mobile captures remain visual authority. The official slogan is exactly **Brighter work ahead**, sourced from `src/lib/brand.ts`.

The shared `login-*` tokens are now documented for **Employee Login and Forgot access only**. Existing orange portal guidance, login particulars, Reset access and assisted-recovery presentation remain intact. Recovery-specific CSS is scoped to `.recovery-page`; the shared login stylesheet and `src/app/login/login-motion.ts` controller are unchanged.

Changed application locations are `src/app/forgot-access/page.tsx`, `recovery.css`, `recovery-visual.tsx`, `src/components/recovery-request.tsx` and the request presentation delegation in `src/components/account-recovery.tsx`. `src/components/account-recovery.test.tsx` supplies presentation regression coverage. The documentation pass modifies only `DESIGN.MD`, `.impeccable/design.json`, `public/assets/README.md` and this new review, plus its external documentation-review receipt.

## Recorded behavior

- Employee ID and Registered recovery email lead to Request recovery. The registered-channel hint stays adjacent to the email field.
- Existing-proof and Back to sign in paths remain visible. Native expandable assistance explains manager/Owner identity verification without overwhelming the initial form.
- The shared desktop shell is capped at 1120px, with an 18px frame. Below 800px it becomes a 480px-capped stack with compact artwork. Fields/action retain 52px height and 17px corners; proof/help rows accommodate wrapped text.
- Pending disables controls, retains geometry and exposes a live status. Accepted/error feedback receive focus with status/alert semantics. Accepted copy reports Request received and the server's conditional message, without claiming email delivery or disclosing account existence.
- Before hydration or with JavaScript disabled, the request stays disabled. The no-JavaScript explanation and usable proof/return paths are explicit.
- The public page uses `force-dynamic` to keep workspace identity current. The request, state and lifecycle handler block remains byte-identical to the prior local login candidate; presentation is delegated to `RecoveryRequest`.

The decorative recovery image is `public/assets/illustrations/recovery-access-blue.png` (1536×1024), showing a folded-paper doorway, cyan sunrise, blank closed envelope and key. Empty alt text, reserved dimensions and responsive sizing keep it secondary. Its exact prompt, embedded metadata, original filename, hash and usage are recorded in [the asset manifest](../../public/assets/manifest.json). SHA-256: `4dd3d9001e2499b8c949710e8c9faf325f24aa795dddce373c3c7b62d00e8fcf`. It implies neither delivery nor recovered access. Official marks and PWA icons remain unchanged.

`RecoveryVisual` reuses the unchanged GSAP controller for restrained entrance/float, Pause/Play, static reduced-motion rendering, offscreen/document visibility gating and fine-pointer drift. Form controls stay immediate and stationary. The details caret transition becomes static under reduced motion. The 28 new recovery checks verify Pause and reduced motion; offscreen pausing is inherited evidence from the unchanged login controller and preceding login audit. They do not independently exercise offscreen or hidden-document pausing.

## References

| Reference | Applied role |
| --- | --- |
| [Tana](https://mobbin.com/screens/c48722e2-c544-4e69-9443-de1d23834980) | Short recovery request hierarchy and return path. |
| [Emergent](https://mobbin.com/screens/a7fa3adc-a436-49ee-b82e-733c3e622b9c) | Calm recovery presentation and focused assistance. |
| [ZARA](https://mobbin.com/screens/7cc092e3-8d52-4843-b98b-a278bd55cdf3) | Concise desktop recovery hierarchy. |
| [21st Forgot Password Form](https://21st.dev/@cnippet-dev/components/v-form-11) | Best-fit request/feedback hierarchy reference. |
| [21st Reset Password Card](https://21st.dev/@diarmuradi/components/reset-password-icon-card) | Best-fit compact request-card reference. |
| [21st New Password Form](https://21st.dev/@diarmuradi/components/new-password-2) | Later Reset access reference only. |
| [21st Reset Password Form](https://21st.dev/@lavikatiyar/components/reset-password-form) | Alternative with a different code-verification workflow; not imported. |

No paid component code was imported. The references do not replace NEVORA's registered-channel or recovery-proof contracts. Catalog results are preserved in `outputs/nevora-typeface/forgot-access/catalog.json`.

## Evidence and limits

| Check | Recorded result |
| --- | --- |
| [Actual application browser report](../../../forgot-access-evidence/after/report.json) | 28 checks, 0 errors. Chromium/WebKit at 320, 390, 430, 768, 800, 1024 and 1440px, plus keyboard/help/links, pending/accepted/error/network states, reduced motion/Pause, no JavaScript and existing login/reset checks. |
| [Export preview verification](../../../../../outputs/nevora-typeface/forgot-access/preview-verification.json) | 6 checks, 0 errors; Chromium/WebKit at 320, 390 and 1440px. |
| [Full application suite](../../../forgot-access-evidence/full-suite.log) | 203 files and 2129 tests passed. |
| Parent's targeted verification | 29 tests passed; lint, typecheck and build passed. This documenter pass inspected the supplied record and did not rerun application checks. |
| [Impeccable finish review](../../../forgot-access-evidence/finish-review.md) | Ship disposition, no material fixes; required recovery captures and incumbent login references reviewed. |
| Documenter source comparison | Request/state/lifecycle handler block byte-identical; shared motion controller unchanged. JSON/token references and incumbent-content preservation checked locally. |

Browser request/response states are explicit fixtures; external traffic is blocked in an owned scratch app/PostgreSQL environment. No real email or customer data was used. Route tests provide separate privacy-contract evidence. Physical devices, screen-reader behavior, the hidden-tab runtime gate and hosted-release certification are not claimed. The shared controller contains the document-visibility gate, but headless Chromium does not certify a physical tab switch.

Early harness attempts exposed locator, no-script promise and transient hover-assertion problems; the harness was corrected and final evidence passes. The Inter warning is ignored only for `outputs/nevora-typeface/forgot-access/review.html` because Jose's DESIGN.MD mandates Inter. There is no global detector suppression.

## Governance and handoff

The parent recorded Product/UX support for focused assistance; Engineering support for the presentation-only reversible local candidate; unchanged Security controls; and Governance **GO with conditions for local review only**. These positions are not independent production/QA certification. Existing production release gates remain. Eight inherited owner-payroll-export UI warnings stay open outside this scope and are not converted into visual rules or closed here.

Branch: `codex/nevora-typeface-visual-refresh-20261010`. Development base: `b58496b84b21690f7be22474f7570da2d81af6c3`. Predecessor local login commit: `0873c3cc760a1eaf1f817b9aadbe709f634293a4`. The recovery candidate is uncommitted at this documentation pass. The parent's final immutable receipt is expected at `outputs/nevora-typeface/forgot-access/candidate.json` and owns final commit/hash state. No push, PR or deployment occurred in this pass.

Owner: Jose for review and any later production authorization. Next gate: inspect the local candidate and final receipt, then use the existing release process if hosted delivery is requested. No new policy exception or production decision is requested by this extension.

Pre-existing DESIGN.MD contains legacy headings and generic supplied-reference component keys outside the current portable format. This bounded extension preserves them; it does not repair unrelated drift, fabricate a global recovery type role, or canonize the open owner UI warnings.
