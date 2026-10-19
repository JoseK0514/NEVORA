# Supplementary Compose authorization observations

Target remains `cd764f614be8ca5b5215be19d46e07cf968638d7`. This is static preparation requested by root after Phase3's source audit. No application file, frozen 3008 checker job ID, prior-ID disposition, pass count or original criterion changes. Runtime, browser and tests remain held.

Mapping `WB-SUP-AUTH-01` registers `exit-wb-compose-context-auth` and `exit-wb-compose-edit-auth` outside the frozen checker list. Existing IS-B13 is the prior authorization/copy scope (source interaction-states.md:29,146,199,222,239); IS-B12 is the existing user-initiated read-retry focus scope (:198). The new 403 copy observation is supplementary to those scopes and has no independently assigned defect/severity until measured. Do not merge it into the separate list `IS-RC-UPDATES-AUTH-01` merely because both involve 401/403.

| Registration | Source endpoint | Accounts | Each sequence | Cells, both engines, one motion |
| --- | --- | --- | --- | ---: |
| `exit-wb-compose-context-auth` | `GET /api/<manager|employee>/communications/context` | QAOWNER, AUDIT-E | Initial401/403; real Try again held; same denial; real Try again fresh authorized read | 16 |
| `exit-wb-compose-edit-auth` | `GET /api/manager/communications/<initial owned publication>` | QAOWNER | Initial401/403 on the edit read after a real context read; same held/denied/fresh retry sequence | 8 |

Each runs at390×844/100% and320×844/200%, Chromium/WebKit, ordinary/reduced motion:24 cases for one motion,48 added cases across both. Prepared manual count becomes324 (previous276+48). All cases are unexecuted. Full other auth/states, role access and five-area judgment remain mandatory.

Primary static binding: communication-compose.tsx126/128 rewrites unauthorized results without retaining httpStatus; :135/:144 renders access_denied as “Your session ended”. Client communicationRequest preserves httpStatus (:13) and parser distinguishes session_ended (:18). Detail's wrapper preserves both reasons (:146). This establishes a browser measurement obligation, not an observed user-facing failure or closure.

Record actual settled copy, real recovery href/visibility, passive initial active element, explicitly focused initiating Try again, held/denied focus and duplicate-read count, fresh authorized first-field focus, geometry and crops. A403 must not falsely assert an ended session. A401 must expose sign-in recovery. No exact alternative wording is imposed. Known absent focus behavior is recorded as a completed negative assertion after settled UI; missing initial publication/authorized response or transport failure is a genuine setup gap.

No browser publish/action reaches the app. Only matching GET responses are denied/held locally; final recovery continues the actual fresh authorized GET. Existing authority is compared only in memory and represented by its hash; request evidence uses gate.summary(). All business writes remain blocked by the common driver.
