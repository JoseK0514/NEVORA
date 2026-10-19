**Not zero — source P1 WR-WC-25 remains; full exit evidence incomplete.** Exact `5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8`. Fresh recheck confirms the dialog-label collapse and proves the proposed phone flex repair across all seven dialogs. A browser-only repair does not close the source finding or certify combined candidate UI.

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
}
```

One pending-label detail remains within this same finding's state recheck: after the flex repair, a 112px button reserves an 88px swap row, but the shorter Saving… text has 13px top and 58px bottom insets. See [pending proof](evidence/dialog-proof/chromium-320-200-Add_break_type-pending-proof.png). `align-self:center` on `.wc-swap > span` is the proposed completion for centered pending text; that extra rule was **not browser-tested** because the coordinator froze further cases for the final candidate gate. It is not counted again under Alignment.

## Checked and correct

- **56 combinations / 280 records:** all seven dialogs,320/390,100/200%,Chromium and WebKit. Add/Edit/Archive break type;Add/Rename/Replace/Revoke device.
- Exact flex rule: **zero label-box overflow** in 56 ready,56 pending and 56 blocked-failure cases. Source has 10 overflow cases before it. Heights after proof: 52/68/112px, according to text size and wrapping.
- **56/56** Escape dismissals return focus to the exact opener; every double activation produces one intercepted request. No request reaches the server.
- [Unchanged checker initial result](evidence/checks-initial.json): 26/26 samples, all 13 Owner routes,320/100,both engines,axe; no document overflow or undersized targets.

## Gaps

Remaining widths/roles/back and long-name variants,full matrix and earlier WR IDs remain incomplete. Candidate has not merged the Wave C components; future candidate overrides require combined recheck after an eligible merge. Desktop dialog rows and pending-label centering still need their specific checks.

Zero open P0–P2 in this area: **no**.
