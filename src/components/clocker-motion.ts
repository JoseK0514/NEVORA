/* The kiosk's motion for the name picker (Clocker UI step 3, Option C; Jose, Nov 25, 2026: more premium through motion
 * only). GSAP per the design OS (references/motion-gsap.md): transform and opacity only, the b-tokens durations, expo.out
 * for the settle curve, nothing over 0.6s, nothing that blocks a tap or moves layout. Every function has a reduced-motion
 * path: under prefers-reduced-motion it changes nothing and returns null (the state is already drawn by CSS and React). The
 * caller kills what it gets back on unmount or a screen change. */
import gsap from 'gsap';

export type Motion = gsap.core.Tween | gsap.core.Timeline | null;
/** Durations from b-tokens.css, in seconds. */
export const CK_MOTION = { exit: 0.15, note: 0.24, enter: 0.3, drawDelay: 0.12, draw: 0.32, settle: 0.42, stagger: 0.02, staggerCap: 8 } as const;
/** The only properties these tweens may touch (compositor-only). */
export const CK_MOTION_PROPS = ['x', 'y', 'scale', 'opacity', 'strokeDashoffset'] as const;

export function prefersReducedMotion() {
  try { return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/** Entering sign-in: the tiles settle in, opacity and 6px, 0.02s apart and capped at 8 steps, so the last starts by 0.14s
 * and all are done by about 0.38s. Opacity, not visibility, so a tile can be tapped at once. */
export function settleTiles(tiles: Element[], reduced: boolean): Motion {
  if (reduced || !tiles.length) return null;
  return gsap.from(tiles, { opacity: 0, y: 6, duration: CK_MOTION.note, ease: 'expo.out', overwrite: 'auto', clearProps: 'opacity,transform',
    stagger: { each: CK_MOTION.stagger, amount: Math.min(tiles.length - 1, CK_MOTION.staggerCap - 1) * CK_MOTION.stagger } });
}

type Box = { left: number; top: number; width: number; height: number };
/** The shared element (FLIP): the name is drawn at its new place, then moved from where it was. Tile to PIN header, and
 * back again on "Choose another name". */
export function flipName(el: Element, from: Box, to: Box, reduced: boolean): Motion {
  if (reduced) return null;
  const x = from.left + from.width / 2 - (to.left + to.width / 2), y = from.top + from.height / 2 - (to.top + to.height / 2);
  if (Math.abs(x) < 1 && Math.abs(y) < 1) return null;
  const scale = to.height > 0 ? Math.max(0.8, Math.min(1.25, from.height / to.height)) : 1;
  return gsap.from(el, { x, y, scale, duration: CK_MOTION.enter, ease: 'expo.out', overwrite: 'auto', clearProps: 'transform' });
}

/** A PIN digit: its dot fills with a soft spring (a slight 1.2 overshoot, the only one on the kiosk; Jose asked for it). */
export function fillDot(dot: Element, reduced: boolean): Motion {
  if (reduced) return null;
  return gsap.fromTo(dot, { scale: 0.55 }, { scale: 1, duration: CK_MOTION.note, ease: 'back.out(1.2)', overwrite: 'auto', clearProps: 'transform' });
}

/** A wrong PIN: the dots shake gently sideways once (6px, then less), beside the error text, never instead of it. */
export function shakeDots(slots: Element, reduced: boolean): Motion {
  if (reduced) return null;
  return gsap.timeline({ defaults: { duration: 0.05, ease: 'power1.inOut', overwrite: 'auto' }, onComplete: () => { gsap.set(slots, { clearProps: 'transform' }); } })
    .to(slots, { x: -6 }).to(slots, { x: 5 }).to(slots, { x: -3 }).to(slots, { x: 2 }).to(slots, { x: 0, duration: 0.06 });
}

/** Verified: the kit's done mark settles and draws its tick, then the greeting arrives. Focus and the heading's text are
 * there at once; this is only paint. */
export function drawDone(mark: Element, tick: Element | null, greeting: Element | null, reduced: boolean): Motion {
  if (reduced) return null;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out', overwrite: 'auto' } });
  tl.from(mark, { scale: 0.6, opacity: 0, duration: CK_MOTION.enter, clearProps: 'transform,opacity' }, 0);
  if (tick) tl.fromTo(tick, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: CK_MOTION.draw, clearProps: 'strokeDashoffset' }, CK_MOTION.drawDelay);
  if (greeting) tl.from(greeting, { opacity: 0, y: 4, duration: CK_MOTION.note, clearProps: 'transform,opacity' }, CK_MOTION.drawDelay + 0.08);
  return tl;
}

export function stopMotion(...motions: Motion[]) { for (const m of motions) m?.kill(); }
