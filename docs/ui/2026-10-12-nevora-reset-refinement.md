# Set a New Password refinement

Jose requested the same visual treatment already accepted for the refined authentication pages. Scope is `/reset-access`, its presentation components, shared scoped authentication styles, design specimens and asset provenance.

## Result

- Original NEVORA wordmark with Workforce centered beneath, using AuthBrand.
- Neutral stationary hero containing a single original cobalt key. No blue doorway, supporting hero sentence, animation or Pause control.
- Set a New Password heading without introductory copy.
- Optional native Info disclosure for recovery-link/paste guidance, retaining the explanatory association.
- Shared 54px controls, 14px corners, 44px password toggle and 56px assistance summary with AuthDisclosureSymbol.
- Plain recovery, sign-in and outcome links with no decorative arrows.
- Visible eight-character password requirement retained.

AccountRecovery, reset API, database adapter, authentication actions, legacy login CSS and shared motion controller are unchanged. Proof-fragment autofill/removal, matching-password handling, request lifecycle, hydration/pending restrictions, privacy-safe outcomes and focus behavior retain their existing implementation.

## Evidence

- Six focused Vitest files: 40 tests passed, including reset constraints, pending, mismatch, invalid, uncertain and confirmed-success rendering.
- TypeScript typecheck passed.
- Repository ESLint: zero errors; one pre-existing cleanup-ref warning in employee-weekly-confirmation.tsx:18.
- Isolated Next 16.3.8 build passed using the existing marked disposable PostgreSQL preview fixture and its approved fixture adapter in the build mirror only.
- Browser: 320, 390, 768, 800, 1024 and 1440px widths had document width equal to viewport width. All three fields and submit were 54px, Info/password-toggle targets 44px and assistance summary 56px. Workforce center error was under 0.004px. Artwork loaded with no motion control.
- Keyboard Enter/Space opened/closed native Info and assistance. Visible cobalt 2px focus was confirmed. Plus/Minus reflected native open state. The Info popover fit the 320px viewport.
- Show/Hide passwords switched both empty inputs together; constraints, autocomplete and aria-controls remained intact.
- A fictional 43-character proof populated the field and was removed from the URL fragment. No new credentials were entered or submitted.
- Empty-form submission was blocked by native required validation and focused the recovery-code input.
- At 1440px, the three previously approved pages matched their saved rectangles, typography, colors, backgrounds and corner measurements. No differences were found across seven measured elements on each page.
- Candidate browser console had no captured errors or warnings.

## Controls and director positions

Product/Experience: apply the approved quiet authentication language to the next page; retain task-critical constraints and hide optional explanation. Engineering: reuse scoped components and styles; preserve form/data/API boundaries. Security: retain credential/proof behavior and outcome distinctions; test presentation with empty fields and fictional proof only. Governance: this is a temporary fixture-backed preview, with no production authorization or customer-data change. Program: bounded implementation and verification completed; Jose owns visual acceptance before subsequent page work. These are implementation positions, not independent certification.

## Preview and rollback

Branch: `codex/nevora-login-refinement-20261012`. The source is an isolated checkout; shared development/main and active audit work remain untouched. No remote push, merge or production deployment is part of this change.

Preview route: https://counted-staffing-solutions-sticker.trycloudflare.com/reset-access

The tested candidate is `work/reset-runtime-v3` in this chat workspace. The previous public build remains at `work/auth-runtime-v2`. Replace only the verified Next child listening on loopback port 56316; retain the existing Cloudflare tunnel and PostgreSQL owner. Rollback uses the previous build with the same launcher, port and private fixture environment. Runtime PID and final public verification are recorded in this chat's `work/reset-preview-runtime.json` and `outputs/NEVORA_RESET_REFINEMENT.md` after the swap.

The exact new asset prompt, original source filename, dimensions and SHA-256 are in public/assets/manifest.json. Real rendered component specimens are in .impeccable/design.json. The prior reset asset remains available.

Owner: Codex implementation / Jose visual acceptance. Next gate: review the temporary reset-page preview. No production decision is required or implied. Browser QA did not perform a real password reset; full credential end-to-end verification is outside this visual change.
