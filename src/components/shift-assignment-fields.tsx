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
  onSelectionChange,
}: {
  employees: Employee[];
  positions: Position[];
  employeeId?: string;
  positionId?: string;
  onSelectionChange?: (selection: { employeeId: string; positionId: string }) => void;
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
        className="wa-select"
        name="employeeId"
        label="Person"
        value={selectedEmployee}
        required
        onChange={(event) => {
          const nextEmployeeId = event.target.value;
          const nextPositionId = positionAfterEmployeeChange({
            positionId: selectedPosition, nextEmployeeId, employees, positions,
          });
          setEmployee(nextEmployeeId);
          setPosition(nextPositionId);
          onSelectionChange?.({ employeeId: nextEmployeeId, positionId: nextPositionId });
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
          { value: "", label: "Choose someone", disabled: true },
          ...employees
            .filter((item) => item.active)
            .map((item) => ({
              value: item.id,
              label: `${item.firstName} ${item.lastName}`,
            })),
        ]}
      />
      <SelectField
        className="wa-select"
        name="positionId"
        label={
          <>
            Position<span className="wa-field__optional">Optional</span>
          </>
        }
        value={selectedPosition}
        onChange={(event) => {
          setPosition(event.target.value);
          onSelectionChange?.({ employeeId: selectedEmployee, positionId: event.target.value });
        }}
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
