**Not zero — source P1 WR-WC-25 remains; full exit evidence incomplete.** Exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. Fresh recheck confirms the dialog-label collapse and proves the phone flex and pending-label centering repair across all seven dialogs. A browser-only repair does not close the source finding or certify combined candidate UI.

## Earlier findings

WR-21 is fixed in prior exact-SHA evidence: color well 64×48px at 100%,64×96px at 200%, teal pixels present in both engines. WR-11,WR-13,WR-22,WR-23 and WR-24 remain under full recheck. WR-09 native-select truncation is decided.

## Findings

| ID | Screen / role / width | Measured defect | Evidence | Cause | Specific fix | Severity |
|---|---|---|---|---|---|---|
| WR-WC-25 | Break type Add/Archive and device Add/Replace; additionally WebKit Revoke; Owner;320/200 and WebKit Archive390/200 | Ten source cases have a 52px button containing an 88px label. Example Archive: button y 708–760, label y 690–778,18px outside each edge; final line enters Cancel's area. | [56-case measurements](evidence/dialog-proof.json), [Chromium Archive before](evidence/dialog-proof/chromium-320-200-Archive_Rest_break-before.png), [WebKit Revoke before](evidence/dialog-proof/webkit-320-200-Revoke_access_for_Fictional_payroll_clock-before.png) | `src/app/app/premium-wave-c.css:220`, `flex:1 1 0` collapses height in the phone column layout. | At max-width 599px, the same selector must use `flex:0 0 auto`. Two-line labels then get 112px buttons; one-line large-text labels and Cancel get 68px;100% stays 52px. Exact proved rule below. | P1 |

Exact browser-only rule tested:

```css
@media (max-width:599px) {
  html body .app-shell.nevora-portal.nevora-portal .page-frame .wc-page.wc-page .wc-dialog .wc-actions > .nv-btn {
    flex:0 0 auto;
  }
  html body .app-shell.nevora-portal.nevora-portal .page-frame .wc-page.wc-page .wc-dialog .wc-swap > span {
    align-self:center;
  }
}
```

The pending-label completion stays within this finding. With flex alone, a 112px button reserves an 88px swap row, leaving shorter Saving… text with 13px top and 58px bottom insets. The coordinator authorized a separate limited [centering proof](evidence/dialog-center-proof.json): the exact dialog-scoped `align-self:center` rule above changes those insets to 35px/36px. [Before](evidence/dialog-center-proof/chromium-320-200-Add_break_type-pending-flex.png) and [after](evidence/dialog-center-proof/chromium-320-200-Add_break_type-pending-center.png) show the same 112px button. The rule is not counted again under Alignment.

## Checked and correct

- **56 combinations / 280 records:** all seven dialogs, 320/390, 100/200%,Chromium and WebKit. Add/Edit/Archive break type;Add/Rename/Replace/Revoke device.
- Exact flex rule: **zero label-box overflow** in 56 ready, 56 pending and 56 blocked-failure cases. Source has 10 overflow cases before it. Heights after proof: 52/68/112px, according to text size and wrapping.
- **56/56** Escape dismissals return focus to the exact opener; every double activation produces one intercepted request. No request reaches the server.
- [Centering completion summary](evidence/dialog-center-summary.json): **28 cases / 168 records**, all seven dialogs at 320/390 and 200% in both engines. Ready and pending button bounds change by **0px**; all pending primary glyph centers are within **0.5px** of the button center. All ready, pending and blocked-failure labels/text remain within their buttons. Every case returns focus to its opener and sends exactly one held, locally aborted POST despite double activation. No page or hydration errors.
- [Centering-run closure](evidence/runtime-closure-center.json): owned preview and PostgreSQL stopped; exact source and mirror verified clean. The original flex-only evidence and closure remain unchanged.
- [Unchanged checker initial result](evidence/checks-initial.json): 26/26 samples, all 13 Owner routes, 320/100, both engines, axe; no document overflow or undersized targets.

## Gaps

Remaining widths/roles/back and long-name variants, full matrix and earlier WR IDs remain incomplete. At the initial candidate freeze, candidate-only commit `7c79368` in `64f15e6` staged the flex rule; the coordinator owns its subsequent centering amendment and final commit ledger. Wave C components remain unmerged. Combined recheck follows an eligible merge. Desktop dialog rows remain outside this phone-scoped proof.

Zero open P0–P2 in this area: **no**.
