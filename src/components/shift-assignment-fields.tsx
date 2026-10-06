"use client";

import { useState } from "react";
import { SelectField } from "./select-field";
import type { Employee, Position } from "../lib/domain";

export function positionAfterEmployeeChange({
  positionId,
  nextEmployeeId,
  employees,
  positions,
}: {
  positionId: string;
  nextEmployeeId: string;
  employees: Employee[];
  positions: Position[];
}) {
  if (!positionId) return "";
  const nextEmployee = employees.find((item) => item.id === nextEmployeeId);
  const remainsValid = positions.some(
    (position) =>
      position.id === positionId &&
      position.active &&
      nextEmployee?.positionIds?.includes(position.id),
  );
  return remainsValid ? positionId : "";
}

export function designatedLeadAfterEmployeeChange({
  checked,
  nextEmployeeId,
  employees,
}: {
  checked: boolean;
  nextEmployeeId: string;
  employees: Employee[];
}) {
  if (!checked) return false;
  const nextEmployee = employees.find((item) => item.id === nextEmployeeId);
  return (
    nextEmployee?.active === true &&
    ["OWNER", "MANAGER", "LEAD"].includes(nextEmployee.role)
  );
}

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
  const [selectedEmployee, setEmployee] = useState(employeeId);
  const [selectedPosition, setPosition] = useState(positionId);
  const employee = employees.find((item) => item.id === selectedEmployee);
  const choices = positions.filter(
    (position) => position.active && employee?.positionIds?.includes(position.id),
  );
  const retained =
    !!selectedPosition &&
    !choices.some((position) => position.id === selectedPosition);

  return (
    <>
      <SelectField
        className={newShift ? "new-shift-field" : undefined}
        name="employeeId"
        label="Employee"
        value={selectedEmployee}
        required
        onChange={(event) => {
          const nextEmployeeId = event.target.value;
          setEmployee(nextEmployeeId);
          setPosition((current) =>
            positionAfterEmployeeChange({
              positionId: current,
              nextEmployeeId,
              employees,
              positions,
            }),
          );
          const leadField =
            event.currentTarget.form?.elements.namedItem("isDesignatedLead");
          if (leadField instanceof HTMLInputElement) {
            leadField.checked = designatedLeadAfterEmployeeChange({
              checked: leadField.checked,
              nextEmployeeId,
              employees,
            });
          }
        }}
        options={[
          { value: "", label: "Select employee", disabled: true },
          ...employees
            .filter((item) => item.active)
            .map((item) => ({
              value: item.id,
              label: `${item.firstName} ${item.lastName}`,
            })),
        ]}
      />
      <SelectField
        className={newShift ? "new-shift-field" : undefined}
        name="positionId"
        label={
          <>
            Position <small>Optional</small>
          </>
        }
        value={selectedPosition}
        onChange={(event) => setPosition(event.target.value)}
        options={[
          { value: "", label: "No position" },
          ...choices.map((position) => ({
            value: position.id,
            label: position.name,
          })),
          ...(retained
            ? [{
                value: selectedPosition,
                label: `${positions.find((position) => position.id === selectedPosition)?.name ?? "Existing position"} (unavailable)`,
                disabled: true,
              }]
            : []),
        ]}
      />
      {retained ? (
        <input type="hidden" name="positionId" value={selectedPosition} />
      ) : null}
    </>
  );
}
