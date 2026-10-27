# Employee mobile: profile overview and preferences

Part1 is implemented in the [local interactive prototype](index.html). It preserves the approved clean teal system and extends its existing controls with a functional Dark appearance variant. Final HTML SHA-256: `5dcb9f1050c56a533c0fc72150ccbec588e470eadf14dd61f3ecd13eacf7fe58`.

## Implemented scope

- More's existing Your account identity card opens a full account overview. Back restores the identity card's keyboard focus. The five-destination navigation remains unchanged.
- Own identity, company, active eligible locations, App access and workplace timezone are read-only. Manager correction guidance replaces an unauthorized work/contact editor. Foreign, denied, malformed and unavailable profile data is withheld; a failed work-details read does not disable independent device preferences while own session identity remains trusted.
- Language offers English/Español through native radio choices and explicitly applies to sign-in pages only. It does not claim to translate workplace screens.
- Appearance offers Match this phone, Light and Dark; it updates the entire prototype phone, including sheets and native fields. System mode follows live system changes; explicit Light/Dark stay fixed. The initial fictional sample retains the approved Light appearance.
- Choice sheets provide one Tab stop per radio group, native arrow selection, visible keyboard focus and Done/Escape return to the exact opener, including WebKit pointer activation. Work-details refresh reveals the focused section heading.
- Preferences remain in memory. This prototype sets no auth-language cookie, localStorage, sessionStorage or OS theme. Refresh restores its sample defaults.

This pass adds no account security, calendar/device alerts, legal/sign-out/deletion or Pay controls. Those remain later slices; existing help and work flows are preserved.

## Checks actually run

| Check | Result and evidence |
| --- | --- |
| Strict TypeScript |PASS; `work/employee-mobile/evidence/profile-pass/typecheck.log` |
| Build / saved-byte reproduction / served artifact |PASS esbuild and `build.mjs --check`; final source-built, saved and served bytes match |
| Existing integrated coverage |181 grouped checks perengine PASS, including the authorized account-card full-page navigation expectation update |
| New profile/preferences coverage |26 grouped checks perengine PASS, Chromium/WebKit/Firefox; no runtime errors, external requests or non-GET mutation requests captured |
| Total integrated coverage |207 grouped checks perengine, all36 result files naming the final hash; [checks.json](checks.json) |
| Profile model projection/preferences |15 assertions PASS; own-only role/identity, withheld malformed data, explicit field projection, immutable state, preference whitelist and system resolution |
| Independent UI/UX |Initial review plus bounded final recheck APPROVE / ship for local part1; [report](profile-ui-review.md) |
| Independent enlarged-text recheck |Eight320/390px × Light/Dark × Chromium/WebKit cases PASS: title/Close separation,44px Close target, native radio navigation and exact focus return |
| Sampled contrast |Independent computed ancestor-composited text samples across Profile/Home/Hours/Updates/Requests/Schedule meet4.5:1; minimum5.03 Light and6.31 Dark. Local active field-edge checks meet3:1 |
| Design-system / source palette |23 Light canonical colors preserved;20 Dark overrides centralized, with matching DESIGN/.21st/.impeccable records and a frozen source-palette hash |
| 21st local review |52 source files;43 informational literal-color advisories in canonical Light/Dark token definitions;0 fixed. Metadata inspiration searched; no catalog package/code retrieval or hosted generation |
| Artifact integrity |32 output screenshots carry origin metadata and final image hashes; five frozen foundation references and separate Dark source reference match; all52 source files remain below250 nonblank/noncomment lines |

Browser checks include320/390/430px mobile and660/884px review widths,200% text, long own work details, denied/unrelated/missing/stale/partial reads, loading/error recovery, language scope, live system changes, both appearance modes, native field color scheme, keyboard focus, touch targets, navigation retention and document-refresh reset. The existing account-card suite retains10 checks; it now tests the approved full-page overview and Back focus rather than the former short profile dialog. No assertion was removed to hide a failure.

WebKit initially exposed a setting-opener focus difference; the Profile handlers now explicitly establish their opener before opening the native sheet. The independent review then found the enlarged Appearance title intruding into Close. Shared header wrapping now reserves the target, and the regression measures actual text/target separation rather than only outer overflow. The incomplete work-details capture was recaptured with all four fields visible. Historical failures and initial review remain preserved; the appended review is the current verdict.

## Source and design record

Read-only application baseline: clean detached development `46e202786863279302026ee03a0e225c359fa55c`. Relevant anchors: `src/lib/data/employee-profile.server.ts`, `src/lib/employee-view.ts`, `src/components/employee-profile-details.tsx`, `src/components/employee-profile-rows.tsx`, `src/lib/theme.ts`, `src/components/theme-switch.tsx` and auth-language helpers. These ground read-only fields and preference scopes; they are not runtime authorization evidence for this prototype.

Dark semantic roles derive from the existing approved Midnight source palette in `src/components/signature/tokens.css`, frozen separately under `work/employee-mobile/references/profile-source/`. The existing Light field-edge role is retained for contrast. Light tokens, type, icons, spacing and shapes stay unchanged; the official wordmark receives only a monochrome CSS treatment in Dark. Exact token mapping/provenance lives in `evidence/profile-pass/dark-token-map.json`.

The [design record](profile-design-record.md) documents the bounded extension and preserves preexisting metadata drift. Available independent fidelity-review/documenter roles substituted for the skill's unavailable exact named agents; their reports distinguish inspected evidence from checks they actually reran.

## Limits and handoff

This is a fictional in-memory Employee mobile prototype. It does not change real profile data, account language, device settings or credentials. Production needs live own-profile authority/freshness, trusted identity/location data, the real auth-language store, device-theme persistence and full integration. Native device keyboards/pickers, VoiceOver/TalkBack and exhaustive theme coverage of every nested workflow remain unverified.

The projectless workspace has no Git repository, branch, commit or PR. The real application checkout remains clean, detached and read-only. No production build, database, API mutation, subscription, notification or deployment occurred. Standalone lint/security scanners are not configured and are not reported as passing.

No user action is required to finish part1. The preview is left on Your account in Light. The next authorized slice would be account tools, followed by gated Pay and live integration; [remaining coverage](desktop-parity-audit.md) stays explicit.

[Profile](profile.png) · [Work details](profile-work-details.png) · [Appearance choices](appearance-dark.png) · [Dark profile](profile-dark.png) · [Sign-in language](profile-language.png)
