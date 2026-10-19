# IS-B12 completion scope — static proposal

Base candidate56570fd0fc5e23503dbb50550af9dfcd965861ec; ready port368e98a18c16d47df04a93f2bea560843e461e0e. No app tree changed; no tests, previews or browser executed under the runtime hold.

Primary report: `docs/product/specs/p35-wave-b/inspection/interaction-states.md:198` at frozen9bd source. It explicitly names: Check status pressed removes notice while lookup runs; successful Try again on Payroll settings leaves body focus; and401 on Acknowledge/Withdraw leaves body focus. Earlier rows28/145 establish initiating-control retention. Prior candidate21e603b covered successful parent detail/Compose reads and Company save, rather than these remaining transitions.

- Recovery controller keeps the existing notice during a request for the same retained unknown operation; command, operationId, authority and generation remain unchanged. Detail Check status and Compose recovery controls remain mounted, use aria-disabled, and retain controller/UI duplicate guards. Detail uses existing PendingLabel for the Checking label.
- Payroll retry uses an actual ready toolbar or Company defaults/first panel heading. Existing focusAfterRetry still suppresses its handoff if the reader moves away.
- Detail records only the pressed DOM control and whether focus moved. The signed-out transition focuses/reveals the new Sign in only for a foreground user-initiated action whose focus did not move elsewhere. It stores no private message content and never initiates navigation or authentication.

No independent closure: both-engine held lookup, successful Settings retry,401 ACK/Withdraw plus moved-on controls remain mandatory after freeze. Patch does not claim all historic IS-B12 subcases are closed; retention of prior Rules/remove/show-everyone fixes remains in the review ledger.
