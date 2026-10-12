# Updates list and review redesign

Scope: `/app/updates` and `/app/updates/[id]`, for employees and managers. The existing compose flow, APIs, current authorization, private snapshot lifetime, exact-version acknowledgement and operation recovery remain the source of truth.

The candidate starts at `ba5ed01` on an isolated `codex/nevora-updates-review-20261012` branch of the consolidated development source. The October 12 single-company checkout omits the communication feature; this candidate must be carried into a successor containing that feature. It is not a production release or a claim that the single-company branch contains these changes.

## Design decisions

Use DESIGN.MD's locally bundled Inter, orange portal palette, 18px containers, polished controls and Phosphor icons. The Mobbin skill's neutral hierarchy complements the portal identity. The gpt-taste marketing defaults are adapted to an operational reading task: a short GSAP heading entrance with reduced-motion support, immediate stationary content, no scroll pinning and no moving reading controls.

The inbox groups updates by their own named-zone publication dates, retains the service's item order and shows escaped two-line message previews. Employees filter All, To review and Reviewed. Required updates enter Reviewed only after acknowledgement of their current version; a Mark read receipt alone is insufficient. Managers filter All, Required and Optional, avoiding a personal-review task their management view does not expose. Counts refer to the returned view; partial results retain explicit uncertainty and never imply a complete empty inbox.

The full message remains plain text in real HTML. A dedicated panel explains the receipt and exposes the existing explicit checkbox and acknowledgement action, or optional Mark read. On mobile, the panel follows the message. Manager recipient names remain in a native disclosure; Edit and Withdraw stay available. Pending and uncertain outcomes retain the original recovery controller and lookup path. Private rows and receipts disappear when the current resource pauses or becomes unavailable.

## References

- [Basecamp activity](https://mobbin.com/screens/b71d21b5-1078-44a4-adb3-9583531a6059): date grouping and scanning hierarchy.
- [Public inbox](https://mobbin.com/screens/a6751b2f-6f73-4d79-90d8-bd6d9ffc30f4): compact mobile rows and distinct status cues.
- [Mindtrip updates](https://mobbin.com/screens/95b3d1e5-2adc-4935-9104-247464e1d0b4): update title and supporting timestamp hierarchy.
- [21st Notification Center Tabs](https://21st.dev/@olewandowski1/components/notifications-3): filtering and empty-state reference.
- [21st Notification Panel](https://21st.dev/@uvain/components/notification-panel): separate seen and handled states.
- [21st Activity Tabs With Unread](https://21st.dev/@olewandowski1/components/activity-4): metadata and activity row reference.

Mobbin previews were examined. 21st MCP `search_picker` returned these options after an earlier direct request received HTTP 429. No paid component source was retrieved and no new dependency was installed.

## Ownership and controls

Product: improve scanning and understanding without adding communication workflows. Engineering: isolate presentation from the existing data and command controllers. Experience: give mobile equal priority and keep full-message review clear. Governance: retain authorization, current-version receipts, uncertainty recovery and sending restrictions. These are applied implementation perspectives, not independent certification.

Changes are reversible by removing the candidate presentation files and restoring the two components from the recorded base. No schema, migration, customer data, real message dispatch, external analytics, merge, push or deployment is part of this change. Codex owns this local candidate; Jose owns any release decision.

Verification receipts and screenshots are recorded in this chat's `outputs/` directory. Browser fixtures use a new ownership-marked loopback PostgreSQL database, actual login/session and communication commands, and a byte-hashed snapshot of the uncommitted candidate. Only the approved scratch DB transport and Next's generated development type imports are substituted. Failure response fixtures are labelled separately from real saved receipts. This does not establish hosted, physical-device or screen-reader verification.
