# Employee Login refinement

Jose asked to refine the login first and update the existing review link before proceeding to another page. Baseline: `b6e7c440f398a95644f8fb714fb9f6ae9065eec3` from the completed Audit and Polish NEVORA UI/UX preview. This branch owns login presentation and its asset/design documentation only.

## Result

The original NEVORA wordmark renders without the boxed flame; Workforce is centered below it. Employee Login leads directly into credentials. The main button is centered and recovery/activation have no trailing arrows. Phosphor LockKey/IdentificationBadge duotone icons replace Key/UserPlus, retaining the shared icon family. Static original blue architectural photography replaces the floating planner. The exact Brighter work ahead slogan, approved Inter font and blue palette remain.

All new CSS requires `.login-refinement-page`. Shared login.css and login-motion.ts are unchanged, so recovery/reset/activation keep their current appearance and animation. Authentication actions, credential checks, sessions, safe return handling, pending feedback, ownership/legal copy and links remain intact. Asset provenance is in public/assets/manifest.json; current design primitives and specimens are in DESIGN.MD and .impeccable/design.json.

## Positions and controls

Product/Experience: reduce form distractions and keep login immediately recognizable. Engineering: use existing branding/icon primitives and a server-rendered still hero. Security: preserve credential/session/return validation and generic errors. Governance: review-only update of the already-public fictional-data preview; no changes to DEV, MAIN, production data or release gates. Implementation owner: this login refinement chat. Next gate: Jose's visual review of the same preview.

## Verification

- Existing login, brand-lockup and reset page suites: 20 tests passed.
- TypeScript check passed using the generated Next type declarations.
- Full ESLint completed with zero errors and one existing React cleanup-ref warning in employee-weekly-confirmation.tsx; no new warning in the changed components.
- Isolated Next 16.3.8 production-mode build passed with the existing owned PostgreSQL adapter. No package setup/migration/worker hooks were run.
- Real browser checks at 320, 390, 768, 1024 and 1440px: no document overflow; hero headline two lines; Workforce centered within 0.01px; fields/button 54px and access links 56px. Mobile artwork strip is 144px; desktop artwork is 608px, or 560px for short windows.
- The 800px split-layout boundary also passed; at 1280×720 the complete page fits within the viewport. Browser comparison confirmed unchanged mobile geometry on /forgot-access, /activate and /reset-access. Activation navigation preserved /app/schedule as its validated return.
- Keyboard focus on Password and Sign In is a visible 2px blue outline; invalid native sign-in returns the generic error. Success feedback, link navigation and HTTPS demo sign-in are checked in the final preview handoff evidence.
- This is a viewport/browser verification, not physical iPhone testing or an independent accessibility/release certification.

## Preview operation and rollback

The existing temporary URL is https://counted-staffing-solutions-sticker.trycloudflare.com/login, served through the existing tunnel to loopback port 56316. Prepare/verify the candidate before replacing that listener. Keep the original source mirror and build at the audit chat's preview-runtime/live/owned-next-U8Xa5d/app for rollback. The original fixture PostgreSQL and tunnel parent remain running; their lifetime still controls preview availability. Existing fictional demo accounts/password remain unchanged.

The original Next process's generated PIN environment was not recoverable from its process metadata. Before using fresh local-only PIN material, read-only queries confirmed zero clocker_pin_configuration, employee_clocker_pins and clocker_pin_sessions rows in the marked synthetic database. The replacement retains payroll/clocker flags and disabled push delivery. No production credentials are read or reused. Runtime configuration stays outside the repository in a mode-0600 scratch file.

The replacement runtime and rollback launcher are in this chat's work directory. Stop only its verified Next listener if rolling back; start the preserved original build on 56316 with the same local test configuration. Do not terminate the original tunnel or PostgreSQL parent. Current runtime PID/port/source commit and browser evidence are recorded in outputs/NEVORA_LOGIN_REFINEMENT.md in this chat. No branch push, main merge or production deployment is part of this change.

## References and limits

[Gusto sign-in on Mobbin](https://mobbin.com/screens/faab7a02-dc26-462b-b0f9-0a4a5245a65e) informed the focused form and separated brand panel. [21st Nav List Card](https://21st.dev/@arihantcodes_1f7b8c4d/components/nav-list-card) informed coordinated icon/link rows. ADP's official login index and Homebase's official sign-in page were inspected. The 21st MCP server was not exposed; its public reference was used. Impeccable engine context loading was unavailable because its engine/cache was not installed in a writable location; existing DESIGN.MD, live computed styles and browser evidence were used. No paid template or external authentication implementation was imported.
