# Forgot Access and Activate Account refinement

Jose approved the login at `be729ce34d1774577e97634da450ca65f2e09dc4` and requested the next two pages in the same preview. This change owns recovery/activation presentation, shared authentication branding/icons/styles, and asset/design documentation.

## Result and positions

Product/Experience: form headings use Forgot Access and Activate Account; introductions are removed. Recovery email guidance is optional native Info details. Support summaries use a restrained Plus/Minus indicator; recovery-code navigation reuses login's LockKey icon. Plain text return links have no arrows. Recovery and activation use still envelope/key and badge/notebook artwork on neutral panels, with no blue doorway or animation. AuthBrand is the shared wordmark with Workforce centered beneath; treat it as the standard for subsequent page reviews.

Engineering: promote the exact approved login declarations from login-refinement.css into auth-refinement.css under .auth-refinement-page. Login rendered geometry, colors and sizes are unchanged. auth-support.css requires the recovery/activation scope; existing global login.css and login-motion.ts are preserved. Reset access remains unchanged pending its page review. Native details preserve keyboard/touch and no-JavaScript usability. New raster assets are built-in imagegen edits, versioned without overwriting the originals; full prompts, dimensions and SHA-256 are in the manifest.

Security: credential checks, sessions, recovery API, abort/retry lifecycle, privacy-safe accepted message, generic errors, phone matching, password constraints and safe return handling are unchanged. Phone-on-file and eight-character password hints remain. Only the visual submit arrow was removed; useFormStatus still controls activation pending feedback. No new registration or identity-verification workflow is introduced.

Governance: GO for the requested fictional-data review preview. Existing production gates are unaffected; no independent QA/audit closure is claimed. No production data, credentials, email delivery or account changes were used. Implementation owner: this login-refinement chat. Next gate: Jose's visual review of both pages; no additional approval is needed to update the already-authorized preview.

## Evidence

- Six existing focused suites: 40 tests passed (recovery presentation, recovery route, public branding, login actions, brand-lockup and reset page).
- TypeScript passed. Full ESLint: zero errors, one existing cleanup-ref warning in employee-weekly-confirmation.tsx:18. Changed TypeScript/TSX components: no warnings/errors.
- Independent Next 16.3.8 production-mode build passed using the existing marked fixture database adapter. No setup, migration or worker hooks were invoked.
- Real browser checks at 320, 390, 768, 800, 1024 and 1440px for both pages: no horizontal document overflow, two-line slogan, Workforce centered within 0.01px, required fields 54px with 16px text, 44px Info target and 56px assistance targets. The four-field activation page scrolls vertically on small windows.
- Native Info and assistance disclosures opened/closed with touch-style clicks and keyboard input; the mobile email explanation stayed within the viewport and had a 2px blue focus outline. Plus switches to Minus when open.
- Recovery request with a clearly synthetic unknown identifier and example.invalid address returned Request received, privacy-safe conditional wording and focused status; form removed after acceptance. Preview SMTP is unconfigured and fails closed, so no email was sent.
- Activation invalid-state presentation, four required fields, username/tel/new-password autocomplete, minimum password length, shared Show/Hide control, assistance and safe /app/schedule return link were checked. No account was activated and no password was entered/changed as a browser test.
- Approved login geometry/colors/sizes and reset mobile geometry matched the incumbent preview. Final public screenshots and listener metadata are in outputs/NEVORA_ACCESS_REFINEMENT.md in this chat after the swap.

Remaining limitations: browser viewport verification does not certify physical-device behavior, SMTP delivery, real account activation or production release readiness. No implementation blocker remains within the requested visual scope.

## Preview and rollback

Use the existing temporary preview at https://counted-staffing-solutions-sticker.trycloudflare.com, backed by loopback 56316. Preserve the original Cloudflare tunnel and fictional PostgreSQL fixture. The candidate is built in this chat's work/auth-runtime-v2; the approved login build remains at work/login-runtime for rollback. Only replace a verified owned Next listener after building and checking the candidate. Current PID, source commit and final browser evidence are recorded in the user-facing handoff.

Rollback: stop only the current verified Next listener, then use work/run-login-preview.py with port 56316 and the preserved work/login-runtime path. Keep the original tunnel and PostgreSQL running. Runtime secrets stay in the existing mode-0600 scratch configuration outside Git. This is a local review-branch commit and temporary preview update, with no remote push, DEV/MAIN merge or production deployment.

## References

The supplied gpt-taste/mobbin-design skills and current DESIGN.MD informed the refinement. [ZARA recovery](https://mobbin.com/screens/7cc092e3-8d52-4843-b98b-a278bd55cdf3) and [H&M recovery](https://mobbin.com/screens/fff66ab1-7532-4fac-83dc-5ad237fd7348) informed concise hierarchy. The public [21st Forgot Password Form](https://21st.dev/@cnippet-dev/components/v-form-11) was inspected; the 21st MCP is not exposed. The task-specific still/minimal direction and approved Inter system take precedence over the marketing-motion/randomization requirements in gpt-taste. No paid component or external authentication implementation was imported.
