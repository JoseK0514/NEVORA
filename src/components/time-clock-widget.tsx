"use client";

import { formatBusinessClock } from "../lib/business-time";
import { useEffect, useState } from "react";

export function formatTimeClockDisplay(value: Date, timeZone: string) {
  return formatBusinessClock(value, timeZone);
}

export function formatActiveShiftDuration(startedAt: number, now: number) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - startedAt) / (60 * 1_000)),
  );
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function TimeClockWidget({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [shiftStartedAt, setShiftStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();
    const timer = window.setInterval(updateClock, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const clockedIn = shiftStartedAt !== null;
  const elapsed = clockedIn
    ? formatActiveShiftDuration(shiftStartedAt, now?.getTime() ?? shiftStartedAt)
    : null;

  function toggleClock() {
    setShiftStartedAt((current) => (current === null ? Date.now() : null));
  }

  return (
    <section className="manager-home-card time-clock-card">
      <div className="manager-home-card-header time-clock-header">
        <h2>Time Clock</h2>
        {elapsed ? (
          <span className="time-clock-status">Active Shift: {elapsed}</span>
        ) : null}
      </div>

      <div className="time-clock-body">
        <time className="time-clock-display" aria-live="off">
          {now ? formatTimeClockDisplay(now, timeZone) : "--:--:-- --"}
        </time>

        <div className="time-clock-actions">
          <button
            className={
              clockedIn
                ? "time-clock-button clock-out"
                : "time-clock-button clock-in"
            }
            type="button"
            onClick={toggleClock}
          >
            {clockedIn ? "Clock Out" : "Clock In"}
          </button>
          <button className="time-clock-button break" type="button">
            Start Break
          </button>
        </div>
      </div>
    </section>
  );
}
