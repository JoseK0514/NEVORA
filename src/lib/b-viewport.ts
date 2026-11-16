/* Direction B viewport aliases (review batch B8, NV-274). The one definition of "phone" for every Direction B layer: the
 * B stylesheets use exactly these media queries (src/app/app/b-viewport.test.ts checks them), and the components that
 * mount a layout by viewport read them from here. A phone held sideways (844×390, 932×430) is not a phone: like a tablet,
 * it gets the tablet layout ("small desktop" with the icon rail). Touch-only refinements use (pointer: coarse) on top. */

/** Phones held upright: the B phone screen, its floating header and the tab bar. */
export const B_PHONE = "(max-width: 767px)";
/** Tablets and desktop, a phone held sideways included: the sidebar or rail, the flat teal top bar, the band. */
export const B_WIDE = "(min-width: 768px)";
/** The tablet range of B_WIDE: the icon rail and the narrower grid. */
export const B_TABLET = "(min-width: 768px) and (max-width: 1023px)";
/** Desktop from 1024px. */
export const B_DESKTOP = "(min-width: 1024px)";
