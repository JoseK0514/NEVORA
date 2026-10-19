"use client";

import { useState } from "react";
import { shiftPeriod } from "@/lib/scheduling/periods";
import { durationText } from "@/lib/duration-text";
import { Field, FieldPair } from "@/components/wave-a/parts";

export function shiftDurationLabel(date: string, startTime: string, endTime: string) {
  try {
    const period = shiftPeriod({ date, startTime, endTime });
    return `${durationText(period.end - period.start)} scheduled${endTime < startTime ? " · Ends next day" : ""}`;
  } catch {
    return "Enter a valid start and end time.";
  }
}

export function ShiftEditTiming({ date, startTime, endTime }: { date: string; startTime: string; endTime: string }) {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const label = shiftDurationLabel(date, start, end);

  return <>
    <FieldPair short>
      <Field label="Starts"><input id="edit-shift-start" type="time" name="startTime" value={start} onChange={event => setStart(event.target.value)} required /></Field>
      <Field label="Ends"><input id="edit-shift-end" type="time" name="endTime" value={end} onChange={event => setEnd(event.target.value)} required /></Field>
    </FieldPair>
    <output className="wa-hint" htmlFor="edit-shift-start edit-shift-end" aria-live="polite">{label}</output>
  </>;
}
