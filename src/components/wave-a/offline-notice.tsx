"use client";

import { useSyncExternalStore } from "react";
import { Notice } from "./parts";

const subscribe = (change: () => void) => {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
};

/** IS-WA-11: next to a form's actions, say plainly when the device is offline, so a failed send isn't a mystery. */
export function OfflineNotice() {
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false);
  return offline ? <Notice tone="review" title="You’re offline">Nothing can be sent until you’re back online. What you’ve entered stays here.</Notice> : null;
}
