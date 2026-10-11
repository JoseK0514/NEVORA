# NEVORA New user account activation local review — 2026-10-10

New user account activation at `/activate` follows the approved Employee Login/Forgot access composition: cobalt/cyan folded-paper artwork, a stationary white native form, compact mobile artwork and focused assistance. The first Impeccable finish review found no material rendered UI repair and requested the missing activation guidelines and exported handoff. This documentation pass completes the repository guidance; the parent owns export refresh and the focused final reviewer verdict. The supplied local evidence does not certify production or independent QA/security closure.

## Scope and source of truth

This is an ordinary extension of `nevora-typeface-auth-blue-cyan`. Jose requested the New user page after approving Login and Forgot access, with original activation artwork, four-field hierarchy, mobile priority, password visibility, calm assistance and the official slogan **Brighter work ahead**. The approved login/recovery source and captures remain visual authority. Inter is explicitly pinned; JetBrains Mono remains the configured workspace identity role. No new PRODUCT.md, replacement world or separately approved comp is required by the [direction contract](../../../new-user-evidence/direction-contract.md).

The shared `login-*` scope is **Employee Login, Forgot access and New user account activation only**. The orange portal, Reset access and assisted-recovery presentation retain their existing system. Activation CSS is scoped to `.activation-page`. Existing Login/Forgot access guidance, palette values and the first ten sidecar component specimens are preserved. Four source-backed activation specimens are appended for password visibility, submit, native assistance and the sign-in return. The frontmatter adds scoped 12px hints, 13px expanded assistance copy and the derived 13px inset eye-control corner, with references to the shared type/color/control roles.

Changed application locations are `src/app/activate/page.tsx`, `activation.css`, `activation-passwords.tsx`, `activation-submit.tsx`, `activation-visual.tsx` and the optional `id`/`aria-describedby` props on `src/components/phone-input.tsx`. The original illustration and its manifest entry are added under `public/assets`. This documenter writes only `DESIGN.MD`, `.impeccable/design.json`, `public/assets/README.md`, this review and its external documentation receipt; no application, asset, manifest or test change is made in this pass.

## Recorded behavior

- Employee ID, Phone number, Create password and Confirm password are required, in that order, followed by Activate account. The workplace must have created an active employee record with the matching phone. This remains activation of an existing record; no signup, code-verification or additional onboarding step is introduced.
- The phone hint says “Use the number your workplace has on file.” The password hint says “At least 8 characters.” Username/tel/new-password autocomplete, native constraints and hint/error associations remain present.
- One optional Show passwords/Hide passwords control changes both fields, keeps `aria-pressed` and both `aria-controls` targets, and uses regular Phosphor Eye/EyeSlash icons. Its 44px target sits 4px inside the first 52px field; the 13px corner equals the enclosing 17px corner minus the inset. The first field reserves 64px at the right.
- `ActivationSubmit` uses `useFormStatus` to expose the polite live pending label “Activating account…”, disable resubmission and hide the arrow without shifting geometry. Only the submit is disabled while pending. Native activation remains usable without JavaScript; password visibility is an optional enhancement.
- Generic invalid/not-found alerts preserve privacy-safe wording and do not distinguish a missing account from an already activated one. The server still enforces the eight-character minimum and matching passwords, normalizes employee ID/phone and validates safe return destinations. Success returns to `/login?activated=1` with the existing login success feedback.
- Native details/summary assistance says “Need your employee details?” and explains the workplace employee-record precondition and manager/Owner help. “Already activated? Sign in” stays visible as a separate full-width return path with the validated return query. Both rows are at least 52px high and remain usable without JavaScript.
- The 1120px desktop shell and 18px bordered composition become a 480px-capped stack below 800px, with a minimum 132px artwork strip that may grow with its content. Fields/action keep 52px height and 17px corners. Four fields increase natural height; compact viewports scroll to the assistance and legal footer without constraining the page to one screen.

The activation action, employee-data transaction, phone normalization, shared login/recovery CSS and shared motion controller are byte-identical to predecessor `f5569e7edb3e0d7802432611858d531a5c8d52fe`, as recorded in the [verification summary](../../../new-user-evidence/verification-summary.json). The existing data transaction locks the employee record before the credential insert and rejects a second activation. `PhoneInput` only gains optional label/hint linkage; its formatting/normalization behavior stays intact. The owned app test exercises the native server action, a single credential row and duplicate rejection using fictional local data.

## Artwork and motion

The decorative original `public/assets/illustrations/activation-welcome-blue.png` is a transparent 1536×1024 still life: cobalt folded-paper doorway, cyan sunrise, blank ivory employee badge and blank open notebook. It supports a welcoming first workday without implying completed activation. Empty alt text, reserved dimensions and responsive contain sizing keep the artwork secondary. Its exact generation prompt matches the embedded PNG metadata and [asset manifest](../../public/assets/manifest.json). SHA-256: `26f962ecad03d759962291c68c6b6744ca61af4a9bb8c51d437f8be283baf813`. The official lockup, wordmark and PWA icons remain unchanged.

`ActivationVisual` reuses the unchanged GSAP controller for the entrance/float, 44px Pause/Play, static reduced-motion rendering, offscreen/document visibility gates and fine-pointer drift. The form and fields remain immediate and outside the timeline. The native assistance caret's 0.18-second rotation becomes static under reduced motion. The supplied Chromium/WebKit app checks verify Pause, reduced motion and offscreen behavior. The source contains the document-hidden gate, but a physical tab switch is not certified by headless evidence.

## References and local gallery

The [read-only local review](http://127.0.0.1:52202/new-user/review.html) presents four rendered 21st options alongside the activation candidate; submissions are disabled in the export. The gallery supports review of composition and control hierarchy. It does not run the employee activation workflow. Actual native activation evidence comes from the ownership-marked scratch Next/PostgreSQL runtime.

| Reference | Applied role |
| --- | --- |
| [Calendly account setup](https://mobbin.com/screens/932bbfc5-82c8-4800-964a-5055a36d9967) | Setup hierarchy and one focused primary action. |
| [Basecamp account setup](https://mobbin.com/screens/f1f8c0f0-3cf3-448f-8e45-dd9b105220e2) | Focused password-setup action. |
| [Canny account setup](https://mobbin.com/screens/22a43d52-5a48-4907-9ca5-708696043f22) | Focused setup form reference. |
| [21st Auth Form](https://21st.dev/@educalvolpz/components/auth-form) | Gallery option 1: presentation/state reference; NEVORA keeps its stationary native action. |
| [21st Sign Up Form by diarmuradi](https://21st.dev/@diarmuradi/components/sign-up-2) | Gallery option 2: password visibility reference. |
| [21st Sign Up Form by cnippet-dev](https://21st.dev/@cnippet-dev/components/v-form-9) | Gallery option 3: password/confirmation and pending-action hierarchy. |
| [21st Sign up Form by axelwesselgren](https://21st.dev/@axelwesselgren/components/sign-up-form) | Gallery option 4: alternative form presentation. |

The retrieved [Mobbin record](../../../../../outputs/nevora-typeface/new-user/mobbin.json) and [21st catalog](../../../../../outputs/nevora-typeface/new-user/catalog.json) preserve the reference identities. These are visual references; no paid component code is imported and their social/signup/verification workflows do not define NEVORA's employee activation contract.

## Evidence and limits

| Check | Recorded result |
| --- | --- |
| [Actual application browser report](../../../new-user-evidence/after/report.json) | 32 checks, 0 errors. Chromium/WebKit at 320, 375, 390, 430, 768, 800, 1024 and 1440px; keyboard/help/show-hide, native required/minimum-length, password mismatch/safe return, wrong-phone privacy, native pending/success and duplicate rejection, no-JavaScript native activation, Pause/reduced-motion/offscreen, compact height and existing login paths. |
| [Standalone preview verification](../../../../../outputs/nevora-typeface/new-user/preview-verification.json) | 6 checks, 0 errors. Chromium/WebKit at 320, 390 and 1440px. |
| [Verification summary](../../../new-user-evidence/verification-summary.json) | 22 targeted tests passed; lint, typecheck and build exit code 0. The documenter inspected these supplied results and did not rerun application checks. |
| [Full application suite](../../../new-user-evidence/full-suite.log) | 203 files and 2129 tests passed. |
| Browser/source consistency | All 656 recorded hashes matched before documentation. After the bounded write, 655 remain identical; the one changed hash is the authorized `public/assets/README.md`, whose preserved original matches the report. No application/source drift is introduced. |
| [Initial Impeccable finish review](../../../new-user-evidence/finish-review.md) | Fix disposition solely for stale DESIGN.MD scope and absent exported handoff; all 14 required named captures inspected, with no material rendered UI finding. Parent refreshes the export and obtains the focused final verdict. |
| [Targeted detector record](../../../new-user-evidence/design-detect.json) | 0 primary findings. Activation advisories concern the source-backed 13px inset radius and help copy now documented. Outer-gallery 28px/24px/13px type is review UI, outside the application system. |
| [Documentation receipt](../../../new-user-evidence/documentation-review.json) | Incumbent-token/prose and first-ten-specimen preservation, valid JSON/frontmatter references, source hashes, provenance and local handoff links checked in this pass. |

Only fictional employee data is used in an owned scratch Next application and PostgreSQL runtime; external requests are blocked and no real messages or customer data are used. Browser viewport emulation does not certify physical devices, screen-reader behavior, hosted release or a physical hidden-tab runtime check. The new review's Inter exception is file-scoped to `outputs/nevora-typeface/new-user/review.html`, reflecting Jose's pinned font. No further detector suppression is introduced.

Eight inherited owner-payroll-export UI warnings remain open outside this scope. This review does not close independent QA or security findings. Pre-existing DESIGN.MD legacy headings and generic supplied-reference component keys remain as incumbent drift; the bounded activation extension does not repair them or turn unrelated findings into application rules.

## Handoff and release state

Branch: `codex/nevora-typeface-visual-refresh-20261010`. Predecessor local candidate: `f5569e7edb3e0d7802432611858d531a5c8d52fe`. The activation candidate is uncommitted at this documentation pass; the parent owns the later immutable commit/hash receipt. This pass creates no commit, remote push, PR, merge or deployment. Normal development-line and existing release gates still apply.

The parent must copy the updated DESIGN.MD and this review into the activation export as its linked `handoff.md`, then obtain the focused persistence verdict and record final local commit/hash state. Owner: Jose for visual review and any later production authorization. The required next user action is review of the local candidate when the parent has refreshed its handoff and final receipt; no new policy exception or production approval is requested by this documentation extension.
