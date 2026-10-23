type LifecycleController = {
  start: () => void;
  pause: () => void;
  stop: () => void;
};
type PageDocument = Pick<
  Document,
  "addEventListener" | "removeEventListener" | "visibilityState" | "hasFocus"
>;
/** Lifecycle is independent of React renders and never remounts the controller. */
export function bindAdvisorLifecycle(
  c: LifecycleController,
  win: EventTarget,
  doc: PageDocument,
  online: () => boolean,
) {
  let signedOut = false;
  const pause = () => c.pause();
  const resume = () => {
    if (
      !signedOut &&
      doc.visibilityState !== "hidden" &&
      online() &&
      doc.hasFocus()
    )
      c.start();
  };
  const visibility = () => {
    pause();
    resume();
  };
  const focus = (e: Event) => {
    if (e.target === win) resume();
  };
  const signout = () => {
    signedOut = true;
    pause();
    c.stop();
  };
  doc.addEventListener("visibilitychange", visibility);
  for (const name of ["blur", "pagehide", "offline"])
    win.addEventListener(name, pause);
  for (const name of ["pageshow", "online", "storage"])
    win.addEventListener(name, visibility);
  win.addEventListener("focus", focus);
  win.addEventListener("nevora:signout", signout);
  resume();
  return () => {
    c.stop();
    doc.removeEventListener("visibilitychange", visibility);
    for (const name of ["blur", "pagehide", "offline"])
      win.removeEventListener(name, pause);
    for (const name of ["pageshow", "online", "storage"])
      win.removeEventListener(name, visibility);
    win.removeEventListener("focus", focus);
    win.removeEventListener("nevora:signout", signout);
  };
}
