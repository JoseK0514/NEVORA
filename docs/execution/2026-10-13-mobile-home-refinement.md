# NEVORA mobile management Home — 2026-10-13

Source branch: `codex/nevora-login-refinement-20261012`, parent `9f3b4850ba805077e0426bc566564da10797b894`. Isolated checkout; same authorized synthetic preview runtime. User scope is manager/Owner mobile Home only. Desktop, employee/lead Home and non-Overview routes preserve their prior design.

## Change

Gusto Mobile Home was retrieved and inspected through authenticated Mobbin (screen fa4081e0-675f-467a-aa70-8e7b16148c00). Its inverse masthead, overlapping white primary card, quiet action rows and plain tab bar inform NEVORA's schedule/attention/recorded-clock hierarchy. NEVORA wordmark and centered Workforce remain. 21st CLI retrieved Quick Actions Grid Drawer24848 and Dashboard Activities8372; their mapped card/action anatomy is adapted to existing React/CSS/Phosphor rather than demo data/dependencies. 21st MCP was unavailable; hosted AI generation is disabled and was not used.

`MobileHomeOverview` reuses selected-week server-authorized facts and exact schedule/week routes. `MobileHomeTools` retains Attendance, Team, Requests and Activity. `MobileHomeDisclosure` provides optional task/planning detail on phones and display:contents on desktop. The Action Center reader/controller remains byte-identical to parent; private names/counts are cleared while unconfirmed, and open/closed choice survives refresh. Grouping, category URL, bounded preview, Show all, exact review destinations and Recovery tools remain. Mobile action copy humanizes validated YYYY-MM-DD day tokens; original desktop copy remains.

Home-only CSS<=760 defines coherent mobile tokens. The management More control becomes a native bottom action sheet with Close; Enter/Updates focus, Escape/trigger focus and role-owned destinations remain. Strong default hide excludes its UserCircle from every other mobile page. Active Home tab has a soft-blue wash, glyph, weight and aria-current. No new data readers, APIs, dependency, real customer mutation, delivery or production setting.

## Checks

- Focused UI/navigation suite:13 files178 tests passed. Final changed-component rerun:3 files68 tests passed. No weakened assertions or snapshot updates.
- TypeScript passed; ESLint zero errors, one pre-existing employee-weekly-confirmation.tsx:18 cleanup-ref warning.
- Isolated Next build passed: `pYrNCXZ0NiSHSO0qEWNPl`.
- Source/runtime build-input match:827 matched inputs, detailed receipt in work/mobile-home-source-runtime-match.json; approved fixture-only src/lib/db.ts is the sole exception.
- Browser: owner320/390/430/760/1440; manager/employee/lead390/1440; all21 visible owner navigation consumers390/1440; all5 other management views; 65 final PNG captures. Current task filters/empty category, group/Show all, disclosure/refresh, recovery tools, planning/end, menu320/390, keyboard/Escape/Close, and next/previous week tested. All visible Home controls>=44x44; no recorded horizontal overflow.
- Desktop geometry unchanged. Matched1440x1468 baseline diffRatio.0009, similarity100; three changes are volatile Checked timestamps. This is preservation evidence, not a pixel clone of Gusto.
- First independent review caught sibling icon cascade leak, absent arrow tooltips/selected wash and one malformed screenshot. Product/evidence fixes were consolidated; whole65-capture set refreshed for the final independent gate. Fresh independent behavior and visual reviewers both returned PASS with empty BLOCKING lists on build pYrNCXZ0NiSHSO0qEWNPl; both directly opened all65 fresh captures. Reports: work/mobile-home-evidence/qa-behavior-final.md and qa-visual-final.md. Each per-item assessment explicitly retains capability/evidence limits; this is not a native-device or full contrast certification.

## Evidence and limits

Chat work/mobile-home-evidence holds manifest/source hashes, route/role maps, per-item two-reviewer reports and full current65-image set. The packet records exact scope and capture hygiene. CUA screenshot JPEG bytes were converted to actual PNG; all signatures, sibling dimensions and freshness were checked. All records are fictional fixture data; real messages/customer changes were never tested.

Responsive web viewport testing is not native iOS touch/DPR/notch verification. The incumbent app is light-only; no dark theme was added. Reduced-motion fallback is code-verified, not browser emulated. Unavailable/offline/paused/denied states are covered by existing rendering tests without inducing risky live conditions. 200% zoom was not emulated. Dynamic detail screens are unchanged and cannot activate the Home-only CSS flag.

## Preview and rollback

The previous random Cloudflare URL expired before this change. Continue using the same local preview port56316/source branch with the replacement temporary public URL https://rent-less-momentum-tags.trycloudflare.com/app. Exact current source commit/ownedPID/public browser receipt are in work/mobile-home-preview-runtime.json and outputs/mobile-home-preview-report.md after swap. Runtime mirror work/mobile-home-runtime-v5; retain work/home-runtime-v4 for rollback.

Rollback: verify current owned Next PID, command and 127.0.0.1:56316 listener against metadata, SIGTERM that child only, and launch retained home-runtime-v4 with existing private preview environment on56316. Keep the existing Cloudflare tunnel and synthetic PostgreSQL owner. Never kill unrelated processes, expose secrets, merge/push main or deploy production.
