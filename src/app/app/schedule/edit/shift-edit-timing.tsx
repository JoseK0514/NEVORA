"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { shiftPeriod } from "@/lib/scheduling/periods";
import { NavIcon } from "@/components/nav-icon";

gsap.registerPlugin(useGSAP);

export function shiftDurationLabel(date: string, startTime: string, endTime: string) {
  try {
    const period = shiftPeriod({ date, startTime, endTime });
    const minutes = period.end - period.start;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours ? `${hours} hr` : ""}${hours && remainder ? " " : ""}${remainder ? `${remainder} min` : ""} scheduled${endTime < startTime ? " · Ends next day" : ""}`;
  } catch {
    return "Enter a valid start and end time.";
  }
}

export function ShiftEditTiming({ date, startTime, endTime }: { date: string; startTime: string; endTime: string }) {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const output = useRef<HTMLOutputElement>(null);
  const label = shiftDurationLabel(date, start, end);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(output.current, { y: 2, opacity: 0.65 }, { y: 0, opacity: 1, duration: 0.18, ease: "power1.out" });
    });
    return () => media.revert();
  }, { dependencies: [label], revertOnUpdate: true });

  return <div className="edit-shift-times">
    <div className="edit-shift-fields edit-shift-time-fields">
      <label className="edit-shift-field"><span>Start time</span><input id="edit-shift-start" type="time" name="startTime" value={start} onChange={event => setStart(event.target.value)} required /></label>
      <label className="edit-shift-field"><span>End time</span><input id="edit-shift-end" type="time" name="endTime" value={end} onChange={event => setEnd(event.target.value)} required /></label>
    </div>
    <div className="edit-shift-duration"><NavIcon name="hours" /><output ref={output} htmlFor="edit-shift-start edit-shift-end" aria-live="polite">{label}</output></div>
  </div>;
}
