import type { Employee } from '../domain';

/** The assignment form needs choices and qualifications, never contact records. */
export type ShiftFormEmployee = Pick<Employee, 'id' | 'firstName' | 'lastName' | 'role' | 'active' | 'positionIds'>;

export function shiftFormEmployees(employees: readonly Employee[], retainedEmployeeId?: string): ShiftFormEmployee[] {
  return employees
    // Editing an existing inactive assignment retains its name/qualification
    // context without making it a selectable active option. Other inactive rows
    // never cross the browser boundary. Creation does not admit a query prefill.
    .filter(employee => employee.active || employee.id === retainedEmployeeId)
    .map(employee => ({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName,
      role: employee.role, active: employee.active, positionIds: [...(employee.positionIds ?? [])] }));
}
