"use client";

import { useSyncExternalStore } from "react";
import { Notice } from "./parts";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { WAVE_A_COPY } from "./wave-a-copy";

const subscribe = (change: () => void) => {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
};

/** IS-WA-11: next to a form's actions, say plainly when the device is offline, so a failed send isn't a mystery. */
export function OfflineNotice() {
  const t = WAVE_A_COPY[usePortalLang()];
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false);
  return offline ? <Notice tone="review" title={t.offlineTitle}>{t.offlineBody}</Notice> : null;
}
