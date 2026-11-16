"use client";
import { useEffect, useState } from "react";
import { offlineListener } from "@/lib/offline-hold";
import { createMonitorController, fetchClockMonitor, type MonitorPanelState } from "@/lib/clock-monitor-client";

/** The open clock-ins, from the same read and lifecycle the Attendance monitor uses (paused while hidden or offline).
 * Clean Manager (v3): Home's "Working now" lists these, so people who clocked in off a published shift show too. */
export function useClockMonitor(): MonitorPanelState {
  const [state, setState] = useState<MonitorPanelState>({ monitor: null, refreshing: true, paused: false });
  useEffect(() => {
    const monitor = createMonitorController(setState, fetchClockMonitor);
    let mounted = true;
    const sync = () => { if (document.visibilityState === "hidden" || !navigator.onLine) monitor.pause(); else monitor.start(); };
    const pause = () => monitor.pause();
    // Review B2 (NV-001): offline keeps the loaded clock-ins on screen (read-only) unless the person stepped away.
    const offline = offlineListener({ pause, hold: () => monitor.hold() });
    document.addEventListener("visibilitychange", sync); window.addEventListener("online", sync); window.addEventListener("offline", offline);
    window.addEventListener("pagehide", pause); window.addEventListener("pageshow", sync); window.addEventListener("focus", sync); window.addEventListener("storage", sync);
    // Defer the first start; StrictMode's cleanup invalidates the first instance.
    void Promise.resolve().then(() => { if (mounted) sync(); });
    return () => {
      mounted = false; monitor.stop();
      document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); window.removeEventListener("offline", offline);
      window.removeEventListener("pagehide", pause); window.removeEventListener("pageshow", sync); window.removeEventListener("focus", sync); window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
