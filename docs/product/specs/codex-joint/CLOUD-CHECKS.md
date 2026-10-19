# Cloud screen checks — October 19, 2026

Updated 2026-10-19T18:18:54.166Z. branch workers starting. **Partial evidence until every branch is marked complete.**

Cloud owner: Codex (`codex/premium-backend`). Fictional owned loopback PostgreSQL 17.11; Node 24.19.0; isolated Playwright Chromium/WebKit. No UI edits, merges or deployment. Exact source snapshots are unchanged.

## Coordination with Setup NEVORA

Jose requested coordination with the separate Setup NEVORA chat. This session cannot open another ChatGPT conversation. Shared handoffs read: HANDOFF.md, README.md, CODEX-LOCAL-PROMPT.md, SNAPSHOTS-2026-10-19.md and LOAD-2026-10-19.md. This report is the cloud handoff; acknowledgement by the other chat is unverified. Existing Profile and inbox-count backend fixes remain separate from the Claude snapshots.

## Matrix and evidence

`checks.mjs` comes unchanged from the tools checkout at `2ab131ba004f3f26cc2b21ad95c90a6e0645259b`. Each preview has one checker at a time. Full widths: `320,360,390,430,844x390,768,1024,1440`; text: `100,125,150,200`; browsers: Chromium/WebKit. The second axe pass uses `390,1440`, text `100`. The preload blocks external HTTP/WebSocket requests and detects redirects so Home is not counted as another page.

The original tools seed runs first. Supplemental fictional fixtures add one published future shift to each payroll account (otherwise Swap/Unable to work redirect), publish an update after ON/BREAK are seeded, and produce real TEMPLATE_UNAVAILABLE copy receipts for Manager/Owner. Exact routes, role exclusions and IDs are in route-inventory.json. Copy receipts therefore cover the unavailable-template result, not a successful copy workflow.

Raw results are unchanged JSON from PREVIEW_OUT/checks; batch logs preserve the original detail lines. Main counts use one final observation per cell per pass; initial timeout/server candidates are replaced only by their one identical retry, whose raw file is also retained. Separate initial/retry tables preserve both. A timeout or 5xx alone does not prove load was the cause.

Host packages were extracted from authenticated Debian packages into a user-owned folder. WebKit’s bundle requires copies of those libraries in its own sys/lib. Its ldconfig-only host precheck cannot see user-installed GLES, so that precheck is skipped after direct dlopen and actual Chromium/WebKit rendering checks; browser execution itself is required.

## Branch status

| Branch | Source commit | Status | Final passed | Final failed | Observed / planned |
|---|---|---|---:|---:|---:|
| claude/premium-phase-1 | `51f731d399e9b94306f5d98556151933efe2ac7a` | Running matrix | 46 | 2 | 48 / 12580 |
| claude/p35-profile-6cdee8 | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` | Running matrix | 36 | 20 | 56 / 12716 |
| claude/p35-wave-a-1283c8 | `157e25f7dab7a21542f54722746b237dc7b52afc` | Queued; exact source/runtime SHA will be checked before the first batch | 0 | 0 | 0 / 12580 |
| claude/p35-wave-b-808dfd | `b0e051a951642ff34692604147fcd76ba805a3e7` | Queued; exact source/runtime SHA will be checked before the first batch | 0 | 0 | 0 / 12580 |
| claude/p35-wave-c-93e13c | `e3a99fe7b6cda3c3b8049ff62f0de376d710b58f` | Queued; exact source/runtime SHA will be checked before the first batch | 0 | 0 | 0 / 12580 |
| claude/p4-desktop-240fe0 | `578748d705b941d14f37c0b01bfcfb1332343e31` | Queued; exact source/runtime SHA will be checked before the first batch | 0 | 0 | 0 / pending inventory |
| claude/premium-phase-1 (large data) | `672232896b66a520d39939c1ae3e0227c8b1dc90` | Running matrix | 0 | 0 | 0 / 952 |

## Initial Phase 1 smoke checks

Source 2ab131ba004f3f26cc2b21ad95c90a6e0645259b, before the supplemental fixture setup. **2/16 passed; 14 failed.** These diagnostic runs are separate from the full matrix counts above. Raw JSON and console detail logs: [bootstrap evidence](cloud-checks/claude/premium-phase-1/bootstrap/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| /app | AUDIT-E | 1440 | 100 | chromium | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL chromium AUDIT-E 1440 100% /app small=small. «Powered by VELANI LLC» 10px; p.employee-home-reviewed-module__k4entG__currentNote «Clock status below shows wheth» 13px; p.employee-home-reviewed-module__k4entG__zone.employee-home-reviewed-m «Times in Puerto Rico time» 12px; p.employee-time-empty «No open time entry was recorde» 13px |
| /app | AUDIT-E | 1440 | 100 | webkit | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL webkit AUDIT-E 1440 100% /app small=small. «Powered by VELANI LLC» 10px; p.employee-home-reviewed-module__k4entG__currentNote «Clock status below shows wheth» 13px; p.employee-home-reviewed-module__k4entG__zone.employee-home-reviewed-m «Times in Puerto Rico time» 12px; p.employee-time-empty «No open time entry was recorde» 13px |
| /app | AUDIT-M | 390 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 390 100% /app errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 390 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 390 100% /app/inbox errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 390 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 390 100% /app/employees errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app | AUDIT-M | 1440 | 100 | chromium | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL chromium AUDIT-M 1440 100% /app small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app | AUDIT-M | 1440 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 1440 100% /app small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 1440 | 100 | chromium | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL chromium AUDIT-M 1440 100% /app/inbox small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 1440 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 1440 100% /app/inbox small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 1440 | 100 | chromium | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL chromium AUDIT-M 1440 100% /app/employees small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 1440 | 100 | chromium | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL chromium AUDIT-M 1440 100% /app/employees small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app | AUDIT-M | 390 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 390 100% /app errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 390 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 390 100% /app/inbox errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 390 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 390 100% /app/employees errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app | AUDIT-M | 1440 | 100 | webkit | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL webkit AUDIT-M 1440 100% /app small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app | AUDIT-M | 1440 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 1440 100% /app small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 1440 | 100 | webkit | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL webkit AUDIT-M 1440 100% /app/inbox small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/inbox | AUDIT-M | 1440 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 1440 100% /app/inbox small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 1440 | 100 | webkit | small text | UI — claude/p4-desktop-240fe0 (desktop); shared kit/shell: claude/premium-phase-1 | FAIL webkit AUDIT-M 1440 100% /app/employees small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees | AUDIT-M | 1440 | 100 | webkit | error | backend — endpoint already fixed on codex/premium-backend, 8f341e8; absent from this immutable Claude snapshot | FAIL webkit AUDIT-M 1440 100% /app/employees small=h2.sidebar-group-label «Plan» 12px; h2.sidebar-group-label «Team» 12px; h2.sidebar-group-label «Time & Pay» 12px; h2.sidebar-group-label «Workspace» 12px errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |

## claude/premium-phase-1

Source: `51f731d399e9b94306f5d98556151933efe2ac7a`. Running matrix. 46 passed; 2 failed. Completed checker batches: 3. Raw evidence: [cloud-checks/claude/premium-phase-1/](cloud-checks/claude/premium-phase-1/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| /app/exchange/callout?shiftId=audit-next-0-1 | AUDIT-E | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium AUDIT-E 390 100% /app/exchange/callout?shiftId=audit-next-0-1 small=span. «Main Office» 14px; span. «Times in Puerto Rico time» 12px; span. «Customer Support · No designat» 12px; strong. «This shift is still assigned t» 13px |
| /app/exchange/swap?sourceShiftId=audit-next-0-1 | AUDIT-E | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium AUDIT-E 390 100% /app/exchange/swap?sourceShiftId=audit-next-0-1 small=span. «Your shift» 13px; span. «Monday, Oct 26, 2026 · Main Of» 12px; summary. «How a swap works» 14px |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p35-profile-6cdee8

Source: `be4a232a1e6a26b58314ff549f88e5a8a79e82c6`. Running matrix. 36 passed; 20 failed. Completed checker batches: 5. Raw evidence: [cloud-checks/claude/p35-profile-6cdee8/](cloud-checks/claude/p35-profile-6cdee8/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| /app/account-recovery | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-c-93e13c | FAIL chromium QAOWNER 390 100% /app/account-recovery small=summary. «What changes after a reset?» 14px |
| /app/availability | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 100% /app/availability small=strong. «Availability deadline» 13px; span. «Set a cutoff in the schedule t» 12px; span. «All8» 12px; span. «Missing8» 12px |
| /app/clocker-recovery | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-c-93e13c | FAIL chromium QAOWNER 390 100% /app/clocker-recovery small=summary. «Can others still use the table» 13px |
| /app/availability | QAOWNER | 390 | 125 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 125% /app/availability small=span.status-pill.neutral «Not submitted» 13.75px |
| /app/profile | QAOWNER | 390 | 100 | chromium | layout shift | UI — claude/p35-profile-6cdee8 (management) / claude/premium-phase-1 (Employee/Lead) | FAIL chromium QAOWNER 390 100% /app/profile cls=0.0261 errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | QAOWNER | 390 | 100 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium QAOWNER 390 100% /app/profile cls=0.0261 errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | QAOWNER | 390 | 125 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium QAOWNER 390 125% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | QAOWNER | 390 | 150 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium QAOWNER 390 150% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | QAOWNER | 390 | 200 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium QAOWNER 390 200% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | AUDIT-M | 390 | 100 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium AUDIT-M 390 100% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | AUDIT-M | 390 | 125 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium AUDIT-M 390 125% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | AUDIT-M | 390 | 150 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium AUDIT-M 390 150% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/profile | AUDIT-M | 390 | 200 | chromium | error | backend — Profile endpoints already fixed on codex/premium-backend, 22c4320; absent from this snapshot | FAIL chromium AUDIT-M 390 200% /app/profile errors=console: Failed to load resource: the server responded with a status of 404 (Not Found) |
| /app/employees/AUDIT-LONG | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 100% /app/employees/AUDIT-LONG small=span.profile-status.active «Active» 12px; span. «Employee ID» 12px; strong. «AUDIT-LONG» 13px; span.nevora-field-label «Access role» 12px |
| /app/employees/AUDIT-LONG/clocker-pin | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 100% /app/employees/AUDIT-LONG/clocker-pin small=span. «Employee ID: AUDIT-LONG» 13px; span.clocker-pin-module__hQ40jq__badge.clocker-pin-module__hQ40jq__con «Active employee» 12px; span. «4 digits» 12px; span. «Enter it again» 12px |
| /app/employees/new | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 100% /app/employees/new small=span. «Optional» 12px; span.nevora-field-label «Access role» 13px; span.nevora-field-hint «App permissions are separate f» 12px; span.nevora-field-label «Primary location» 13px |
| /app/employees/AUDIT-LONG/clocker-pin | QAOWNER | 390 | 125 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 125% /app/employees/AUDIT-LONG/clocker-pin small=span. «Employee ID: AUDIT-LONG» 13px; span.clocker-pin-module__hQ40jq__badge.clocker-pin-module__hQ40jq__con «Active employee» 12px; span. «4 digits» 12px; span. «Enter it again» 12px |
| /app/employees/AUDIT-LONG/clocker-pin | QAOWNER | 390 | 150 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 150% /app/employees/AUDIT-LONG/clocker-pin small=span. «Employee ID: AUDIT-LONG» 13px; span.clocker-pin-module__hQ40jq__badge.clocker-pin-module__hQ40jq__con «Active employee» 12px; span. «4 digits» 12px; span. «Enter it again» 12px |
| /app/employees/AUDIT-LONG/clocker-pin | QAOWNER | 390 | 200 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 200% /app/employees/AUDIT-LONG/clocker-pin small=span. «Employee ID: AUDIT-LONG» 13px; span.clocker-pin-module__hQ40jq__badge.clocker-pin-module__hQ40jq__con «Active employee» 12px; span. «4 digits» 12px; span. «Enter it again» 12px |
| /app/exchange | QAOWNER | 390 | 100 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 100% /app/exchange small=span.exchange-count «0 requests» 11px; span. «Requests needing a management » 13px |
| /app/exchange | QAOWNER | 390 | 125 | chromium | small text | UI — claude/p35-wave-a-1283c8 | FAIL chromium QAOWNER 390 125% /app/exchange small=span.exchange-count «0 requests» 13.75px |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p35-wave-a-1283c8

Source: `157e25f7dab7a21542f54722746b237dc7b52afc`. Queued; exact source/runtime SHA will be checked before the first batch. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/p35-wave-a-1283c8/](cloud-checks/claude/p35-wave-a-1283c8/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p35-wave-b-808dfd

Source: `b0e051a951642ff34692604147fcd76ba805a3e7`. Queued; exact source/runtime SHA will be checked before the first batch. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/p35-wave-b-808dfd/](cloud-checks/claude/p35-wave-b-808dfd/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p35-wave-c-93e13c

Source: `e3a99fe7b6cda3c3b8049ff62f0de376d710b58f`. Queued; exact source/runtime SHA will be checked before the first batch. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/p35-wave-c-93e13c/](cloud-checks/claude/p35-wave-c-93e13c/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p4-desktop-240fe0

Source: `578748d705b941d14f37c0b01bfcfb1332343e31`. Queued; exact source/runtime SHA will be checked before the first batch. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/p4-desktop-240fe0/](cloud-checks/claude/p4-desktop-240fe0/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/premium-phase-1 (large data)

Source: `672232896b66a520d39939c1ae3e0227c8b1dc90`. Running matrix. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/premium-phase-1/large/](cloud-checks/claude/premium-phase-1/large/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## Remaining gates

Large-data premium-phase-1 is a separate preview and remains pending unless its own evidence is present. Load timings are browser measurements in local development mode, not hosted capacity certification. Build, full Vitest, TypeScript and lint on the merged release candidate remain pending Jose’s merge notice. No release approval is implied.
