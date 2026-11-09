# Notifications redesign

Local implementation on `codex/nevora-notifications-20261012`, based on reviewed NEVORA design source `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`. Source: the consolidated timecard/design branch used by the Reset Access redesign. DESIGN.MD was located through the chat **Find redesigned NEVORA pages**. Its portal palette, Inter fonts, and Phosphor icon system govern this page.

The single-company branch `codex/single-company-20261012` at `8950786` has no notifications page or employee-notifications API. This change does not add those backend workflows to that branch. Adoption requires a separate integration decision; no deployment is authorized or performed.

## Product and experience

Employees and Leads get a dated inbox with All, Unread, and Needs action filters, search, quiet unread indicators, task-specific icons, separate review/action labels, refresh/retry feedback, and direct safe record links. Needs action contains only `actionState=required`; optional available actions remain visible in All. Read notifications can still require action. Counts and empty statements explicitly describe this bounded view. Unknown review/action states and partial coverage remain explicit.

Opening a row retains the existing `/app/notifications/open?notificationId=...` route. It performs current-source checks. No read/acknowledgement mutation, mark-all-read control, notification consent, or device setup is added. Profile and its device settings keep their original workflow.

## Engineering and governance

Only presentation and pure view filtering/grouping change. `EmployeeAccountPanel` retains its actual private snapshot controller, server-supplied authority header, parsing, expiration, refresh, lifecycle clearing, and aborted-response fencing. The authenticated page guard, API, source reader, safe destinations, notification worker, schemas, and source actions are untouched. Local UI evidence does not certify independent QA or release closure. Production remains subject to existing gates.

The inbox uses DESIGN.MD CSS tokens, existing local fonts, individual SSR Phosphor imports, and a brief GSAP row translation. No content is initially hidden. Empty lists skip animation; reduced motion leaves rows static. The mobile layout stacks controls and row actions; controls have at least 44px targets and visible keyboard focus.

## References

Mobbin screens inspected before implementation:

- [fal](https://mobbin.com/screens/d7f3f613-38ca-49f3-a382-e51c1f1d435c): readable notification filters and controls.
- [Basecamp](https://mobbin.com/screens/b71d21b5-1078-44a4-adb3-9583531a6059): date-grouped activity.
- [Public mobile inbox](https://mobbin.com/screens/a6751b2f-6f73-4d79-90d8-bd6d9ffc30f4): dated rows, visible unread cues and content-first mobile organization.
- [Mindtrip updates](https://mobbin.com/screens/3c451683-6c3d-4c76-be6a-0a129143ba3a): readable title/time hierarchy.

`21st.search_picker` showed four component options:

- [Notification Panel](https://21st.dev/@uvain/components/notification-panel), ID 27135.
- [Activity Tabs With Unread](https://21st.dev/@olewandowski1/components/activity-4), ID 28490.
- [Notification Center Tabs](https://21st.dev/@olewandowski1/components/notifications-3), ID 28432.
- [Notification Inbox Popover](https://21st.dev/@ruixen.ui/components/notification-inbox-popover), ID 8245.

These inform hierarchy and controls. No paid retrieval, new dependency, or external generation was used. gpt-taste's marketing dimensions, fonts and scroll pinning were adapted to the explicitly approved operational DESIGN.MD.

## Verification

Evidence files and exact final results are recorded in the output handoff. Browser scenarios use the actual AppShell, EmployeeAccountPanel and NotificationInbox in a separate local Next runtime with fictional API responses. They verify UI behavior and private-state clearing, not authenticated database reads or real source-action completion. The existing source-reader, parser, guarded-open and lifetime tests provide their separate automated evidence.

During testing, a short input target and empty-list GSAP warnings were corrected. Next's Turbopack rejects the shared local node_modules symlink; the installed Webpack option was used for the preview and build. No production credentials, customer data, real messages, or new orders were used.
