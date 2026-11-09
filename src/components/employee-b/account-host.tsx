import type {ReactNode} from 'react';
import './account.css';

/** A Direction B screen for a page whose own layout isn't a corporate page (a Quiet page): this host goes right before
 * that page, and on a phone under the shell's data-nv-b it shows the screen and hides what follows it (a `b-keep`
 * sibling stays). Elsewhere the host is not displayed (account.css). */
export function BHost({children}: {children: ReactNode}) {
  return <div className="c-page c-embed eb-host">{children}</div>;
}

/** Marks a screen whose header shows no bell or avatar (More, where your face is in the hero; Notifications itself). */
export const NoHeaderActions = () => <i className="eb-noacts" hidden />;

/** The element of a pair that is on screen (the phone screen or the corporate layout; CSS shows one of them), else the
 * first one that exists, as before there were two. */
export function shown<T extends HTMLElement>(...elements: (T | null | undefined)[]): T | null {
  const present = elements.filter((element): element is T => !!element);
  return present.find(element => element.getClientRects().length > 0) ?? present[0] ?? null;
}
