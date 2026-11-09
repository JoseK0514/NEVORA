/** Reveal a user-initiated result without putting it behind the phone's fixed bars. */
export function revealFeedback(target: HTMLElement) {
  const viewport = window.visualViewport;
  let top = viewport?.offsetTop ?? 0;
  let bottom = top + (viewport?.height ?? window.innerHeight);
  const header = document.querySelector<HTMLElement>('.mobile-header');
  const navigation = document.querySelector<HTMLElement>('.mobile-nav');
  const headerBox = header?.getBoundingClientRect();
  const navigationBox = navigation?.getBoundingClientRect();
  if (headerBox && headerBox.width > 0 && headerBox.height > 0 && headerBox.top <= top) top = Math.max(top, headerBox.bottom);
  if (navigationBox && navigationBox.width > 0 && navigationBox.height > 0) bottom = Math.min(bottom, navigationBox.top);
  top += 8;
  bottom -= 8;
  const box = target.getBoundingClientRect();
  const delta = box.height > bottom - top || box.top < top ? box.top - top : box.bottom > bottom ? box.bottom - bottom : 0;
  if (delta) window.scrollBy({ top: delta, behavior: 'instant' });
  target.focus({ preventScroll: true });
}
