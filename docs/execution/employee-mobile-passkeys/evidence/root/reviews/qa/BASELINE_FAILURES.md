# Preserved baseline failure identities

All13 below reproduced both on baseline592d421225e8266a5079f2a1381dc3b4175b9635 and frozen candidate64063a2ac10f946f1268f325cd0de99555d87257. They remain failures.

## src/app/app/requests/hub/page.test.tsx

Final invocation/actual failure results: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-independent-qa/final-64063a2a-ten/01-page.test.tsx

- retains both request destinations for EMPLOYEE
- retains both request destinations for LEAD
- lists the person's own time off, waiting first, and never turns a failed read into no requests

## src/app/app/requests/page.test.tsx

Final invocation/actual failure results: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-independent-qa/final-64063a2a-ten/02-page.test.tsx

- marks a waiting request amber and an approval green, with a timeline
- names who decided a request and when, and never names anyone on a withdrawal

## src/app/app/requests/page.withdrawal-carry-forward.test.tsx

Final invocation/actual failure results: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-independent-qa/final-64063a2a-ten/03-page.withdrawal-carry-forward.test.tsx

- marks a waiting request amber and an approval green, with a timeline
- offers a confirmed withdrawal only for the current employee pending request
- keeps withdrawal inside its own request row, next to the facts and the waiting status

## src/lib/data/scheduling-inputs.test.ts

Final invocation/actual failure results: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-independent-qa/final-64063a2a-ten/05-scheduling-inputs.test.ts

- normal-based weekly submissions confirmation without changes persists submission metadata without inventing day overrides
- normal-based weekly submissions unavailable all week writes seven dated full-day exceptions
- normal-based weekly submissions changes only the selected date, preserving other overrides
- the final deadline guard uses the current clock after the lock wait
- retries a stale legacy conversion after locking and preserves another saved day's override
