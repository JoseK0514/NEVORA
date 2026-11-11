"use client";

import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { SelectField } from "./select-field";
import type { Position } from "../lib/domain";
import type {ShiftFormEmployee} from '../lib/scheduling/shift-form-employee';

export function positionAfterEmployeeChange({
  positionId,
  nextEmployeeId,
  employees,
  positions,
}: {
  positionId: string;
  nextEmployeeId: string;
  employees: ShiftFormEmployee[];
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
  employees: ShiftFormEmployee[];
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
  quiet = false,
  children,
}: {
  employees: ShiftFormEmployee[];
  positions: Position[];
  employeeId?: string;
  positionId?: string;
  onSelectionChange?: (selection: { employeeId: string; positionId: string }) => void;
  /** Quiet (v4): Person and Position as picker rows (label left, value right, chevron). */
  quiet?: boolean;
  /** Quiet: rows that sit between Person and Position (Location). */
  children?: import("react").ReactNode;
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

  const changeEmployee = (nextEmployeeId: string, form: HTMLFormElement | null) => {
    const nextPositionId = positionAfterEmployeeChange({ positionId: selectedPosition, nextEmployeeId, employees, positions });
    setEmployee(nextEmployeeId);
    setPosition(nextPositionId);
    onSelectionChange?.({ employeeId: nextEmployeeId, positionId: nextPositionId });
    const leadField = form?.elements.namedItem("isDesignatedLead");
    if (leadField instanceof HTMLInputElement) leadField.checked = designatedLeadAfterEmployeeChange({ checked: leadField.checked, nextEmployeeId, employees });
  };
  if (quiet) return <>
    <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Person</b></span>
      <select className={selectedEmployee ? "q-select-row__control q-select-row__control--ink" : "q-select-row__control q-select-row__control--ph"} name="employeeId" value={selectedEmployee} required aria-label="Person"
        onChange={event => changeEmployee(event.target.value, event.currentTarget.form)}>
        <option value="" disabled>Choose</option>
        {employees.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{`${item.firstName} ${item.lastName}`}</option>)}
      </select><CaretRightIcon className="q-chev" aria-hidden="true" /></label></li>
    {children}
    <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Position</b></span>
      <select className="q-select-row__control" name="positionId" value={selectedPosition} aria-label="Position"
        onChange={event => { setPosition(event.target.value); onSelectionChange?.({ employeeId: selectedEmployee, positionId: event.target.value }); }}>
        <option value="">None</option>
        {choices.map(position => <option key={position.id} value={position.id}>{position.name}</option>)}
        {retained ? <option value={selectedPosition} disabled>{`${positions.find(position => position.id === selectedPosition)?.name ?? "Existing position"} (unavailable)`}</option> : null}
      </select><CaretRightIcon className="q-chev" aria-hidden="true" /></label></li>
  </>;
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
