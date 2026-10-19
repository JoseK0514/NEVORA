**Incomplete — no additional width/role finding verified (0 P0 / 0 P1 / 0 P2); overall exit not zero.** Exact source7679133.

## Status of earlier findings

- WR-WA-1: sampled large-text forms retain positive control/card widths instead of collapsing the main column.
- WR-WA-2: long Availability names show full measured height and the sampled filter controls wrap within the page.
- WR-WA-3: selected long values retain bounded controls in sampled prefilled Add shift and member forms; native select-face rendering remains part of the remaining recheck.

## Findings

No additional verified width/role finding.

## Checked and correct

- documentElement.scrollWidth equals viewport in all564 measured samples, with no zero-width card.
- Owner/Manager normal routes and Employee/Lead personal forms rendered without page errors during282 judgment visits.
- All60 role-navigation retries reach their expected Home, personal view or Shift requests. The initial errors were redirect timing in the probe.


## Gaps

This exact commit failed the exit gate on ST-WA-8. The full automated matrix was stopped after the 160-cell first batch; remaining widths and axe are not claimed complete. Normal-state judgment covered 282 visits / 564 samples at 320, 390, 844×390 and 1440 (Owner at 320/1440, WebKit spots at 390/1440), plus 32 held/aborted submissions, 16 filter cases and 200 role cases. All 60 initial redirect/navigation races pass on settled fresh-page retries. Large data, native keyboard and device checks are not claimed; read-failure/paused/server-only states remain gaps. No zero exit is claimed. New head 7651490 is queued for its own full matrix and five-area recheck.
