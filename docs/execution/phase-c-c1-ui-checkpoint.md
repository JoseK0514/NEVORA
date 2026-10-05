# NEVORA Phase C — C1 Owner and tablet setup checkpoint

Date: 2026-10-05
Branch: phase-c/real-time-clock-live-operations
Starting checkpoint: 8a02d62a0d6ba0aad1126bf82c0af9fdfd2c6891
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status
C1 device lifecycle, Owner management screens, and protected tablet enrollment are implemented and locally verified.
Phase C remains IN PROGRESS. This is not a release candidate, hosted validation, or a working employee punch system.
C2 employee PIN security is the next implementation slice.

## Delivered
- Owner-only Settings > Clocker Devices with add, rename, revoke, replacement/reconnection, location binding, lifecycle state, and last-checked timestamp.
- Canonical ActionMenu, SelectField, StatusPill, native modal confirmations, 44px minimum controls, and mobile/tablet layouts.
- Server-action authority derived from the live session and revalidated by the existing transaction guards; rejected forged actor fields, duplicate fields, and stale versions.
- Explicit browser DTO allow-list; no credential hashes, device proofs, session hashes, or database records serialized to the Owner UI.
- Temporary one-use setup codes are displayed only to the authorized Owner; the public location URL never contains a setup code or a device credential.
- Protected POST setup transport with exact trusted-Origin validation, JSON/custom-header requirements, bounded input size, and no-store responses.
- Production credentials use Secure, HttpOnly, SameSite=Strict, host-only cookies. Local HTTP browser tests use separate development cookie names.
- A preparatory HttpOnly cookie precedes enrollment, allowing status reconciliation after a committed response is lost.
- Confirmed revocation of the current tablet's portal session before shared-device handover; an issuing Owner on another browser is not signed out.
- Previously issued credentials cannot be reused after replacement/revocation; only hashes are retained in an append-only issuance history.
- Failed status verification has an explicit recovery screen instead of falsely claiming the tablet is connected.
- The Phase C public Clocker no longer exposes demonstration punches; it explicitly says real timekeeping is not available yet.

## Verification actually run
| Check | Result |
| --- | --- |
| Full unit regression | 138 files / 1,415 passed |
| C1 PostgreSQL lifecycle, transport, schema and concurrency | 3 files / 59 passed |
| Existing foundation PostgreSQL suite | 2 files / 75 passed |
| Chromium + WebKit C1 browser matrix | 62 checks, 0 errors |
| TypeScript | PASS, including after reverting build-generated configuration drift |
| ESLint | PASS |
| Local production Next build without DATABASE_URL | PASS |
| Diff whitespace hygiene | PASS |

The existing foundation suite retains its original 0001–0010 fixture chain. Dedicated C1 SQL/browser tests apply the C1 draft after 0010. Other older PostgreSQL suites were not rerun against the extension in this slice.

## Browser evidence
External evidence: /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c1-ui-verified
Report: report.json (62 checks, no errors, 16 screenshots).
Owner widths: 320, 375, 390, 430, 768, 1024, 1440.
Tablet widths/orientations: 1024x768, 768x1024, 320x740, plus setup/recovery screens.

Real owned browser journeys covered registration, tablet enrollment, rename, stale-view rejection, revoke, replacement, dropped committed response recovery, outage recovery, cross-origin denial, Manager denial, and same-browser Owner-session handover.
Keyboard checks covered native dialog Escape/focus restoration; responsive checks covered page overflow and visible control dimensions/bounds. Owner desktop/mobile, device dialog, tablet setup, connected, and recovery screenshots were inspected.

## Findings and RED -> GREEN evidence
- Prepared cookie was initially ignored by redemption: reproduced and bound server-side for recovery.
- A retired credential could initially be reissued: reproduced, then prevented with append-only issued-hash history and fresh replacement preparation.
- A failed status check retained the connected headline: reproduced in the real browser and replaced with explicit uncertain/recovery presentation.
- WebKit and Node used different Intl joining literals ("Oct 5 at ..." vs "Oct 5, ..."), causing hydration errors: reproduced and fixed with semantic date parts plus deterministic separators; no warning suppression.
- Harness corrections: use the native select's exact accessible combobox name; await the designed next-frame focus restoration; scope error assertions to the application rather than Next's route announcer.

Detailed RED/GREEN logs and rulings: .superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/

## Configuration and release boundaries
- Production/hosted C1 setup requires NEVORA_CLOCKER_ORIGIN set to the exact HTTPS origin. No environment setting was changed by this work.
- Database schema remains a draft at db/phase-c/clocker-devices.sql. No migration number 0011 was reserved and no historical migration was edited.
- No Preview, Neon, customer, or production database was accessed or modified.
- Test runs owned their loopback PostgreSQL clusters and scratch Next apps; cleanup completed. The production DB transport was changed only in the owned scratch copy, not in repository source.
- Phase B frozen source, development and main were not changed. This checkpoint is local only; no push or deployment.
- Next-generated next-env.d.ts/tsconfig.json drift was removed and TypeScript checked again.

## Remaining work and limitations
- C2 PIN security, C3/C4 persisted punches/reliability, C5 break types, C6 schedule context, C7/C8 live views/My Time, and C9 complete operational Clocker are not delivered by this checkpoint.
- No hosted HTTPS Preview, production-Neon transport validation, physical iPad/iPhone test, or full screen-reader certification is claimed.
- Browser tests use real Next development and real owned PostgreSQL with a substituted local DB transport; no real notifications are sent.
- Self-review was performed. Independent Codex Phase C review and Phase B reconciliation remain mandatory before release.

Recommendation: GO for continued isolated C2 implementation. NO-GO for live customer timekeeping or Phase C release.
