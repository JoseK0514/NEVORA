"use client";

import type { ReactNode } from "react";
import { ActionMenu } from "./action-menu";

/** Desktop account menu (avatar, name, account actions) at the top right of
 * every portal page. Phones keep account actions in their existing menus.
 * Round 2 (copy row 99): no "Signed in as" line; the name is on the button. */
export function PortalAccountMenu({ initials, name, children }: { initials: string; name: string; children: ReactNode }) {
  return <div className="portal-account-menu">
    <ActionMenu id="portal-account-menu" label={name} ariaLabel={`${name}, account menu`}
      triggerIcon={<span className="portal-account-avatar" aria-hidden="true">{initials}</span>}>
      {children}
    </ActionMenu>
  </div>;
}
