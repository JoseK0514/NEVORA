# 21 Product Designer — brand: crafted and ownable, or generic?

**Verdict.** The v3 Manager and Owner screens no longer look AI-made. The restraint works, and nothing on them reads as a template. But they also don't read as NEVORA. On a phone, the only brand left is a teal tint. The things v3 relies on to carry the brand (the app icon, the launch screen, the wordmark and the login page) are the weakest and most AI-looking assets in the product. The app icon is a glowing blue flame, the wordmark is a traced PNG with a cyan accent, the login photo is a blue AI image tinted toward teal with a CSS filter, and the Employee app still uses the dark gradient hero that v3 banned. My estimate of brand distinctiveness is about 4/10 today. About 8/10 is reachable without changing a single approved v3 layout.

## Recommendations

1. **Replace the app icon with a teal NEVORA mark built from the wordmark's "Λ + delta" A, and add a launch screen and a favicon.**
   - **Why:** v3 says that on phones the wordmark "lives in the app icon and launch screen" (`docs/product/specs/clean-manager/spec.md:19`). But the installed icon is `public/icons/fuel-192/512/maskable/apple-180.png`, wired in `src/lib/notifications/manifest.ts:21-26` and `src/app/app/layout.tsx:39`. It shows a blue (#0756D9-range) glowing gradient flame on white, and it also appears as `public/images/nevora-icon.png` in `BrandMark`. Glows and gradients are on the v3 "must not come back" list (`spec.md:11`). The icon also clashes with `theme_color #1C4A47`. No startup image is defined, so the phone has no on-brand NEVORA moment at all.
   - **Impact:** High. **Effort:** M. **Owner:** Product (approve the mark), then UI.

2. **Redraw the wordmark as a true vector SVG with a teal delta, and size it to the v3 mockup.**
   - **Why:** `BrandWordmark` (`src/components/brand-mark.tsx:31-56`) masks `nevora-wordmark.png` through an `feColorMatrix` filter, and the coloured part is a clip rectangle at `x=812 y=74` showing the PNG's cyan (#43CCFB). Cyan is not NEVORA teal. The rasterised edges soften at small sizes. In the sidebar, the build shows the wordmark at about 130px and full weight (`QAOWNER-home-1440.png`), while the approved mockup (`mockups/png/home-owner-1440.png`) uses a small, quiet, letter-spaced mark.
   - **Impact:** High. **Effort:** S–M. **Owner:** UI. Jose confirms the teal delta.

3. **Use one teal, and remove the leftover blues.**
   - **Why:** Three different teals are live: `--g-accent #077572` (`portal-gusto.css:6`), `--cm-tint #087571` (`premium-clean-manager.css:9`) and the masthead `#1C4A47`. The old cobalt `#0756D9` is still the primary or link colour in `portal-refinement.css:5,7`, `mobile-workforce.css:21` and `globals.css:13748/13759/13773`. iOS blue `#007AFF` fills a More icon (`premium-clean-manager.css:250`). Across `src/app` and `src/components` there are 302 unique hex values. Semantic colours also drift between viewports: Home "Open shifts" is an orange tile on the phone but a red tint on desktop, and "Time-off" is teal on the phone but grey on desktop (`QAOWNER-home-390.png` vs `-1440.png`).
   - **Impact:** High. **Effort:** M. **Owner:** UI.

4. **Rebuild the sign-in family around a flat teal masthead, the Λ motif, an EN/ES switch and a neutral "Sign in" title.**
   - **Why:** `/login` uses `login-daylight-blue-v2.png`, an AI-rendered stock-style blue glass corridor. It is made teal with `filter: hue-rotate(-38deg)` (`src/app/login/auth-refinement.css:291`), so it sits next to the cyan A and a teal button. It is generic corporate imagery with nothing of Puerto Rico in it. The page title "Employee login" (`login/page.tsx:35`) is wrong for Owners and Managers, and the "Sign In" button uses title case. The team already has a stronger direction: the earlier board `qa-out/p4boards/login.png` (teal masthead, Λ peak, EN/ES). Adopt it, but show the Face ID card only if passkeys really exist, because promising a feature we don't have breaks the trust rule. Apply the same treatment to forgot-access, activate and reset.
   - **Impact:** High. **Effort:** M. **Owner:** UI. Product decides on Face ID.

5. **Bring the Employee and Lead app into the v3 brand grammar.**
   - **Why:** `AUDIT-E-emp-home-390/1440.png` still has the dark gradient hero, the "Good morning · Hi, Alexandra." greeting, the Inter type, a watermark triangle and a wordmark on every phone page. Every one of these is on the v3 banned list (`spec.md:11`). Today the Manager and Employee apps look like two different products from two different vendors. Keep the one genuinely ownable line, "Times in Puerto Rico time".
   - **Impact:** High. **Effort:** L. **Owner:** Product schedules it, then UI.

6. **Make the Λ delta NEVORA's single signature, and use it only at the app's few landmark moments.**
   - **Why:** Without a signature, v3 is just iOS Settings in teal. The delta is already in the wordmark and can be owned. Put it on the icon, the launch screen, the login masthead, the "All caught up" empty state and the one celebration. Replace the 12-particle burst in `src/components/celebration.tsx:7-10` with a single teal delta or check that draws in once in about 400ms and stays static under reduced motion. The current burst is used on schedule publish (`schedule/page.tsx:372`) and on a cleared Inbox (`manager-inbox.tsx:396`), and a generic confetti burst is a template tell. Never use the delta inside lists, tabs or rows, so the v3 layouts stay untouched.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

7. **Merge the empty states into one component and drop the AI sparkle.**
   - **Why:** There are two `EmptyState` implementations (`src/components/empty-state.tsx:10` and `src/app/app/settings/wave-c-kit.tsx:82`). Most empty states are a grey tile with a Phosphor icon. The spot illustrations are used in only three places. The `payday` drawing includes the four-point sparkle (`src/components/illustrations/index.tsx`, payday path), the most recognisable "AI feature" glyph there is. The illustrations also hard-code `#FFFFFF` fills, which will break in dark mode. The Team empty state shows "Clear filters" twice (`qa-out/r4-settings/fx/empty-employees-chromium-390-100.png`). Redraw the six spot illustrations in Phosphor's line geometry with the teal accent and no sparkle.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

8. **Retire the three abandoned art directions, and rewrite the asset README so future agents don't regenerate them.**
   - **Why:** `public/assets/README.md` and `manifest.json` still tell contributors to make art with "Built-in image_gen" in two styles: orange `#ED724C` flat editorial (`workday.png`, `schedule.png`) and cobalt/cyan folded paper. Neither is teal or v3. The live auth images are a third style (photographic glass). This file is the main way AI-looking art keeps coming back.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI writes the document, Jose approves the rule.

9. **Clean up the brand chrome: move the parent-company credit out of the app, and rename the leftover "fuel / nuvora / coffee / gusto" names.**
   - **Why:** Every Manager page ends its sidebar with "Powered by VELANI LLC" (`src/components/app-shell.tsx:275`). The v3 mockup puts the signed-in user in that spot instead. Move the credit to the login footer and Settings › About. Leftover names are publicly visible: `/fuel-portal.webmanifest`, `fuel-*.png` icons, `NUVORA_BRAND` (`src/lib/brand.ts:1`), and `--fuel-coffee` / `--soft-caramel` tokens. Anyone who views the source sees a reskinned template.
   - **Impact:** Low. **Effort:** M. **Owner:** UI.

10. **Treat Spanish-first as a brand feature, not just a setting.**
    - **Why:** `TEAM-RULES.md:9-10` names full Spanish as what sets NEVORA apart. But `<html lang="en">` is hard-coded (`src/app/layout.tsx:27`), and outside the Clocker and payroll settings no Spanish UI was found. The sign-in page has no language switch. Recommendation 4 gives a visible first step (an EN/ES switch on login). The real investment is a Spanish build of the v3 screens.
    - **Impact:** High. **Effort:** L. **Owner:** Product.

## What's good
- The v3 Manager and Owner phone screens (`QAOWNER-home/inbox/team-390.png`) fully avoid the AI tells: no glass, no gradients, no decorative numbers, no greeting. They feel native and calm, which is the right base to build a brand on.
- The approved v3 keeps Phosphor icons as one consistent family (regular weight in the desktop sidebar, filled in the phone tab bar). This is a solid, non-default icon choice worth protecting.
- `Celebration` already has the right limits: it plays once per session, only for server-confirmed results, never for money or payroll, and it is hidden from assistive tech and off under reduced motion. Only the visual needs to change.

## Not checked / limits
- Browser use was not allowed for this review. I didn't check motion timing, dark mode or the installed PWA icon on a real device; all findings come from code and static screenshots.
- The Next.js dev badge (black "N" circle) in the review screenshots covers the phone Home tab and the desktop "Powered by" line. It is a capture artifact, not a product issue, but it hides the active-tab state in the evidence.
- I couldn't confirm whether `qa-out/p4boards/login.png` is an approved direction or only an exploration. I treated it as a candidate.
- I didn't test custom company brand colours (the brand editor and masthead) against the teal-unification proposal.
