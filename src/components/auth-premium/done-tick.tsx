/** The signed-out pages' copy of the app's one done mark (`BDoneMark`, src/components/owner-b/b-kit.tsx). These pages are
 * outside the app shell, so the kit's mark and b-moments.css do not reach them: this is the same tick (one round-capped
 * stroke with pathLength 1) for the 56px finish circle, and auth-b.css ("The done mark") paints the circle from the same
 * tokens. Decorative: the heading beside it carries the result. */
export function AuthDoneTick() {
  return <svg className="q-done-tick" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M5.5 12.75l4.25 4.25L18.5 7.75" pathLength={1} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
