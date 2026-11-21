# Motion standard: GSAP

GSAP is NEVORA's default animation engine for anything beyond a single property change. It is already installed:
`gsap` 3.15.0 and `@gsap/react` 2.1.2 (`package.json`). As of 2026-11-21 no file in `src/` imports it yet; existing
motion is CSS transitions and the Web Animations API driven by the `--b-dur-*` and `--b-ease-*` tokens. Don't rewrite
working motion just to switch engines. Use GSAP for new motion, and move existing motion to it only when that component
is already being changed.

## Which tool

| Motion | Tool | Why |
|---|---|---|
| Hover, press, focus, disabled, colour and shadow changes | CSS transitions with tokens | One property, runs on the compositor, no JS cost on every interaction (HIG: avoid extra motion on frequent interactions) |
| Entrances, exits, sheets, dialogs, list stagger, the done mark, number count-ups, layout changes (FLIP), timelines, scroll-linked motion | GSAP | Sequencing, interruption, reversal and cleanup are reliable |
| Loading shimmer and spinner (infinite loops) | CSS keyframes with tokens | Cheap and already built in `b-loading.tsx` |

## Timing and easing tokens

GSAP reads the same values as CSS. Use these numbers, in seconds:

| Token | Value | Use |
|---|---|---|
| `--b-dur-press` / `--b-dur-hover` / `--b-dur-exit` | 0.15 | Press, hover, every exit |
| `--b-dur-note` | 0.24 | An arriving note or toast |
| `--b-dur-enter` | 0.30 | Every entrance |
| `--b-dur-draw` (delay `--b-delay-draw` 0.12) | 0.32 | A check mark drawing |
| `--b-dur-settle` | 0.42 | The success circle settling |
| `--b-dur-ring` (delay `--b-delay-ring` 0.08) | 0.52 | The success ring leaving |

Easing: `--b-ease-settle` cubic-bezier(0.23, 1, 0.32, 1) for entrances and settles; `power2.out` stands in for
`--b-ease-out`. Register the settle curve once with `CustomEase` if exact parity is needed; otherwise use `expo.out`,
which is close. No bounce, elastic or overshoot on work screens. Stagger lists at 0.03–0.05s per item, capped at about
8 items (later items appear with the last staggered one).

Exits are faster than entrances. Nothing in the product animates longer than 0.6s except the loading loops.

## The React pattern

Use `useGSAP` from `@gsap/react` (it scopes and reverts automatically) and `gsap.matchMedia()` for reduced motion. Per
GSAP's docs (https://gsap.com/docs/v3/GSAP/gsap.matchMedia()), a `matchMedia` handler runs when its query matches and
its animations are reverted when it stops matching.

```tsx
"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function ArrivingList({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      { full: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const { reduced } = ctx.conditions as { full: boolean; reduced: boolean };
        gsap.from("[data-arrive]", {
          autoAlpha: 0,
          y: reduced ? 0 : 8,                // HIG: replace movement with a fade
          duration: reduced ? 0.15 : 0.3,
          ease: "expo.out",
          stagger: reduced ? 0 : 0.04,
          clearProps: "transform,opacity,visibility",
        });
      },
    );
  }, { scope });

  return <div ref={scope}>{children}</div>;
}
```

## Rules

1. **Reduced motion always has a path.** Under `prefers-reduced-motion: reduce`: no movement, scale, zoom, parallax,
   blur or depth; a short fade (0.15s or less) or an instant change. Infinite loops stop or slow to a static state.
2. **Animate only `transform` and `opacity`** (`x`, `y`, `scale`, `autoAlpha`). Never animate width, height, top, left
   or box-shadow on a frame loop; use FLIP (`gsap/Flip`) for layout changes.
3. **Never block the person.** Controls work during an animation; a new action interrupts the old timeline
   (`overwrite: "auto"` or `tl.kill()`). Don't gate navigation on `onComplete`.
4. **No hidden content without JS.** Content is visible in the server HTML; animate *from* hidden with `gsap.from`, so a
   failed script never leaves the page blank. `clearProps` after entrances.
5. **Clean up.** Create tweens inside `useGSAP` (or `contextSafe` for event handlers) so they revert on unmount. Remove
   listeners in the `matchMedia` cleanup.
6. **Focus and announcements don't wait for motion.** Move focus and update live regions immediately; motion is
   decoration on top.
7. **Plugins are imported per component** (`gsap/Flip`, `gsap/ScrollTrigger`, `gsap/CustomEase`) and registered once,
   so the bundle stays small. ScrollTrigger is rare in a work app; use it only with a clear reason.
8. **Tests:** components with motion need a reduced-motion test (see `b-loading-motion.test.tsx` for the existing
   pattern) and a browser check with Playwright's `reducedMotion: "reduce"`.
