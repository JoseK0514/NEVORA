# Rondo business evidence — B2 UI plan and contract gaps (Claude, Nov 16, 2026)

Read-only review of Codex's committed contract at `cf4b0a76` in
`/Users/josek0514/.codex/worktrees/nevora-rondo-combined-20261116/NEVORA-UI-READINESS`:
`docs/handoffs/2026-11-16-rondo-business-evidence-ui-contract.md`, `business/contracts.ts`,
`parse.ts`, `csv.ts`, `money.ts`, `metrics.ts`, `model-contracts.ts`, `http.server.ts`,
`service.server.ts`, `tools.server.ts`, `decision.ts` and the client `public-response.ts`.
I didn't edit Codex's worktree, backend or schema. Nothing is pushed or cherry-picked.

`b92e1bbc` (weekly and knowledge B2 UI) is an ancestor of `cf4b0a76`. The only UI-file change since
then is Codex's one-line `public-response.ts` regex from assembly.

## Contract gaps (report before any backend change)

1. **Blocking, UI side (mine): answers that cite business evidence fail to parse.**
   `readBusinessTool` puts each citation into the answer's `sources` with
   `href: /api/owner/advisor/business/sources/<uuid>/versions/<uuid>`. The client `sources()`
   allowlist in `src/components/owner-advisor/public-response.ts` doesn't accept that shape, so
   `parseAnswer` throws and the Owner sees "answer unavailable" for every business answer.
   `parseAnswer` also doesn't validate `businessEvidence` or reject `businessInspectionRefs`.
   The fix is mine: accept `isBusinessCitationHref`, validate the typed `businessEvidence`
   fields, and reject any answer carrying `businessInspectionRefs`, the same way the weekly
   private references are rejected. It needs the business modules, so it has to be built on
   Codex's source, not on my `b92e1bbc` checkout.
   **Fixed (Jose approved, same day):** local commit `19295ab00352775c08431a021b4db5ca00e1b218` on
   branch `claude-business-citations` in this repository, parent Codex `8e82dbfe` (the corrected base,
   including Codex's posted inflow/outflow, sales/refund groups and finding `window`/`boundaryAt`).
   Files: `public-response.ts` (link accepted through `isBusinessCitationHref`;
   `businessInspectionRefs` and `businessInspectionRef` rejected), new `public-business-evidence.ts`
   (exact-field validation), new `public-response.business.test.ts` (36 tests built from the backend's
   own `calculateFinance`/`calculateSales`). Before the fix, 3 of the 36 fail on `8e82dbfe`; with the
   fix, all 36 pass. Full `tsc --noEmit` is clean and `eslint src/components/owner-advisor` is clean.
   `vitest src/lib/owner-advisor src/components`: 2,616 of 2,617 pass. The one failure,
   `employee-home-actions.test.tsx` `late_former_authority_reply_discarded`, ran 5.8s under load,
   passes when rerun alone, and is in a file this fix doesn't touch.
   Not pushed and not merged into shared Development. There's no visual change, and the evidence
   card is still part of the plan below.
   **Local combined unit check against Codex's final `cb2f2014`:** between `8e82dbfe` and `cb2f2014`
   the wire types, contract, UI files, test fixture and `package.json` are byte-identical; only the
   finance runtime (`185bb090`) and docs changed. `19295ab0` applied cleanly onto `cb2f2014` in a
   temporary detached worktree, with no commit. There, `vitest src/components/owner-advisor
   src/lib/owner-advisor` passed 703 of 703 (62 files), `tsc --noEmit` passed, and `eslint` passed.
   This is unit evidence only. It isn't Codex's backend or browser qualification, and it doesn't make
   a business-answer UI acceptance claim. The temporary worktree was removed.
   As of `cb2f2014`, Codex's backend handoff doesn't answer questions 2–9 below.
2. **Location names.** The catalog has `activeLocationIds` only. Sales rows, CSV constants,
   coverage-map cells, `EXCLUSIVE_LOCATION` ownership and `SELECTED` scope all need the Owner to pick
   a location by name. Either the catalog adds `{ id, name }`, or the route's server component
   reads names through the existing location data module. Codex to choose; the UI never shows a
   bare internal ID.
3. **Read-receipt expiry.** The full read returns a five-minute `readReceiptId` but no expiry time
   (`validForMs` is the 15-second response stamp). The UI needs `readReceiptExpiresAt`, or a
   confirmation that it may compute observedAt + 5 min, to disable Publish and ask for a fresh read
   in time. Otherwise publication fails late with a bare `conflict`.
4. **`expectedRevision` per command.** The types don't say which revision each write expects:
   source `revision`, catalog `revision`, `evidenceRevision` or `mapRevision`. They also don't
   say which `digest` applies. From the store, withdraw and delete use the source `scopeDigest`,
   and publish and discard use the version or map digest. Please confirm the exact pairing for all
   six writes, and the value for a new source (staged with `sourceId: null` and revision 0).
5. **Closed code lists for copy.** Finding codes (e.g. `RECONCILIATION_DIFFERENCE`,
   `PENDING_CASH_EXCLUDED`, `UNCONFIRMED_OBLIGATION`), qualifiers (e.g.
   `OWNER_DECLARED_ACCOUNT_PERIMETER`, `PARTIAL_NOT_PUBLISHABLE`,
   `SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED`), validation `detail.code`/`detail.field` values and
   the error-envelope `code` set are plain strings. The UI needs exported `as const` arrays in a
   client-safe module, so every code has reviewed en/es copy and an unknown code fails closed.
6. **Error envelope type.** `{ state: 'error', code, detail? }` isn't in `contracts.ts`. Please
   export it with its `code` union (forbidden, invalid, conflict, limit, unavailable, cancelled,
   disabled, busy?) and the `detail` shape.
7. **Pending-operation storage.** The contract says to keep the original requestId *and exact
   payload* after an uncertain write. My proposal: keep the payload in memory only, so financial
   rows never go into browser storage. Keep `{ operationId, op, sourceId?, versionId? }` in
   `sessionStorage`, so `check_source_operation` still works after a reload. An exact-payload retry
   is then possible only while the page stays open. Codex, please confirm this meets the recovery
   contract.
8. **Route and flags.** No route is named. My proposal: `/app/ai-manager/business` beside knowledge
   and weekly. Its server component reads `readFeatureFlags(process.env)` for `ownerAdvisor`,
   `ownerAdvisorBusinessImports` and `ownerAdvisorBusinessRetrieval`, the same assembly pattern Codex
   used for weekly. Please confirm the route and who edits `page.tsx` and the Rondo nav entry.
9. **Acknowledgement meaning.** The acknowledgement reads "`acknowledged: true` after the complete
   full read". Please confirm what the Owner is attesting, so the checkbox copy matches it exactly:
   reviewed all rows and findings, and accepts that this is an Owner claim, not verification.
   Also confirm that up to 1,000 rows may be shown in a paged or scrolling table, as long as every
   row is reachable before Publish.

## B2 UI plan (after the gaps above are answered)

Everything is built from existing B2 parts: Quiet page, band title, `c-card` rows,
knowledge-style review screen, weekly-style receipt and recovery rows, `--b-*` tokens and Phosphor
icons. There's no new look. Work happens in a new isolated worktree of mine based on `cf4b0a76` (or
Codex's later qualified commit), stays local and unpushed, and is handed back as an exact commit for
Codex's task-8 qualification.

1. **Answer evidence (Rondo chat).** Accept business citations (gap 1). Add one compact evidence
   card per `businessEvidence` item, built only from typed fields:
   - domain, window in business time, location scope, primary perimeter or source subtotal,
     current or historical, observed and expiry times;
   - unavailable, partial and expired states named exactly, never shown as zero;
   - each money figure through `formatBusinessMinor`, with the required labels ("not cash", "not
     profit", "not tax due");
   - a citation link to the inert text view.
2. **Business evidence page** at `/app/ai-manager/business`:
   - **Sources library:** each source shows name, domain, currency, active, withdrawn or deleted,
     and current published window. Drafts are shown only to their initiator as publishable
     (`publishEligible`).
   - **Import:** JSON, or CSV with an explicit column mapping. There's no inferred column, date or
     currency. The amount unit is chosen explicitly, and the location is picked by name.
     Validation errors show the safe code, field and row/line only.
   - **Full review:** every row, findings and qualifiers, digest and revision. Publish stays
     disabled until the full read is current, the read receipt is unexpired and the Owner gives the
     explicit acknowledgement. Discard is a separate explicit action. Reconciliation mismatches are
     labelled as findings, not cash clearance.
   - **Coverage map:** accounts (company shared or one location) and cells (PRIMARY or
     CORROBORATING, window, currency), with the same stage → full read → publish steps. It states
     plainly that a declared perimeter can't prove other accounts don't exist, and that shared
     cash isn't split across locations.
   - **Query panel:** finance or sales, window, location scope, perimeter or source, current or
     historical. Finance starts with `scenario: null`, and a scenario only selects returned record
     IDs.
   - **Withdraw and delete:** delete shows the dependent maps and the irreversible local erasure
     before the explicit acknowledgement. It doesn't promise chat or provider erasure.
   - **Recovery:** an uncertain write shows "Not confirmed yet" with Check again
     (`check_source_operation`, fresh requestId, original operationId). It never mints a
     replacement. With both flags off, the page shows only this recovery row.
   - **States:** loading, error, empty, partial, stale, ready, full review and recovery. Keyboard,
     focus, mobile at 320 and 390, and reduced motion are covered.
3. **Evidence:** fictional data on the local harness with mocked or local APIs, captured at
   320, 390, 768, 1024 and 1440, with raw axe kept. Clearly labelled as not Codex's real API
   qualification.

There's no connector UI that claims authentication or refresh. There's no payment, order,
notification, schedule or publication action from Rondo. The 50 real-model scores stay null.
