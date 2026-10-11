import { gsap } from "gsap";

/** Artwork-only motion. The same controller drives the local visual export. */
export function createLoginMotion(panel: HTMLElement, available: (enabled: boolean) => void) {
  const media = gsap.matchMedia();
  let paused = false;
  let visible = true;
  let scene: gsap.core.Timeline | undefined;
  let stopPointer: (() => void) | undefined;
  const update = () => {
    if (paused || !visible || document.hidden) scene?.pause();
    else scene?.resume();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }, { threshold: 0.1 });
  observer.observe(panel);
  document.addEventListener("visibilitychange", update);

  media.add("(prefers-reduced-motion: no-preference)", () => {
    scene = gsap.timeline()
      .from(".login-visual-art", {
        opacity: 0.7, scale: 0.91, y: 28, rotation: -4,
        duration: 1.3, ease: "expo.out",
      }, 0)
      .from(".login-visual-line", {
        clipPath: "inset(0 0 22% 0)", y: 12, opacity: 0.7,
        duration: 0.8, ease: "expo.out",
      }, 0)
      .to(".login-visual-art", {
        y: -12, rotation: 1.2, scale: 1.025,
        duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut",
      });
    available(true);
    update();
    return () => { scene = undefined; available(false); };
  }, panel);
  media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 800px)", () => {
    const stage = panel.querySelector(".login-visual-art-stage");
    if (!stage) return;
    const x = gsap.quickTo(stage, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(stage, "y", { duration: 0.5, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      if (paused) return;
      const box = panel.getBoundingClientRect();
      x(((event.clientX - box.left) / box.width - 0.5) * 16);
      y(((event.clientY - box.top) / box.height - 0.5) * 12);
    };
    const reset = () => { if (!paused) { x(0); y(0); } };
    stopPointer = () => { x.tween.pause(); y.tween.pause(); };
    panel.addEventListener("pointermove", move);
    panel.addEventListener("pointerleave", reset);
    return () => {
      panel.removeEventListener("pointermove", move);
      panel.removeEventListener("pointerleave", reset);
      stopPointer = undefined;
    };
  }, panel);
  return {
    setPaused(value: boolean) { paused = value; if (value) stopPointer?.(); update(); },
    destroy() { observer.disconnect(); document.removeEventListener("visibilitychange", update); media.revert(); },
  };
}
