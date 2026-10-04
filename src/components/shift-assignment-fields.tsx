"use client";
import { useState } from "react";
import type { Employee, Position } from "@/lib/domain";
export function ShiftAssignmentFields({
  employees,
  positions,
  employeeId = "",
  positionId = "",
  newShift = false,
}: {
  employees: Employee[];
  positions: Position[];
  employeeId?: string;
  positionId?: string;
  newShift?: boolean;
}) {
  const [selectedEmployee, setEmployee] = useState(employeeId),
    [selectedPosition, setPosition] = useState(positionId);
  const employee = employees.find((e) => e.id === selectedEmployee);
  const choices = positions.filter(
    (p) => p.active && employee?.positionIds?.includes(p.id),
  );
  const retained =
    selectedPosition && !choices.some((p) => p.id === selectedPosition);
  return (
    <>
      <label className={newShift ? "new-shift-field" : undefined}>
        <span>Employee</span>
        <select
          name="employeeId"
          value={selectedEmployee}
          required
          onChange={(event) => {
            setEmployee(event.target.value);
          }}
        >
          <option value="" disabled>
            Select employee
          </option>
          {employees
            .filter((e) => e.active)
            .map((e) => (
              <option value={e.id} key={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
        </select>
      </label>
      <label className={newShift ? "new-shift-field" : undefined}>
        <span>
          Position <small>Optional</small>
        </span>
        <select
          name="positionId"
          value={selectedPosition}
          onChange={(event) => setPosition(event.target.value)}
        >
          <option value="">No position</option>
          {choices.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
          {retained ? (
            <option value={selectedPosition} disabled>
              {positions.find((p) => p.id === selectedPosition)?.name ??
                "Existing position"}{" "}
              (unavailable)
            </option>
          ) : null}
        </select>
        {/* A disabled selected option is omitted by native FormData. Preserve the
            explicit choice for server validation until the user changes it. */}
        {retained ? <input type="hidden" name="positionId" value={selectedPosition} /> : null}
      </label>
    </>
  );
}
