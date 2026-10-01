"use client";

import { useEffect, useState } from "react";
import {
  applyKioskPinKey,
  formatBreakCountdown,
  formatElapsedDuration,
  formatKioskDate,
  formatKioskTime,
} from "@/lib/clocker-kiosk";

const PIN_KEYS = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "clear", "0", "delete",
];

const BREAK_LENGTH_MS = 15 * 60 * 1_000;
const DEMO_SHIFT = "8:00 AM – 4:00 PM";

export function ClockerKiosk({
  locationLabel,
}: {
  locationLabel: string;
}) {  const [now, setNow] = useState<Date | null>(null);
  const [pin, setPin] = useState("");
  const [recognized, setRecognized] = useState(false);
  const [onFloor, setOnFloor] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [clockInAt, setClockInAt] = useState<number | null>(null);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();
    const timer = window.setInterval(updateClock, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pin.length !== 4) return;

    const timer = window.setTimeout(() => {
      setRecognized(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [pin]);  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      setSuccess(null);
      setRecognized(false);
      setPin("");
    }, 3_000);

    return () => window.clearTimeout(timer);
  }, [success]);

  const shiftDuration =
    onFloor && clockInAt && now
      ? formatElapsedDuration(clockInAt, now.getTime())
      : "00h 00m";
  const breakCountdown =
    onBreak && breakEndsAt && now
      ? formatBreakCountdown(breakEndsAt, now.getTime())
      : "15:00";

  function handlePinKey(key: string) {
    if (recognized || success) return;
    setPin((current) => applyKioskPinKey(current, key));
  }

  function punchTime() {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Puerto_Rico",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  }  function showSuccess(label: string) {
    setSuccess(`${label} at ${punchTime()} · ${locationLabel}`);
  }

  function clockIn() {
    setClockInAt(Date.now());
    setOnFloor(true);
    setOnBreak(false);
    setBreakEndsAt(null);
    showSuccess("Clocked In");
  }

  function toggleBreak() {
    if (onBreak) {
      setOnBreak(false);
      setBreakEndsAt(null);
      showSuccess("Break Ended");
      return;
    }

    setOnBreak(true);
    setBreakEndsAt(Date.now() + BREAK_LENGTH_MS);
    showSuccess("Break Started");
  }

  function clockOut() {
    setOnFloor(false);
    setOnBreak(false);
    setClockInAt(null);
    setBreakEndsAt(null);
    showSuccess("Clocked Out");
  }  return (
    <main className="clocker-terminal-page">
      <section className="clocker-terminal-card">
        <header className="clocker-terminal-header">
          <span className="clocker-terminal-location">
            {locationLabel}
          </span>
          <time className="clocker-terminal-time" aria-live="off">
            {now ? formatKioskTime(now) : "--:--:-- --"}
          </time>
          <span className="clocker-terminal-date">
            {now ? formatKioskDate(now) : "Loading date"}
          </span>
        </header>

        {!recognized ? (
          <section className="clocker-terminal-pin-view">
            <div className="clocker-terminal-copy">
              <h1>Enter your PIN</h1>
              <p>Use your 4-digit employee PIN to continue.</p>
            </div>

            <div
              className="clocker-terminal-pin-dots"
              aria-label={`${pin.length} of 4 PIN digits entered`}
            >              {[0, 1, 2, 3].map((index) => (
                <span
                  className={index < pin.length ? "filled" : ""}
                  key={index}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div
              className="clocker-terminal-keypad"
              aria-label="PIN keypad"
            >
              {PIN_KEYS.map((key) => {
                const utility = key === "clear" || key === "delete";

                return (
                  <button
                    className={
                      utility
                        ? "clocker-terminal-key utility"
                        : "clocker-terminal-key"
                    }
                    type="button"
                    onClick={() => handlePinKey(key)}
                    key={key}
                    aria-label={
                      key === "clear"
                        ? "Clear PIN"
                        : key === "delete"
                          ? "Delete last digit"
                          : `Number ${key}`
                    }
                  >                    {key === "clear"
                      ? "Clear"
                      : key === "delete"
                        ? <span aria-hidden="true">⌫</span>
                        : key}
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="clocker-terminal-state-view">
            <div className="clocker-terminal-state-heading">
              <span className="clocker-terminal-verified" aria-hidden="true">
                ✓
              </span>
              <div>
                <span>Employee verified</span>
                <h1>
                  {!onFloor
                    ? "Ready to clock in"
                    : onBreak
                      ? "You’re on break"
                      : "You’re clocked in"}
                </h1>
              </div>
            </div>

            <div className="clocker-terminal-timeline">
              <div className="clocker-terminal-timeline-row">
                <span>Scheduled Today</span>
                <strong>{DEMO_SHIFT}</strong>
              </div>              {onFloor ? (
                <div className="clocker-terminal-timeline-row">
                  <span>Current Shift</span>
                  <strong>{shiftDuration}</strong>
                </div>
              ) : null}

              {onBreak ? (
                <div className="clocker-terminal-break-card">
                  <span>Break Remaining</span>
                  <strong>{breakCountdown}</strong>
                  <small>15-minute break</small>
                </div>
              ) : null}
            </div>

            <div className="clocker-terminal-actions">
              {!onFloor ? (
                <button
                  className="clocker-terminal-action primary"
                  type="button"
                  onClick={clockIn}
                >
                  Clock In
                </button>
              ) : (
                <>
                  <button
                    className="clocker-terminal-action secondary"
                    type="button"
                    onClick={toggleBreak}
                  >                    {onBreak ? "End Break" : "Start Break"}
                  </button>
                  <button
                    className="clocker-terminal-action danger"
                    type="button"
                    onClick={clockOut}
                  >
                    Clock Out
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </section>

      {success ? (
        <div className="clocker-terminal-success" role="status">
          <div className="clocker-terminal-success-badge">
            <span aria-hidden="true">✓</span>
            <strong>{success}</strong>
            <small>Ready for the next employee in 3 seconds.</small>
          </div>
        </div>
      ) : null}
    </main>
  );
}
