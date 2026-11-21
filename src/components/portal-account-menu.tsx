"use client";

import type { ReactNode } from "react";
import { ActionMenu } from "./action-menu";

/** The account menu's width on tablets and desktop (upscale S7): a desktop menu, not a phone sheet. */
/** Review B5 (NV-110): 280px so the workspace name has room (it wraps to a second line rather than being cut). */
export const ACCOUNT_MENU_WIDTH = 280;

/** Desktop account menu (avatar, name, account actions) at the top right of
 * every portal page. Phones keep account actions in their existing menus.
 * Round 2 (copy row 99): no "Signed in as" line; the name is on the button.
 * Upscale S7: the menu opens on who is signed in (name, then "Owner · Isla Verde Cafés"), a divider, the destinations,
 * and Sign out last after a second divider. */
/** Phase 3 (TB-009): `current` marks the pill while a page it opens (More, Profile, My pay) is on screen; those pages have
 * no sidebar or rail entry, so the pill is the "where am I" mark (aria-current and a white ring, owner-b-shell.css). */
export function PortalAccountMenu({ initials, name, detail, current = false, children }: { initials: string; name: string; detail?: string; current?: boolean; children: ReactNode }) {
  return <div className="portal-account-menu">
    <ActionMenu id="portal-account-menu" label={name} ariaLabel={`${name}, account menu`} width={ACCOUNT_MENU_WIDTH} triggerCurrent={current}
      triggerIcon={/* The initials are drawn by CSS (b-foundation.css) from data-initials, so the button's text is the name its label says
       * (label in name, WCAG 2.5.3): "Sam Cruz" is on screen and in "Sam Cruz, account menu". */
      <span className="portal-account-avatar" aria-hidden="true" data-initials={initials} />}>
      <div className="portal-account-head">
        <strong className="portal-account-head__name">{name}</strong>
        {detail ? <span className="portal-account-head__detail">{detail}</span> : null}
      </div>
      <div className="nevora-action-menu-divider portal-account-head__divider" />
      {children}
    </ActionMenu>
  </div>;
}
