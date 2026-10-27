# Employee mobile: profile overview and preferences

Scope: part1 only, following Jose's approval. Extend the local Employee prototype with a source-grounded account overview, read-only work details, sign-in language and device appearance. Preserve the approved light teal foundation; add its functional dark variant using the application's existing Midnight semantic color roles. Account security, calendar/device alerts, legal/sign-out/deletion and Pay remain later slices. No production/API, cookie, localStorage, OS preference or real account changes.

## Connected mobile flow

More's existing Your account identity card opens a full account screen. Keep its identity styling and five-destination navigation; Back restores the card's keyboard focus. Own name, company, active eligible locations, Employee access and workplace timezone are read-only. Work-details unavailable/stale/empty recovery is separate from device preferences; deny unrelated/unauthorized profile reads rather than rendering them.

Language and Appearance use short protected-focus choice sheets with native radio groups and Done. Language offers English/Español and explicitly applies to sign-in pages only. Appearance offers Match this phone/Light/Dark, updates the entire prototype phone immediately, and follows live system preference changes only when Match this phone is chosen. The initial fictional sample retains its approved Light appearance. All choices remain in memory and reset on document refresh.

## Source and design

Read-only source: clean detached development46e202786863279302026ee03a0e225c359fa55c. EmployeeProfileDetails/readEmployeeProfile expose own name, workspace, active eligible locations, access and timezone, with manager correction guidance; they do not grant an employee work/contact editor. ProfileSettingRows and theme/auth-language helpers define the preference scopes. Existing Signature dark tokens supply semantic color provenance; no layout/type/icon direction changes.

Reuse Heading/Section/Row/Button, the identity card, detail-list and native dialog lifecycle.21st metadata search found profile editors, a radio group and preferences cards; editors conflict with read-only authority and new component code would duplicate installed primitives. No retrieval, installation or hosted generation is needed.

## Verification and handoff

Preserve the previous181 integrated cases; update the account-card navigation expectations for the authorized full-page flow without reducing readonly/focus assertions. Add profile/choice-sheet/authorization/recovery checks,320/390/430px and current884px review width,200% text, native keyboard radios, focus return, live system preference, language scope, dark-theme contrast/native controls and cross-surface consistency. Run Chromium/WebKit/Firefox, strict TypeScript/build/served-byte checks and local21st review. Use independent finish review and design documentation; preserve prior reports and existing metadata drift. Record the final hash, screenshots, scope and remaining integrations in profile-verification.md and the coverage ledger.
