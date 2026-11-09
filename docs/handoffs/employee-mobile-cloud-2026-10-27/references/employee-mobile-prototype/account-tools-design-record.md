# Support, legal and sign-out — design extension record

Date: 2026-10-26. Scope: Employee mobile prototype account tools, public support/legal reading and the local sample-session boundary.

This bounded documenter substitutes for the unavailable shipped Impeccable documenter, using `/Users/josek0514/.codex/skills/impeccable/reference/document.md` as comparison guidance. The incumbent visual system is already established. This record creates no new visual identity, token authority, creative metaphor or design approval ceremony. It is the only file written by this documenter; implementation, `DESIGN.md`, `PRODUCT.md`, `.21st/design.json` and `.impeccable/design.json` were read without editing.

Artifact: [index.html](index.html), directly recomputed SHA-256 `417ae7e35a37dd87620021b6a07b306284fac7a731ccd08b4819b514bdeff871`. The workspace is not a Git repository; this documentation work creates no branch, commit or deployment. Paths beginning `src/`, `data/`, `references/` or `evidence/` below resolve under `../../work/employee-mobile/`.

## System agreement

Support, legal readers and the signed-out receipt extend the approved clean teal Employee system. Your account retains its identity, preferences and read-only work details, followed by Help and legal and a secondary Sign out action. More's existing Get help entry reaches the same Support screen. Anonymous and ended sessions use the existing brand header and page vocabulary while withholding employee context and private navigation.

1. All 23 canonical Light color roles agree between `src/tokens.css`, the incumbent DESIGN color frontmatter, 21st colors and Impeccable color metadata. The Light token file is byte-identical to the captured account-tools baseline.
2. All 20 Dark overrides agree between `src/Appearance.css` and both metadata extensions. Appearance CSS is byte-identical to the baseline, remains scoped to the phone and retains the existing wordmark treatment. The review canvas stays separate.
3. System typography remains the existing page/section/title/body/supporting/caption hierarchy at 32/19/18/16/14/12px with a 16px browser default. The existing dialog title is 24px. Legal paragraphs use the existing body size with local 1.6 reading line-height; this introduces no font or global type token.
4. Existing spacing and shape remain: 4/8/12/16/20/24/32px steps, 28px section separation, 24px page inset (20px below 360px), 16px cards, 12px controls, 8px small details and 24px sheet corners. Primary and secondary Button use a 48px minimum; compact text/icon controls use 44px. New disclosure summaries have a 64px minimum.
5. Semantic state text, visible keyboard focus, native controls and sample-outcome language remain the established interaction rules. The extension adds no palette, shadow, decorative imagery or motion system.

Direct byte comparison with `evidence/account-tools-pass/before/` confirms that `tokens.css`, `Appearance.css`, `components.css`, `layout.css`, `Profile.css` and `main.tsx` are unchanged. Baseline sources live directly in `before/`, without a `src/` subfolder.

| Unchanged source | Current and baseline SHA-256 |
| --- | --- |
| `src/tokens.css` | `ec8ce48039735e3401b446dab7e2da823bff54bdfa5972136e8c09af1a830f1e` |
| `src/Appearance.css` | `4f8e971b4cf41b7683febeed6b3c1714ca53f19e484e3d450682af5d5019be63` |
| `src/components.css` | `3736353195bdfe41ec87f8887c3ed0332904e8930cbcb315af61def1ed2bec32` |
| `src/layout.css` | `ed187a75801c22644c768d50472104ded7eec887f037771f632c030943498d0f` |
| `src/Profile.css` | `ef63c1d4fe914fe962d8ca9c5c591e565839e489fbd170b71b7dac2170827ec7` |

## Primitive mapping

| Extension element | Existing primitive and observed application |
| --- | --- |
| Account Help and legal | `Section`, card/list and shared `Row`; existing body/supporting type, 22px Phosphor regular icons and 18px chevrons |
| Sign out entry and confirmation | Secondary `Button` plus the shared native `dialog` sheet, existing stack/button-row, protected keyboard traversal and Escape handling |
| Public page title and contextual Back | Shared `Heading` and existing text-button/back-icon pattern; exact account/More opener ids support focus return |
| Support contact | Existing card, secondary Button styling applied to a semantic `mailto:` anchor, supporting text and teal email address |
| FAQ and legal sections | Shared native `details`/`summary` Disclosure; existing surface/line/card vocabulary, caret-down icon, focus role and token spacing |
| Policy reading | Semantic paragraphs, lists, emphasis and route-whitelisted anchors; muted metadata, ordinary body text and wrapping long content |
| Missing/hidden/loading legal content | Existing `Empty` and secondary `Button` recovery; Support remains independently reachable |
| Signed-out and cleanup-pending receipt | Existing card/stack/receipt-icon vocabulary; textual status and local-preview explanation, explicit sample restart only when cleanup is not pending |

`src/AccountTools.css` contains 30 nonblank lines, consumes established color/spacing/radius roles and defines no literal color or new custom property. Its new selectors arrange semantic content, disclosures and the public-only grid. Native summary markers are replaced by the existing decorative Phosphor caret while preserving native disclosure semantics. Open-state caret rotation is a direct state indicator; no animation is added. The existing global reduced-motion treatment remains unchanged.

The sole `src/ui.tsx` change adds optional `id` passthrough to Row's existing button for exact opener restoration. Button, Heading, Section, Empty, card, row and dialog styling are retained. App/Profile/More/model integration supplies routes and local session state, without creating parallel controls. New modules remain bounded: AccountTools 13, PolicyReader 41, SignedOut 9, policy-model 22 and session-model 14 nonblank lines; there are no comment-only lines in those counts.

## Frozen content and behavioral boundary

`data/policies.json` contains four source documents: Privacy (12 sections), Terms (10), Support (5) and Account deletion information (5). An in-memory esbuild TypeScript transformation and VM evaluation independently compared the frozen source exports with the JSON snapshot: all four document structures, 32 ordered sections, 40 blocks, all 11 facts, operator, email and version match exactly.

The source record names read-only development commit `46e202786863279302026ee03a0e225c359fa55c`, file `src/lib/legal/policies.ts`. The frozen copy at `references/legal-source/policies.ts` directly hashes to `81412e1baa25b5a3a5271856f3efa3e5896c245a90db0847b51274423f3fc7a9`, matching the snapshot's provenance field. The JSON snapshot itself directly hashes to `4020ba1122f215fd255c47c8ac5918ff1285a16ddf13f9e99795162e157f53ca`; these are different files and different hashes. This documenter checked the frozen copy and provenance, without reopening or changing the real application checkout.

Legal readers preserve document content and order. Support rearranges existing source blocks into contact and FAQ tasks, with separately identifiable local-preview guidance and an active-session route to own Hours. Unsupported sign-in/recovery references render as words; only the four public policy routes and exact source email become links. The support address is a plain mailto draft target without private prefilled fields. No email client was opened or message sent by this documenter.

Sign out is a local prototype transition. It clears private sample work collections/drafts, closes modal state and advances an epoch guard so late callbacks cannot write into the ended or restarted sample. Public-only screens remove employee context and work controls. Cleanup-pending simulation remains public and reports uncertainty. Restart explicitly creates clean fictional state; it does not authenticate anyone.

The sole storage exception is `sessionStorage['nevora-employee-prototype:session-ended'] = '1'`, an anonymous ended-tab flag. It contains no identity, auth token, preference or work data and prevents refresh/direct protected links from reopening the sample until explicit restart. Storage failure keeps the current-document/URL boundary and exposes the limitation; durable authentication is not claimed. Preferences otherwise remain in memory. No real authentication, logout, device-registration change, message, legal acceptance, deletion request or account deletion was performed or integrated.

## Evidence read and directly checked

Read: `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.21st/design.json`, `.impeccable/design.json`, `package.json`, [account-tools-plan.md](account-tools-plan.md); the new modules, App/Profile/More/ui/model integration, shared tokens/layout/components/Profile/Appearance CSS and build composition; frozen policy TypeScript and complete JSON snapshot; account-tools capture, model, per-engine and review results; build/typecheck and regression logs; the final [independent UI review](account-tools-ui-review.md) and its fresh results/computed styles. The inspection contact sheet was viewed directly.

| Direct documenter invocation | Observable result |
| --- | --- |
| SHA-256 over saved HTML and frozen source files | HTML equals the artifact hash above; unchanged foundation files equal their baseline bytes; frozen policy hash equals the JSON provenance |
| CSS-property extraction against 21st and Impeccable JSON | All 23 Light roles and 20 Dark overrides agree; AccountTools CSS adds no literal color |
| Local Node/esbuild/VM comparison of frozen policy exports and JSON | Exact document, fact, operator, email and version equality; no network request or file emitted |
| Bundled Python/Pillow full-load metadata and SHA checks on every public raster | All 42 PNGs have matching `impeccable:prompt` origin and current HTML hash, and correct image SHA-256 in [asset-provenance.json](asset-provenance.json) |
| Bundled Python/Pillow dimension and decoded RGBA comparison | All 10 new canonical captures in `evidence/account-tools-pass/captures.json` equal their public output pixels at 390×819; metadata changes legitimately alter encoded PNG bytes |
| `view_image` of `evidence/account-tools-pass/inspection-contact-sheet.png` | Grouped account rows, contact card, long policy disclosure, Dark reading, native confirmation sheet and public session receipts visibly use the retained system |

The ten canonical new public images are [Account tools](account-help-legal.png), [Support](support.png), [Work guidance](support-work-guidance.png), [Privacy](privacy.png), [Privacy reading](privacy-reading.png), [Dark Terms](terms-dark.png), [Deletion information](deletion-information.png), [Sign-out confirmation](signout-confirmation.png), [Signed out](signed-out.png) and [Cleanup pending](signout-pending.png). Their manifest binds them to the exact current HTML hash. The 42-file provenance check establishes origin/hash metadata; the decoded source/output equality check applies specifically to these 10 new captures.

Read execution evidence reports 30 focused checks and 29 captured scenarios per Chromium, WebKit and Firefox, each tied to the artifact hash with no captured errors, external requests or failures. These cover 320/390/430px phone widths, review width, both themes, 200% text, native disclosure/dialog keyboard behavior, contextual focus return, content completeness, unavailable/hidden/loading recovery and sample-session fences. The model artifact reports 12 checks and matching current hashes for session-model, policy-model and model. Build-check reports byte-for-byte source/output agreement; typecheck has no diagnostic output; the three regression logs retain prior integrated checks. These executions were performed by the implementation/review work, not rerun by this documenter. This record claims its direct comparison checks above, not an independent full-suite or compiler run.

The earlier `evidence/account-tools-pass/review/results.json` contains 16 captures, 14 recorded checks and no errors at the same HTML hash. The final fresh [independent UI review](account-tools-ui-review.md) now records `disposition: ship`, recommendation APPROVE and no local-prototype finish blockers. Its `review-fresh/results.json` records 13 Chromium captures and seven passed check groups, no errors or external requests, at the exact artifact hash. The reviewer also rendered baseline/current Profile and opened all 15 resulting views. Fresh checks cover complete legal text/order, support facts and native keyboard behavior, legal visibility/recovery, contextual focus and cancel/Escape, ended-session refresh/deep-link/Back guards, and truthful pending state. Phone/review widths are 320/390/430/884px in Light/Dark, with 320px/200% reading and confirmation/pending coverage. Computed evidence measures the contact action at 48.39px and summary at 64px, using the existing 16px body and Light canvas/card roles. The reviewer independently executed Chromium only; cross-engine QA remains the separate implementation evidence. This documenter read that disposition and its results rather than rerunning those interactions.

## Retained recording gaps and limits

Incumbent design-record gaps remain unchanged: DESIGN frontmatter describes colors without the full typography/spacing/radius/component schema, and its body uses custom headings instead of the reference documenter's canonical section set. The 21st typography summary is partial. Impeccable metadata has no tonal ramps or typography metadata, and its static component snippets do not represent every running interaction. The Light default remains `colorMode: light`, with Dark explicitly recorded as an extension. The broad 21st no-persistence constraint does not spell out this pass's narrowly authorized anonymous ended-tab exception; the plan, AGENTS and this record do. This assignment does not migrate schemas or edit those source-of-truth records.

This is a local fictional prototype comparison. It establishes no production integration, real-session revocation, provider/device cleanup, legal approval, security certification, native-device assistive-technology certification or complete Employee feature parity. Inline policy links retain ordinary semantic reading-link treatment; the 48px/44px claims above describe the shared action controls, not a fabricated minimum size for every inline text run. Public policy wording describes real application capabilities that this preview explicitly does not execute. The independent browser review is a separate completed local closeout artifact; its approval does not expand these limits.
