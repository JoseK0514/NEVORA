# NEVORA settings hub

## Scope and source

Redesign `/app/settings` only. All eight existing destinations and the server-side Owner authorization remain available. Destination forms, data access, navigation shell, and policy rules are unchanged. There is no new setting, search service, telemetry, database migration, or dependency.

Source: the clean local development successor `central-cfr-green-successor`, checkpoint `e39803a`, descended from development checkpoint `b58496b`. An isolated clone lives on `codex/nevora-settings-hub-20261012`. The Codex managed-worktree tool reported "Not a git repository" in this projectless chat, so isolation uses a local clone. The other active redesigns and source checkout remain untouched.

## Design

The project's DESIGN.MD takes priority over generic skill defaults: orange accents, Inter, neutral white panels, 18px panel corners, Phosphor icons, existing dark rail, and compact workforce hierarchy. The gpt-taste seeded reference exercise chose editorial split, Satoshi, inline images/marquee/carousel, and stacking/scale motion. Those marketing patterns are adapted to labelled sections, direct link rows, and restrained motion because this is an operational settings hub.

Three groups follow the owner's tasks:

- Workspace: workspace profile, locations, Clocker devices.
- Work rules: scheduling rules, break types, positions.
- Access & recovery: account recovery, Clocker recovery.

Desktop separates group explanation and link rows in a two-column layout. Mobile and narrow desktop stack the group heading above its list. Every row is one native link with an explicit name and description, persistent chevron, and a generous full-row hit area. No interaction requires hover. Icons use distinct regular-weight Phosphor symbols on consistent orange-tinted tiles. Keyboard focus uses the existing dark-orange ink token.

The page is server-rendered and contains no data-loading step of its own. Its eight links remain usable without JavaScript. Shared session/layout error handling remains the source of truth. GSAP enhances the heading entrance and section icon scale through once-only ScrollTriggers; motion is scoped, automatically cleaned up, and reverted when reduced motion is enabled. Content is visible before hydration.

## Research

Mobbin images were inspected through the connected Mobbin search tools:

- [Luma account settings](https://mobbin.com/screens/b83035f0-7cec-4920-bc66-aff9c29b77c7): quiet grouped rows, section labels, readable touch targets.
- [Unify settings](https://mobbin.com/screens/832992d1-1c53-4fee-9936-d5524c0694b8): task grouping and separate personal/workspace navigation.
- [Replit settings](https://mobbin.com/screens/f4d4cf18-a47c-486d-ad88-48acf37bbd4e): clear section boundaries within a shared shell.

The `21st` MCP search picker returned these component options:

- [Preferences Card](https://21st.dev/@ssychui/components/preferences-card), demo 30553: best-fit title/description/icon/chevron row pattern.
- [Settings Card with Sidebar](https://21st.dev/@cnippet-dev/components/v-card-17), demo 25323: alternate desktop category navigation.
- [Settings Sidebar Accordion](https://21st.dev/@cnippet-dev/components/settings-sidebar-accordion), demo 24875: expandable alternative for larger settings hierarchies.

Metadata searches only; no paid component code was retrieved. The implementation uses existing packages. GSAP lifecycle guidance was checked in [the official React package](https://github.com/greensock/react).

## Acceptance and evidence

The pre-change focused baseline passed 32 tests. Added coverage retains every direct destination and rejects rendering when the Owner guard refuses authorization. Browser acceptance must exercise real local sessions with fictional owned PostgreSQL data, desktop/mobile geometry, all eight navigation links, keyboard/focus, no JavaScript, motion/reduced motion, and denied roles. Final command results, screenshots, source manifest, and local preview details are recorded in this task's outputs handoff.

Product/experience position: improve findability without expanding scope. Engineering position: route-scoped styles and a small motion wrapper, preserving existing contracts. Security/control position: retain `requireRoles(["OWNER"])`, no new data disclosure or external sending. Delivery position: local verification is distinct from deployment. Governance release impact: CONDITION; hosted integration and independent release acceptance remain separate. This work does not close an independent audit finding.

Rollback: revert the settings-hub change commit. No schema or data rollback is required.
