# New candidate finding on980e823

Exact immutable source `980e823eba6e243d456483b33cd0571131389cb6`. All tested publication mutations were intercepted and aborted in the browser; no update was published. Audience preview was answered by a browser-only fictional mock.

| ID | Severity | Measured defect | Minimum correction |
|---|---|---|---|
| IS-RC-COMPOSE-01 | P1 | Owner, Chromium320×844/200% and1440×900/100%: keyboard Publish update produces exactly one held POST, but the pending initiating button has `focused:false`, `disabled:true` and no `aria-disabled`. Native disabling removes its keyboard focus. These cases otherwise pass reserved-label geometry/centring, double activation, unknown-result recovery-region visibility and Check status focus, original operation status lookup, and title/message retention. | In `src/components/communication-compose.tsx`, preserve the existing unknown-result/stale-edit locks, make only pending Publish natively focusable with `aria-disabled`, and refuse pending clicks using the existing synchronous communication recovery guard. Recheck both engines, double activation, unavailable recovery and retained draft. |

Raw evidence: completed `compose-recovery` rows in [targeted-states.json](targeted-states.json), [progress log](targeted-run.log), and [phone pending crop](crops/chromium-compose-recovery-QAOWNER-320x844-t200-default-publish-pending.png). This finding is related to the existing IS-B12 pending-focus category but concerns the currently rendered candidate Composer, whose native-disabled pending action differed from the newer inspected source.
