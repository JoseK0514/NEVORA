**Incomplete — one shared kit P2 observed; no completed Wave A type/copy exit.** Exact `a05f26a74b2979ce0efe1532f7f70d7064261bb9`. The finding below belongs to the coordinator/kit and is counted once; the normal-state Wave A sweep remains unfinished.

## Earlier findings

TC-WA-1–14 are not blanket-closed from source alone. The first4 checker cells report no type-floor or axe violation on Add shift.

## Shared kit (for the coordinator)

| ID | Screen / role / conditions | Element / measured defect | Evidence | Cause / specific fix | Severity |
|---|---|---|---|---|---|
| TC-WA-15 | Swap, AUDIT-E, Chromium320×844,200%, held sending | Pending “Sending…” renders foreground RGB(161,165,167) on RGB(239,242,241): **2.205:1**. This is below the brief’s4.5:1 text floor. The disabled control is exempt from axe’s WCAG contrast check; this finding applies the brief’s stated readability bar to its progress message. | [Saved viewport](crops/chromium-swap-press200-pending.png), [pixel measurement](pending-contrast-observation.json) | `src/app/app/portal-gusto.css:129` sets all disabled buttons to `opacity:.55`; `src/components/kit/kit.css:249` and `premium-wave-a.css:104` set readable disabled colours without resetting opacity. Add `opacity:1` to the existing high-specificity Wave A rule at `premium-wave-a.css:104`, or a shared kit selector that outranks `portal-gusto.css:129` (for example `html body .app-shell.nevora-portal .page-frame .nv-page .nv-btn:disabled`). Adding it only to the low-specificity `.nv-btn:disabled` rule would lose the cascade. The muted token then remains readable. Retain the disabled state and muted fill. | P2 |

The measurement uses the captured rendered pixels, not uncomposited CSS colours. Browser work is paused; computed-style and WebKit confirmation remain to be done when it resumes.

## Checked and correct

- Add shift at320,100/200%, both engines: all4 unchanged checker cells pass text floor and axe.
- Swap pending wording is “Sending…” and the captured label stays whole at320/200.

## Gaps

The full eight-width/four-text-size/two-engine/two-management-role matrix has not started. Browser work paused at the coordinator’s request so the candidate’s full suite and isolated load retries have uncontended CPU. Three complete Chromium Swap probe cases are saved; the interrupted case is not counted. Delete/Scheduling and both-engine rotation rechecks, the remaining normal-state five-area judgment, server-read failure/partial/paused states, successful receipts/submissions, large data, physical devices and screen readers remain unverified. This exact SHA has no zero exit verdict.
