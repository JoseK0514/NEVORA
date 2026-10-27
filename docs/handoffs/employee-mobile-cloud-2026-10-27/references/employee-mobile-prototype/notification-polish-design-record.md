# Notification row polish — design comparison

Recorded 2026-10-26. This bounded pass substitutes for the unavailable shipped Impeccable documenter. It applies the installed `impeccable/reference/document.md` to an ordinary refinement of the existing Employee mobile contract. Only this report was written by this pass; source, root/Employee design records and concurrent work were preserved.

Deliverable: `index.html`, independently hashed SHA-256 `77e32e914510996abb774acb06a37b307981b28748754e51bb7716fbe8695acc`. Baseline: `d3ee3f1a98a6ef1e386658aabf4bcb72cb50ee8bdbcb0b1e761beb33d9e32a76`.

Read the Employee AGENTS.md, PRODUCT.md, DESIGN.md, both local design metadata files, package configuration, shared primitives, current three-file diff and captured baseline. The clean teal direction remains authoritative; no new visual identity or token extraction is needed.

The source diff is confined to `Notifications.tsx`, `Communications.css` and an optional `Row.className` hook in `ui.tsx`. The source icon joins the title row; title and timestamp share a column. A full-width footer separates the existing warning/status at the left from the existing next action and one arrow at the right. The old outer chevron is hidden. Enlarged text can place footer contents on separate lines. The scoped inset focus outline stays inside the clipping card.

Row, Status and Icon remain live shared components. Each notification remains one native button, with no nested control; the action text is its visual cue. Labels, timestamps, status meaning, source destinations, handlers, refusal rules and the distinction between opening and confirming/acknowledging are unchanged. Status retains explanatory text rather than relying on color.

The refinement reuses system typography, shared spacing, 16/12/8px card/control/detail radii, 22px row icons, 16px action symbols and the existing 620 action weight. Independently compared baseline theme bytes: `tokens.css` and `Appearance.css` are unchanged. All 23 Light color roles agree across tokens and both local metadata records. Central Dark status/action roles remain inherited.

Opened all five targeted Chromium captures, including before/after, Light, Dark and the intentionally scrolled 320px/200% row detail. The footer is visibly separated and enlarged content wraps without overlap. Recorded focused results contain ten passing groups per Chromium, Firefox and WebKit, covering geometry, themes, widths, focus/Enter navigation, filters and unavailable/stale/partial states. This documentation pass did not execute browser scenarios. The separate [finish review](notification-polish-ui-review.md) records `disposition: ship`, no blockers, source/capture inspection and independent build reproduction.

Preexisting metadata gaps remain: DESIGN frontmatter carries colors but omits complete typography/spacing/radius groups; preferred-primitives metadata omits the existing ViewSwitcher. These were not repaired or promoted into new rules.

This remains a fictional local prototype. No production application changes, real notifications, backend integration, native-device or screen-reader certification are claimed. Application development source remains the read-only `46e202786863279302026ee03a0e225c359fa55c` reference. The workspace has no Git repository, branch, commit or deployment; no user action is required for this record.
