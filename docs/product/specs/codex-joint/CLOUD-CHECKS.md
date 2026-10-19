# Cloud screen checks — October 19, 2026

Updated 2026-10-19T17:55:11.698Z. branch workers starting. **Partial evidence until every branch is marked complete.**

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
| claude/premium-phase-1 | `62cd0338176020bfbb692ee75438c5642197b9f6` | Queued after moving previews off memory-backed /tmp | 0 | 0 | 0 / 12580 |
| claude/p35-profile-6cdee8 | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` | Queued after moving previews off memory-backed /tmp | 0 | 0 | 0 / pending inventory |
| claude/p35-wave-a-1283c8 | Pending refresh | Queued | — | — | — |
| claude/p35-wave-b-808dfd | Pending refresh | Queued | — | — | — |
| claude/p35-wave-c-93e13c | Pending refresh | Queued | — | — | — |
| claude/p4-desktop-240fe0 | Pending refresh | Queued | — | — | — |
| claude/premium-phase-1 (large data) | `62cd0338176020bfbb692ee75438c5642197b9f6` | Queued after moving previews off memory-backed /tmp | 0 | 0 | 0 / pending inventory |

## claude/premium-phase-1

Source: `62cd0338176020bfbb692ee75438c5642197b9f6`. Queued after moving previews off memory-backed /tmp. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/premium-phase-1/](cloud-checks/claude/premium-phase-1/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/p35-profile-6cdee8

Source: `be4a232a1e6a26b58314ff549f88e5a8a79e82c6`. Queued after moving previews off memory-backed /tmp. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/p35-profile-6cdee8/](cloud-checks/claude/p35-profile-6cdee8/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## claude/premium-phase-1 (large data)

Source: `62cd0338176020bfbb692ee75438c5642197b9f6`. Queued after moving previews off memory-backed /tmp. 0 passed; 0 failed. Completed checker batches: 0. Raw evidence: [cloud-checks/claude/premium-phase-1/large/](cloud-checks/claude/premium-phase-1/large/).

| Route | Account | Width | Text | Browser | Check | Owner / disposition | checks.mjs detail line |
|---|---|---|---:|---|---|---|---|
| — | — | — | — | — | — | No failed cells recorded yet | — |

### Timeout and server observations (separate from UI findings)

| Route | Account | Width | Text | Browser | Initial detail | Retry outcome |
|---|---|---|---:|---|---|---|
| — | — | — | — | — | None recorded | — |

## Remaining gates

Large-data premium-phase-1 is a separate preview and remains pending unless its own evidence is present. Load timings are browser measurements in local development mode, not hosted capacity certification. Build, full Vitest, TypeScript and lint on the merged release candidate remain pending Jose’s merge notice. No release approval is implied.
