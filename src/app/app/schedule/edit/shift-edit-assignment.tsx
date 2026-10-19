"use client";

import { useState, type ComponentProps } from "react";
import { ShiftAssignmentFields } from "@/components/shift-assignment-fields";

export function ShiftEditAssignment(
  props: ComponentProps<typeof ShiftAssignmentFields>,
) {
  const [employeeId, setEmployeeId] = useState(props.employeeId);
  const employee = props.employees.find((item) => item.id === employeeId);
  const name = employee ? `${employee.firstName} ${employee.lastName}` : "";

  return (
    <div
      className="wa-fields-group"
      onChange={(event) => {
        const field = event.target;
        if (field instanceof HTMLSelectElement && field.name === "employeeId") {
          setEmployeeId(field.value);
        }
      }}
    >
      <ShiftAssignmentFields {...props} />
      {/* A native select can cut a long name; the full name is read and shown here. */}
      <p className="wa-hint" aria-live="polite">
        {name.length > 24 ? <>Selected employee: {name}</> : null}
      </p>
    </div>
  );
}
