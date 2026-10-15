"use client";

import type { ReactNode } from "react";
import { ActionMenu } from "./action-menu";

/** Desktop account menu (avatar, name, account actions) at the top right of
 * every portal page. Phones keep account actions in their existing menus. */
export function PortalAccountMenu({ initials, name, children }: { initials: string; name: string; children: ReactNode }) {
  return <div className="portal-account-menu">
    <ActionMenu id="portal-account-menu" label={name} ariaLabel="Account menu"
      triggerIcon={<span className="portal-account-avatar" aria-hidden="true">{initials}</span>}>
      <p className="portal-account-heading">Signed in as {name}</p>
      {children}
    </ActionMenu>
  </div>;
}
