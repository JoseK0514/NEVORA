# Manager/Owner exit round, October 20

**Result: NO-GO. Four independently reproduced P1 issues and three P2 issues remain open.** This round does not certify an exhaustive state matrix or production readiness. [Independent findings and coverage limits](task-1-report.md) preserve the original report plus the touch-target addendum; its addendum brings the total to four P1 and three P2. [Manual evidence matrix](task-1-manual-qa.md) identifies measured scenarios and artifact hashes.

## Candidate and custody

- Requested application source: `30058003e3e3a77932016fa1aff0b4dcbe69c1a5`.
- Preview/CI checkpoint: `06e85d7af995969b17ac0118897ce7e79ddf4614`, adding only the CI branch trigger, its regression test and ledger. Later audit commits add documentation only.
- `src` tree at all three checkpoints is `a79b8e73da51dbaf684975b902277ebd3fc179f6`.
- Fresh owned loopback PostgreSQL16.15/Next dev mirror, pinned Playwright1.62.1, fictional employees/locations, delivery disabled. The only application substitutions were the approved test database adapter and generated development type references.
- Preview stopped with exit0, `errors:[]`, `sourceAndMirrorVerified:true`, `postgresStopped:true`. No production database, deployment, customer data or notification provider was used.

## Executed checks

[Matrix summary](matrix-summary.json): **6,160 resize/text cases, 308 route navigations**, Chromium and WebKit, Manager and Owner. Widths320/360/390/430, landscape844×390, tablets768/1024 with touch and mouse, desktop1440; text100/125/150/200%. Reduced motion was set for this geometry pass. Pages loaded once per route/input-device context, then resized and text-scaled after hydration. **Zero failed navigations and zero page-level overflow cells.** Screenshots cover representative100% widths; manual evidence covers additional states and text scaling.

The unchanged legacy checker also executed **268 cases** at390/1440 with axe in both browsers. Its overall result was0/268 because its older typography and visible-control-box rules conflict with the approved v3 rulings. Those results were retained, not rewritten or counted as passing. Axe reproduced Schedule's inline-link distinction failure. CLS readings above0.01 were retained and investigated independently.

The v3 matrix retains296 clipped-element candidates and1,037 short-target candidate cells. The clipped candidates are four intentionally visually hidden summary patterns, not observed page clipping. Pseudo-element estimates alone cannot certify touch targets: independent actual taps disproved some estimates and confirmed the tablet overlap plus two width shortfalls. No blanket all-controls pass is asserted.

## Open independent findings

| Severity | Finding | Measured evidence |
|---|---|---|
| P1 | TC-MAN-01 Schedule inline action distinguishable only by color |1.03:1 versus surrounding text, no underline; both-browser axe failure |
| P1 | ST-MAN-01 Home loading placeholder changes geometry |Manager phone CLS0.0223; Owner desktop0.0116 |
| P1 | ST-MAN-02 Timecards first-load placeholder has no height |0→874px at768; CLS0.02697 |
| P1 | IS-MAN-02 Tablet sidebar hit areas overlap |Tap2px inside Inbox's visible bottom opens Schedule in both engines |
| P2 | IS-MAN-01 Timecards pending label/geometry |Premature Retry label; sheet top moves+28px while pending |
| P2 | IS-MAN-03 Inbox All target too narrow at125% text |39.453×44px effective area at320 |
| P2 | IS-MAN-04 Seven-day strip slightly below44px contract |43.422×64px at320; subpixel precision finding |

No finding is closed by this report. Payroll/legal wording was preserved. Full large-data/adversarial lifecycle coverage, native VoiceOver/TalkBack and the WebKit keyboard-preference risk remain open as described in the independent report. Browser workflow suites run next; their eventual success cannot close these visual/interaction findings by itself.

## Durable local artifacts

Evidence root: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/manager-owner-exit/`.

- `matrix.json`, `audit-matrix.mjs`, `screens/`: full measured matrix, exact helper and screenshots.
- `legacy/`: unchanged original checker JSON.
- `manual/`: durable copy of the independent scripts, sanitized measurements, screenshots and action logs. The report's `/tmp/nevora-verify-33-manual/<file>` references map to `manual/<file>` here.

[Evidence review](evidence-review.md) approved the initial bounded audit report, not the UI. Its temporary-retention caveat is addressed by the durable copy above. The later independent touch-target addendum retains its own evidence references and does not imply independent issue closure.
