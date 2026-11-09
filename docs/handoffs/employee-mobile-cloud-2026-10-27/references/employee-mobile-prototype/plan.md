# Employee mobile plan

Jose selected the new Owner mockup's clean teal style for Employee mobile on October 26, 2026. Work is isolated from the active Owner and access prototypes. This stage produces a React prototype using fictional in-memory data; application integration and deployment are separate work.

The first slice below has been extended by the [Requests/Availability pass](next-pass-plan.md). Its current scope and checks are in [verification](next-pass-verification.md).

## Foundation

Keep the official NEVORA wordmark, system font, regular Phosphor icons, teal `#0b6e69`, canvas `#f4f7f6`, white surfaces and ink `#172622`. Reuse the Owner control, spacing, radius and focus roles through frozen references. Every action should communicate its purpose; the page should make the next Employee task clear.

The Employee application currently has its own Signature direction. This local adaptation follows Jose's new selection without changing that application or declaring a new global system.

## Implementation sequence

1. Record real Employee capabilities and exclusions against development 46e2027. Create the isolated source/build and shared React primitives.
2. Connect Home → Schedule → shift detail and weekly review. Use Home, Schedule, Requests, Hours and More navigation. Keep own published shifts distinct from recorded time.
3. Connect Requests → time-off form → review → pending receipt, with cancellation. Connect Hours → completed entry → correction request. Keep phone punching out of the mobile surface.
4. Provide own profile and routes to availability/updates with explicit remaining scope. Verify complete loading, error/retry, empty and success states for the implemented slice.
5. Inspect one batched set of phone widths and enlarged text; fix proven issues together; confirm once. Run type checks, browser scenarios,21st deterministic review and a fresh independent UI/UX review.

## Skill and tool decisions

-21st UI build: search before building; reuse inspected project patterns. Catalog metadata does not mean a component was installed.
- Impeccable/premium layout: operate mode, consistent density, deliberate hierarchy and bounded verification.
- Apple design: predictable navigation, immediate press feedback, native semantics, focus and reduced motion. The selected solid enterprise surfaces take precedence over glass prescriptions.
- React UI patterns: honest read states, controlled forms, surfaced failures and clear mutation feedback.
- UI/UX Pro Max: use touch, contrast and state guidance. Its generated marketing-page/color/font recommendation is unsuitable for this established application and is not adopted.
- GPT taste: retain careful hierarchy and avoid defaults. Random hero/AIDA/GSAP prescriptions are incompatible with the selected task UI and are not adopted.
- Mobbin: inspected search results did not match Homebase; do not label them competitor evidence. Official Gusto/Homebase information guides workflow comparison only; Nevora's source defines capabilities.
- No AI slop: direct product language. OMO remove-ai-slops: cleanup only after a green behavioral baseline; preserve boundaries and established functionality.
- OMO init-deep: bounded Employee knowledge file plus real source/structural discovery. Missing TypeScript LSP prevents measured reference centrality; no language server is installed.
- Tastemaker: the supplied principles guide coherence; its installed skill lacks the referenced knowledge base after a local search, so no formal CR/TS grade is claimed.

## Release boundary

This stage is not complete Employee feature parity. Swaps/coverage and availability now have local flows in the latest pass. Timecards, broader corrections, gated pay statements, messaging, notifications, language/appearance, calendar subscriptions, passkeys and account operations need their own detailed passes. All domains still need real integration checks. Keep them recorded rather than implying they are finished.

Official comparison sources: [Gusto Employee mobile](https://support.gusto.com/article/207607681100000/gusto-mobile-app-employee-experience), [Homebase mobile](https://wf.joinhomebase.com/app). These support the workflow study, not a claim of visual or feature parity.
