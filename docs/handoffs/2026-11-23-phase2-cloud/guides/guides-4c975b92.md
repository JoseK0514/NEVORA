# Guide build on 4c975b92 (shared branch, SCRUM-83 audited UI)

`guides-4c975b92.bundle` holds one commit, `f6403f758189fddc648b52eaa02c898a96d2b12d` (branch `guides-4c97`), whose parent is `4c975b92`:
the six PDFs and `manifest.json` only (`--date 2026-11-27`).

    git fetch docs/handoffs/2026-11-23-phase2-cloud/guides/guides-4c975b92.bundle guides-4c97

Application hash `cf90ce9f6401d60205e10acc4b4deb1af495967ec3287d2a7f65511c5f8bbbd8`; `check-manuals` verifies all six;
manual-publication and manual-bundle 57/57; pages unchanged (owner 8, manager-lead 4, employee 3, rondo 5, developer 7,
operations 7). Against `9e2beede`: extracted text identical apart from the markers; rendered pages differ only in the
page-1 hash lines and the footer short SHA.

## Quoted-text check
- Every bold label in the six guides (248) still exists in `src` at 4c975b92; none was present at 9e2beede and gone now.
- The 54 English strings the merge removed from `src` were matched against all guide text: only "Check breaks" (Owner,
  Christmas bonus) and "POST" (Developer) occur, and both are unchanged in the app ("Check breaks" only gained a
  "Missing shift time" sibling reason). "Marked as sent" and the time-off decision sentence aren't quoted by any guide.
- No guide text was changed.

## Not yet mentioned (proposals, not written)
- Owner: Settings → **Activity log** (Owner only: schedule published/edited, Manager access assigned/removed, employee
  activated/deactivated, wage changed; **Older changes** / **Newer changes**).
- Owner: deactivating a location (**Deactivate {name}?**; the Clocker link stops working; blocked until shifts, posted
  open shifts, open time, corrections and shift requests are reviewed).
- Owner and Manager: **Delete my account** now exists for Owners and Managers too (the Employee guide already covers it).
