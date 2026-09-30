import { describe, expect, it } from "vitest";
import type { Employee } from "@/lib/domain";
import { filterEmployees } from "./employee-filters";

const employees: Employee[] = [
  { id: "FC-0021", firstName: "Ana", lastName: "Rivera", phone: "7875551234", email: "ana@example.com", role: "MANAGER", primaryLocationId: "north", eligibleLocationIds: ["north", "south"], active: true },
  { id: "FC-0022", firstName: "Luis", lastName: "Vega", phone: "7875559876", role: "EMPLOYEE", primaryLocationId: "south", eligibleLocationIds: ["south"], active: false },
];

describe("employee directory filters", () => {
  it("combines search, role, primary location, and status", () => {
    expect(filterEmployees(employees, { search: "  ANA RIVERA ", role: "MANAGER", locationId: "north", status: "active" }).map((employee) => employee.id)).toEqual(["FC-0021"]);
    expect(filterEmployees(employees, { search: "FC-0022", role: "", locationId: "", status: "inactive" }).map((employee) => employee.id)).toEqual(["FC-0022"]);
    expect(filterEmployees(employees, { search: "ana@example.com", role: "", locationId: "south", status: "all" })).toEqual([]);
    expect(filterEmployees(employees, { search: "787-555-9876", role: "", locationId: "", status: "all" }).map((employee) => employee.id)).toEqual(["FC-0022"]);
  });
});
