# Calendar reflow and shared focus return

**EM-A01 and EM-A02 are verified resolved** in the isolated Employee mobile prototype. [Calendar preview](index.html?page=calendar). Current HTML SHA-256: `d28b942b0b8e32c164e1e5464a3c62b9eda0d64f7fa5152c1b27bdd52b3f77d7`. Baseline: `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`.

## What changed

`src/Calendar.css` gives the existing title a text-relative8ch flex basis/minimum. The status naturally wraps below it when needed; complete heading and status text remain separated. It changes no color, text, icon, radius, button size or authority model. All four labels—Not created, Link active, Link revoked, Unconfirmed—were exercised in Light/Dark at320/390/430/884px100%, plus320/390/430px200% text.

`src/App.tsx` captures the actual activating button/link/summary for the current click and focuses it before opening the native dialog. WebKit pointer activation previously left BODY focused, so native dialog close had no useful opener. The transient reference clears in the next task. Native opening/close/focus containment, specialized workflow focus, session/epoch checks and permitted actions are preserved. No new Employee capability, coworker selector, calendar operation or real browser permission is introduced.

## Evidence actually run

- The new20-group WebKit regression first failed on the archived baseline for Calendar overlap and generic-sheet focus return; remaining positive controls passed. The final runner records20/20 per Chromium/WebKit/Firefox with no page errors or unexpected requests. Source/style assertions were not weakened to get green.
- All419 prior groups were rerun in each engine, for **439 grouped checks per engine**. This covers adjacent Home, Schedule, Requests/Availability, recorded time/corrections, notifications/updates, account/preferences, protected calendar/passkey/device/Pay/deletion and local session paths. Existing model suites pass; all permissions/model sources remain byte-identical.
- Focus checks include pointer Done/Escape/Close, keyboard containment, synthesized touch, nested SVG hits, a different subsequent opener, replacement of recorded-entry sheet content, Appearance, Calendar Keep current link and sign-out/private re-entry. Touch synthesis/browser emulation is not a physical-device claim.
-61 current Chromium originals:56Calendar viewport/theme/status combinations and5return scenes. The actual complete header was scrolled into view for enlarged-text evidence.884captures are430px app crops from884×853; enlarged text captures are interior segments, not full-page evidence. All61 are hash/provenance bound and independently visually inspected.
- Independent QA personally ran **120/120 passing scenarios**,40per engine:72Calendar and48focus/control cases, with screenshots/traces. Both findings are VERIFIED resolved. Its report distinguishes actual fresh execution from inspected earlier results.
- Strict TypeScript and source/saved/served comparison pass.81source modules remain below250 nonblank/noncomment lines; maximum204.21st reviewed the2changed files with0errors/warnings/suggestions. Existing automatic design-hook records are clean; no extra detector or metadata repair was run.
-99public PNGs have verified origins/hashes; prior current evidence and published bundle are archived under evidence/calendar-focus-pass/before. Pay PDF regression downloads were freshly parsed/hashed again:6matching fictional1-page files, no real pay data.

## Independent closure and remaining scope

[Fresh UI/source review](calendar-focus-ui-review.md): **ship / APPROVE** for these two corrections only; no material fix. The unavailable named Impeccable finish reviewer was substituted by the clone-fidelity reviewer. [Independent QA](calendar-focus-qa.md): **GO for EM-A01/02, VERIFIED resolved**. [Design comparison](calendar-focus-design-record.md) records the ordinary refinement; the named documenter was substituted. Reviewers did not edit implementation. See [machine closure](calendar-focus-closure.json) and [current checks](checks.json).

The original [full audit](full-audit.md) remains a historical snapshot at its68aad106… hash. These eight items remain open: EM-A03, EM-A04, EM-A05, EM-A06, EM-A07, EM-A08, EM-A09, EM-R01. This correction does not claim full Employee parity or production readiness. Physical iPhone/Safari, screen readers, real account/session authority, native permissions, calendar feeds and production integrations remain unverified.

Changes and tests live only in work/employee-mobile and outputs/employee-mobile. The actual application checkout stayed read only at46e202786863279302026ee03a0e225c359fa55c. This projectless prototype has no branch/commit; no PR or deployment was made. Next user action: review the local Calendar/return journey. Further audit corrections follow the existing prioritized register.
