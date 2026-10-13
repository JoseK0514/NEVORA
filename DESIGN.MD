---
version: "neuform-top-creators-featured"
name: "Typeface 75 - Premium Mechanical Keyboard"
description: "Typeface Premium UI Showcase Section is designed for demonstrating an application interface and hierarchy. Key features include dashboard-like visual hierarchy and dense but readable content organization. Built with custom CSS, it is suitable for product showcases and interface-first landing experiences."
colors:
  primary: "#ED724C"
  secondary: "#FAFAFA"
  accent: "#D8613C"
  background: "#FAFAFA"
  surface: "#E5E7EB"
  text-primary: "#111827"
  text-secondary: "#4B5563"
  border: "#D1D5DB"
  # Shared Employee Login/Forgot access/New user account activation variant; the portal palette above stays intact.
  login-blue: "#0756D9"
  login-blue-hover: "#003AAE"
  login-cyan: "#43CCFB"
  login-ice: "#F0FBFF"
  login-form-surface: "#FFFFFF"
  login-refined-canvas: "#F7F8FA"
  login-refined-field: "#F6F7F9"
  login-refined-divider: "#E7EBF0"
  login-refined-hero-ink: "#062959"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: "1.04"
    letterSpacing: "0"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
  label-md:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.2"
  # Shared Employee Login/Forgot access/New user account activation type roles; the display/body/label reference remains above.
  login-display:
    fontFamily: "Inter"
    fontSize: "clamp(42px, 4.5vw, 64px)"
    fontWeight: 500
    lineHeight: "1.04"
    letterSpacing: "-.03em"
  login-display-mobile:
    fontFamily: "Inter"
    fontSize: "21px"
    fontWeight: 500
    lineHeight: "1.2"
    letterSpacing: "-.02em"
  login-heading:
    fontFamily: "Inter"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: "1.2"
    letterSpacing: "-.03em"
  login-heading-mobile:
    fontFamily: "Inter"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: "1.2"
    letterSpacing: "-.03em"
  login-body:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.6"
  login-field:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  login-action:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: 600
  login-label:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 500
  login-workspace:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "1.5"
  activation-hint:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.5"
  activation-help-copy:
    fontFamily: "Inter"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.6"
spacing:
  base: "8px"
  gap: "16px"
  card-padding: "24px"
  section-padding: "80px"
  login-shell-gap: "28px"
  login-shell-gap-mobile: "20px"
  login-form-gap: "20px"
  login-form-gap-mobile: "18px"
  login-form-padding: "48px"
  login-form-padding-mobile: "28px 24px 24px"
  login-refined-form-padding: "48px 56px"
  login-refined-form-padding-mobile: "32px 28px 28px"
  activation-password-inset: "4px"
  activation-password-clearance: "64px"
  activation-secondary-gap: "28px"
  activation-secondary-gap-mobile: "24px"
rounded:
  card: "18px"
  control: "17px"
  pill: "9999px"
  login-access-link: "4px"
  login-refined-composition: "24px"
  login-refined-control: "14px"
  login-refined-symbol: "12px"
  activation-password-toggle: "13px"
components:
  login-refined-composition:
    backgroundColor: "{colors.login-form-surface}"
    rounded: "{rounded.login-refined-composition}"
    width: "100%"
  login-refined-action:
    backgroundColor: "{colors.login-blue}"
    textColor: "{colors.login-form-surface}"
    typography: "{typography.login-action}"
    rounded: "{rounded.login-refined-control}"
    padding: "14px 18px"
    height: "54px"
    width: "100%"
  login-refined-field:
    backgroundColor: "{colors.login-refined-field}"
    textColor: "{colors.text-primary}"
    typography: "{typography.login-field}"
    rounded: "{rounded.login-refined-control}"
    padding: "12px 16px"
    height: "54px"
    width: "100%"
  login-refined-access-link:
    textColor: "{colors.login-blue}"
    typography: "{typography.login-label}"
    padding: "4px 0"
    height: "56px"
    width: "100%"
  card:
    background: "Use the surface token with subtle borders and HTML-matched shadow depth"
    radius: "Match the declared card radius token"
  button:
    background: "Use primary or accent colors for the main action"
    radius: "Use the control or pill radius based on the source HTML"
  # Shared login-* components apply to Employee Login, Forgot access and New user account activation only.
  login-composition:
    backgroundColor: "{colors.login-form-surface}"
    rounded: "{rounded.card}"
    width: "100%"
  login-form-card:
    backgroundColor: "{colors.login-form-surface}"
    padding: "{spacing.login-form-padding}"
    width: "100%"
  login-action:
    backgroundColor: "{colors.login-blue}"
    textColor: "{colors.login-form-surface}"
    typography: "{typography.login-action}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    height: "52px"
    width: "100%"
  login-action-hover:
    backgroundColor: "{colors.login-blue-hover}"
    textColor: "{colors.login-form-surface}"
  login-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    typography: "{typography.login-field}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "52px"
    width: "100%"
  login-access-link:
    textColor: "{colors.login-blue}"
    typography: "{typography.login-label}"
    rounded: "{rounded.login-access-link}"
    padding: "10px 0"
    height: "52px"
    width: "100%"
  login-access-link-hover:
    textColor: "{colors.login-blue-hover}"
  login-motion-toggle:
    backgroundColor: "{colors.login-blue-hover}"
    textColor: "{colors.login-form-surface}"
    rounded: "{rounded.pill}"
    padding: "0"
    height: "44px"
    width: "44px"
  login-motion-toggle-hover:
    backgroundColor: "{colors.login-blue}"
  recovery-assistance:
    textColor: "{colors.text-primary}"
    typography: "{typography.login-label}"
    rounded: "{rounded.login-access-link}"
    padding: "10px 0"
    height: "52px"
    width: "100%"
  recovery-receipt:
    backgroundColor: "{colors.login-ice}"
    typography: "{typography.login-body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
    width: "100%"
  activation-action:
    backgroundColor: "{colors.login-blue}"
    textColor: "{colors.login-form-surface}"
    typography: "{typography.login-action}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
    height: "52px"
    width: "100%"
  activation-action-hover:
    backgroundColor: "{colors.login-blue-hover}"
    textColor: "{colors.login-form-surface}"
  activation-password-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.activation-password-toggle}"
    padding: "0"
    height: "44px"
    width: "44px"
  activation-password-toggle-hover:
    backgroundColor: "{colors.login-ice}"
    textColor: "{colors.login-blue}"
  activation-assistance:
    textColor: "{colors.text-primary}"
    typography: "{typography.login-label}"
    rounded: "{rounded.login-access-link}"
    padding: "10px 0"
    height: "52px"
    width: "100%"
  activation-back:
    textColor: "{colors.login-blue}"
    typography: "{typography.login-label}"
    height: "52px"
    width: "100%"
  activation-back-hover:
    textColor: "{colors.login-blue-hover}"
---

# Typeface 75 - Premium Mechanical Keyboard

Source: Neuform Featured templates from top creators. Author: Meng To (@mengto). Views: 52; favorites: 17; remixes: 0. Tags: dashboard, charts, bento, animated, webgl, threejs, navigation, links.

## Overview

Typeface Premium UI Showcase Section is designed for demonstrating an application interface and hierarchy. Key features include dashboard-like visual hierarchy and dense but readable content organization. Built with custom CSS, it is suitable for product showcases and interface-first landing experiences.

Typeface 75 Overview Design Tech Specs Pre-order Award-winning layout Engineered for tactile precision. A completely re-imagined seventy-five percent layout. Featured In The Verge Wired TechCrunch

## Composition

Use the attached HTML reference as the source of truth. Preserve the visible hierarchy, first-screen composition, section rhythm, density, and interaction tone before adapting copy or content. Follow the rendered preview for headline scale, supporting copy, navigation density, and component placement.

## Colors

Anchor the palette in primary #ED724C, secondary #FAFAFA, accent #D8613C, background #FAFAFA, surface #E5E7EB, text-primary #111827. Keep background, surface, text, and border roles distinct so generated layouts retain the same contrast pattern as the source.

## Typography

Use Inter for display moments and Inter for body copy unless the HTML clearly demands a compatible fallback. Labels and technical metadata should use JetBrains Mono or an equivalent mono face.

## Layout

Keep spacing deliberate and stable. Favor the same grid direction, max-width behavior, card density, and responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.

## Components

Dashboard, chart, and data panels should preserve their compact operational hierarchy, nested surfaces, and metric emphasis.

## Motion

Preserve existing motion cues such as masked reveals, staggered entrance, hover lift, scroll-triggered transitions, and ambient movement. Keep easing smooth and restrained.

## WebGL & Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

## Guardrails

- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.

## Applying this reference to NEVORA

NEVORA's existing screens remain the structure and motion baseline. Jose subsequently authorized modest layout refinements to the employee home for mobile and desktop usability. Keep Today and recorded clock status first, followed by upcoming shifts and weekly totals. Preserve navigation, data contracts, workflow behavior, existing transitions, and reduced-motion behavior. The supplied 64px display and 80px section spacing are reference tokens; do not force marketing dimensions or scroll pinning onto compact workforce screens.

Apply the orange palette, Inter family, restrained mono metadata, neutral surfaces, borders, and corner treatment through the existing CSS token system. Keep the current dark navigation rail, official NEVORA logo assets, and success/warning/danger meanings. Use charcoal labels on orange action surfaces and the darker orange derivative #9F3821 for small links. White (#FFFFFF) is the elevated panel surface; #FAFAFA is the canvas, and #E5E7EB supplies quiet inset surfaces and dividers. Shadows stay subtle. Existing circular icon buttons and kiosk keypad geometry remain intact.

The login now uses Inter throughout. Jose authorized modest login layout changes and animations after the initial visual refresh; its wider desktop form and compact mobile composition accommodate the supporting sentence without a separate font fallback.

No separate HTML reference was attached to this request. NEVORA's existing rendered screens are the workflow baseline. Do not add a keyboard hero, new charts, or WebGL solely because the reference mentions those features. The explicitly authorized motion on Employee Login, Forgot access and New user account activation is scoped to each illustration and supporting headline.

Fonts are bundled locally under `public/fonts/typeface/`, with their SIL Open Font Licenses. The implementation stylesheet is `src/app/typeface-theme.css`, imported after the existing global stylesheet.

## Icons

Use [Phosphor Icons](https://phosphoricons.com) as the shared interface icon family. The pinned implementation is `@phosphor-icons/react` 2.1.10. Import individual SSR-compatible icons so the same wrapper works in server and client components without adding a context provider. Use regular weight at 18–22px for navigation and actions; reserve duotone for explanatory artwork. Keep navigation labels visible, inherit `currentColor`, hide decorative SVGs from assistive technology, and label icon-only controls. Keep a minimum 44px hit area and visible keyboard focus.

Choose icons by task: House for Home, CalendarBlank for schedules, Clock for recorded time, UserCheck for availability, CalendarMinus for time off, and ArrowsLeftRight for shift requests. Do not generate raster navigation icons or replace official brand marks. API guidance: [official React package](https://github.com/phosphor-icons/react).

## Illustrations and assets

Project assets live in [public/assets](public/assets/README.md). Use original model-generated flat editorial artwork with restrained geometric forms, orange accents, charcoal detail, neutral surfaces, and transparent backgrounds. Illustrations support the adjacent content and remain secondary to operational information. Keep text, time values, statuses, and controls in real HTML. Decorative images use empty alt text and fixed dimensions; meaningful imagery needs descriptive alt text. Never imply a published schedule, successful punch, or confirmed pay through artwork.

The official NEVORA logo, wordmark, and PWA icons remain unchanged. There were no stock content photographs in the current page inventory. New workday and planner illustrations replace decorative visual treatments where useful, without adding image filler to every screen. Record prompts, source files, dimensions, and usage in the asset manifest. Generate future page artwork with the built-in image model using the same palette and style.

## Employee login

The sign-in task leads. Keep Employee ID, Password, Sign In, Forgot access?, Activate your account, configured workspace identity, and Velani ownership visible and readable. Preserve the native server form, password-manager autocomplete, validated return destination, activation redirect, credential verification, and session creation. Do not add unsupported social login or fabricated testimonials.

NEVORA's slogan is **Brighter work ahead**. Keep this exact wording; it is the Employee Login, Forgot access and New user account activation illustration panels' headline and is defined once in `src/lib/brand.ts`. Do not replace it with newly invented positioning copy.

Jose explicitly selected **NEVORA blue and cyan** for the login on 2026-10-10. This is the shared Employee Login, Forgot access and New user account activation palette variant: primary #0756D9, hover #003AAE, cyan #43CCFB, and ice #F0FBFF. The rest of the portal retains the orange reference system. Keep white labels on cobalt actions, blue links on white, and clear blue keyboard focus. Cyan supports the artwork and focus on the blue panel; it is not a small-text color on white.

Use one bordered 18px composition: a cobalt illustration panel beside the white form on desktop, and a compact 132px artwork strip above the form below 800px. Inputs and the blue action are 52px high with 17px corners. Recovery and activation are separate full-width link rows with regular-weight Phosphor Key, UserPlus, and ArrowUpRight icons. Use Inter for all login copy; JetBrains Mono is reserved for the real workspace name.

The original model-generated `public/assets/illustrations/login-workday-blue.png` shows sculptural folded blue paper, a cyan sunrise, a blank planner, and a clock. Jose requested a stronger image after reviewing the previous orange illustration. This login art uses tactile shading while operational page illustrations keep their flat editorial style. It is decorative, with empty alt text, fixed intrinsic dimensions, responsive sizing, and its complete prompt in the asset manifest. It communicates no verified schedule or punch status.

Motion uses GSAP 3.15.0 with `@gsap/react` 2.1.2: a 1.3-second paper-lift entrance and 0.8-second headline reveal, followed by a restrained floating cycle (12px rise, 1.2-degree rotation, 2.5-percent scale, three seconds per direction). The visible 44px Phosphor Pause/Play control pauses the entire illustration timeline. Motion stops when the document is hidden or the artwork leaves the viewport. Reduced motion displays the static composition and hides the irrelevant motion control; switching preferences reverts the GSAP context. Content is visible before JavaScript; the form never animates or waits for artwork. Fine-pointer desktop input adds at most 8px horizontal and 6px vertical stage movement, with an eased reset on pointer leave. Touch users receive the same floating artwork without pointer effects. No scroll pinning or hover-dependent navigation. `src/app/login/login-motion.ts` drives both the application and the local visual export.

Login references:

- [Browserbase sign-in](https://mobbin.com/screens/ca1e3986-c0a9-436d-9447-b6fc9f985631): confident visual panel beside a clear form.
- [Replit sign-in](https://mobbin.com/screens/b75fa638-3243-4d4e-9cca-aee6d48307cc): focused form/art separation.
- [ShopBack mobile sign-in](https://mobbin.com/screens/a5f63e2a-29cb-466d-a53f-7867096747ad): compact fields and clear primary action.
- [21st Auth Section 1](https://21st.dev/@solaceui/components/auth-section-1): split authentication composition.
- [21st Sign In Form](https://21st.dev/@felipemenezes098/components/tsf-recipes-03): readable form hierarchy.
- [21st Nav List Card](https://21st.dev/@arihantcodes_1f7b8c4d/components/nav-list-card): icon and action link rows.

These are visual references, not imported authentication implementations. The 21st dashboard options remain relevant to the wider portal.

### Employee login refinement — 2026-10-12

Jose requested a quieter premium login and authorized updating the existing synthetic preview. These login-only rules supersede the prior Employee Login illustration, motion, form copy and accessory treatments above; recovery, reset and activation retain their existing design.

Use the original NEVORA wordmark with Workforce centered beneath it and no flame or boxed icon. Keep Inter and the approved cobalt/cyan identity. A static original architectural light study (`public/assets/illustrations/login-daylight-blue-v2.png`) replaces the floating paper planner; its portrait dimensions are 1024×1536, its prompt and hash are in the asset manifest. Reserve the art panel; the cobalt fallback and contrast scrim keep the exact Brighter work ahead slogan legible when imagery is unavailable. On mobile crop the still to a 144px strip. Do not apply the old motion controller to login; other authentication pages keep theirs.

Employee Login leads directly into Employee ID, Password and the centered Sign In action, with no explanatory paragraph or arrow. Recovery and activation keep their real links and accessible text. Use individually imported Phosphor LockKey and IdentificationBadge duotone icons in coordinated 40px ice tiles; link targets are at least 56px high. White form surfaces, subtle neutral fields, 24px composition corners and 14px controls define the local variant. Preserve error/activation feedback, pending state, native submission, password autocomplete and safe return handling. Scope all refinements to `.login-refinement-page` in `src/app/login/login-refinement.css`.

Reference: [Gusto sign-in on Mobbin](https://mobbin.com/screens/faab7a02-dc26-462b-b0f9-0a4a5245a65e) for focused authentication hierarchy and separated illustration; [21st Nav List Card](https://21st.dev/@arihantcodes_1f7b8c4d/components/nav-list-card) for a coordinated icon/link rhythm. No external auth component is imported. The 21st MCP server was unavailable in this session; its public reference was inspected instead.

## Forgot access

Forgot access extends the approved `nevora-typeface-auth-blue-cyan` world with focused assistance and the same clean, cohesive composition. This is an ordinary extension, not a replacement visual world. The existing `login-*` color, type, spacing and component tokens now apply to Employee Login, Forgot access and New user account activation only. Reset access, assisted recovery and the orange portal retain their incumbent presentation.

**The Shared Authentication Scope Rule.** Use the shared `login-*` tokens only for Employee Login, Forgot access and New user account activation; preserve the wider portal, Reset access and assisted-recovery presentation.

### Layout and typography

Reuse the bordered split composition, white stationary form, compact mobile artwork strip, locally bundled Inter, real workspace identity and official lockup. The shell is capped at 1120px on desktop and 480px below 800px; the existing 18px frame and 52px/17px input/action geometry remain shared. Keep the exact **Brighter work ahead** slogan from `src/lib/brand.ts`. The recovery support sentence is “A little help getting back to your workday.” Recovery refinements in `src/app/forgot-access/recovery.css` are scoped to `.recovery-page`.

### Components and feedback

**The Focused Assistance Rule.** Keep Employee ID and Registered recovery email first, followed by Request recovery; keep the existing-proof path and Back to sign in visible, with assisted guidance in native expandable details.

Use the registered-email hint beside the email field. The assistance summary shares the access-row geometry and shows an explicit caret; opening it explains that a manager or Owner must verify identity before issuing a proof. The Back to sign in target is at least 44px high. The accepted receipt uses the shared ice surface and frame corners, with 24px padding on desktop and 20px on mobile. Its compact heading is 20px at weight 500; this is a recovery feedback detail, not a new global display role.

**The Truthful Feedback Rule.** Accepted feedback says “Request received” and retains the server's privacy-safe message; never claim email delivery or reveal account existence through copy or artwork.

Pending changes the stationary action label to “Requesting recovery…” and exposes a live status while controls are disabled. Accepted and error feedback receive focus and retain status/alert semantics. With JavaScript disabled, the unavailable recovery form stays disabled and shows the enable-JavaScript/assisted-recovery explanation; proof and return links remain usable. `src/components/recovery-request.tsx` owns this presentation while `AccountRecovery` keeps the existing request, state and lifecycle handlers. The public page uses `force-dynamic` so the workspace identity remains current.

### Illustration and motion

The original model-generated `public/assets/illustrations/recovery-access-blue.png` shows a folded-paper doorway, cyan sunrise, blank closed envelope and decorative key. It has empty alt text, fixed intrinsic dimensions and responsive sizing; the exact prompt, embedded metadata, hash and usage remain in the asset manifest. Artwork implies neither delivery nor recovered access.

`src/app/forgot-access/recovery-visual.tsx` reuses the unchanged `src/app/login/login-motion.ts` controller, including entrance, float, Pause/Play, reduced-motion static rendering, offscreen/document visibility gates and desktop fine-pointer drift. The form does not animate or wait for the artwork. The assistance caret rotates over 0.18 seconds and becomes static under reduced motion. The new recovery browser checks verify Pause and reduced motion. Offscreen pausing is inherited evidence from the unchanged login controller and preceding login audit; a physical hidden-tab runtime check remains outside the local certification.

### References

- [Tana recovery](https://mobbin.com/screens/c48722e2-c544-4e69-9443-de1d23834980): short request hierarchy and explicit return path.
- [Emergent recovery](https://mobbin.com/screens/a7fa3adc-a436-49ee-b82e-733c3e622b9c): calm recovery presentation and focused assistance.
- [ZARA recovery](https://mobbin.com/screens/7cc092e3-8d52-4843-b98b-a278bd55cdf3): concise desktop recovery hierarchy.
- [21st Forgot Password Form](https://21st.dev/@cnippet-dev/components/v-form-11): best-fit request/feedback hierarchy reference.
- [21st Reset Password Card](https://21st.dev/@diarmuradi/components/reset-password-icon-card): best-fit compact request-card reference.
- [21st New Password Form](https://21st.dev/@diarmuradi/components/new-password-2): later Reset access reference only.
- [21st Reset Password Form](https://21st.dev/@lavikatiyar/components/reset-password-form): alternative with a different code-verification workflow; it does not define NEVORA's proof workflow.

These are visual references. No paid component code was imported. See [the bounded review](docs/ui/2026-10-10-nevora-forgot-access-review.md) for candidate evidence and release limits.

## New user account activation

New user account activation at `/activate` extends the approved `nevora-typeface-auth-blue-cyan` world. Keep the existing workplace activation workflow and the shared split composition; this is an ordinary extension of Employee Login and Forgot access. Inter is explicitly pinned for this surface, with locally bundled JetBrains Mono reserved for the configured workspace identity. The orange portal, Reset access and assisted-recovery presentation remain outside this variant.

### Layout and typography

Reuse the 1120px desktop shell, bordered 18px frame, white stationary form and 480px-capped stack below 800px. The compact artwork strip retains a minimum 132px height and may grow with its content. The four required fields increase the natural page height; let the form and footer scroll normally on compact screens. Preserve the shared 52px fields/action, 17px control corners, 14px labels, 16px native input text and cobalt keyboard focus. Activation hints use `activation-hint`; expanded assistance uses `activation-help-copy`. These are scoped supporting roles, not a new global type ramp. `src/app/activate/activation.css` scopes the extension to `.activation-page`; shared login/recovery CSS remains the baseline.

Keep **Activate account** as the form heading, “Use your employee details to get started. Then choose a password.” as its supporting sentence, and the exact **Brighter work ahead** slogan in real HTML from `src/lib/brand.ts`. The artwork's desktop support copy is “Your first step toward a brighter workday.”

### Components and feedback

**The Existing Employee Rule.** Present Employee ID, Phone number, Create password and Confirm password in that order, followed by Activate account. Activation requires an existing workplace employee record and its matching phone; do not introduce independent signup or verification steps.

Keep the phone hint “Use the number your workplace has on file.” and password hint “At least 8 characters.” next to their fields. Preserve username/tel/new-password autocomplete and native required/minimum-length constraints. The native `activateAccountAction` also enforces the eight-character minimum and matching passwords on the server, normalizes the employee ID/phone, preserves a validated safe return destination and redirects successful activation to `/login?activated=1` with its success feedback. Generic invalid/not-found alerts retain privacy-safe wording, including the possibility that an account is already activated, without disclosing account existence.

**The Shared Password Visibility Rule.** One optional, explicitly labelled Show passwords/Hide passwords control toggles both password fields together. Keep `aria-pressed`, both `aria-controls` targets, regular 20px Phosphor Eye/EyeSlash icons and the shared keyboard focus. The 44px target sits inside the first 52px field with `activation-password-inset`; its `activation-password-toggle` corner is the enclosing 17px control corner minus that 4px inset. Reserve `activation-password-clearance` on the first field so text does not meet the icon. Without JavaScript the fields remain password inputs and the native form still activates an account.

`ActivationSubmit` uses `useFormStatus` for a live polite “Activating account…” status, disables resubmission while pending and hides its arrow without changing geometry. Only the submit action is disabled; do not document all fields as disabled. Keep white labels on cobalt, the deep cobalt hover and static reduced-motion interaction treatment.

Native details/summary assistance follows the action, with “Need your employee details?” and a regular Phosphor caret. Opening it explains that the workplace sets up the employee record first and that a manager or Owner supplies the Employee ID and confirms the phone on file. The separate full-width “Already activated? Sign in” path retains the validated return destination. Both rows have at least the shared 52px height. The assistance and return remain usable without JavaScript. `PhoneInput` only adds optional `id` and `aria-describedby` support; phone formatting and normalization are unchanged.

### Illustration and motion

The original model-generated `public/assets/illustrations/activation-welcome-blue.png` is a transparent 1536×1024 folded-paper still life: a cobalt doorway, cyan sunrise, blank ivory employee badge and open blank notebook. Empty alt text, reserved intrinsic dimensions and responsive contain sizing keep it decorative; it implies no successful activation. The manifest and embedded PNG metadata carry the exact prompt. The manifest SHA-256 is `26f962ecad03d759962291c68c6b6744ca61af4a9bb8c51d437f8be283baf813`.

`src/app/activate/activation-visual.tsx` reuses the unchanged `src/app/login/login-motion.ts` controller for entrance, restrained float, 44px Pause/Play, static reduced motion, offscreen/document visibility gates and fine-pointer drift. The form remains immediate and outside the artwork timeline. The assistance caret rotates over 0.18 seconds and becomes static under reduced motion. Local Chromium/WebKit evidence verifies Pause, reduced motion and offscreen behavior; a physical hidden-tab check is not certified.

### References

- [Calendly account setup](https://mobbin.com/screens/932bbfc5-82c8-4800-964a-5055a36d9967) and [Canny account setup](https://mobbin.com/screens/22a43d52-5a48-4907-9ca5-708696043f22): account setup hierarchy and focused primary action references.
- [Basecamp account setup](https://mobbin.com/screens/f1f8c0f0-3cf3-448f-8e45-dd9b105220e2): focused password-setup action reference.
- [21st Auth Form](https://21st.dev/@educalvolpz/components/auth-form): presentation/state reference; NEVORA keeps its stationary native action.
- [21st Sign Up Form by diarmuradi](https://21st.dev/@diarmuradi/components/sign-up-2): password visibility reference.
- [21st Sign Up Form by cnippet-dev](https://21st.dev/@cnippet-dev/components/v-form-9): password/confirmation and pending-action hierarchy reference.
- [21st Sign up Form by axelwesselgren](https://21st.dev/@axelwesselgren/components/sign-up-form): fourth rendered gallery option.

These are visual references, not imported authentication implementations or approval for their signup/social/verification workflows. See [the bounded activation review and handoff](docs/ui/2026-10-10-nevora-new-user-review.md) for the four-option gallery, evidence and release limits.

## Employee home references

- [Luma event list](https://mobbin.com/screens/571bccaf-ded6-4ff9-818b-1a00356d7e85): clear title, location, and date hierarchy.
- [Givingli date card](https://mobbin.com/screens/63358752-d05d-4453-b5e9-fd524e2760ef): compact date tile beside readable event copy.
- [Square workforce overview](https://mobbin.com/screens/db67dd90-e64c-4989-b7d3-f6dd06a0d8bb): restrained surfaces and operational metrics.
- [21st Dashboard Activities](https://21st.dev/@uniquesonu/components/dashboard-activities): agenda row inspiration.
- [21st App Dashboard Layout](https://21st.dev/@shadcnstore/components/app-1): desktop hierarchy option.
- [21st Coach Scheduling Card](https://21st.dev/@isaiahbjork/components/coach-scheduling-card): date/time treatment option.

These are references, not new product workflows. No paid component code or external AI generation was retrieved. Preserve NEVORA's schedule authorization, clock polling, refresh behavior, safe navigation, and unavailable-state messaging.
