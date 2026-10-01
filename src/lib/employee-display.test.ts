import { describe, expect, it } from "vitest";
import {
  employeeInitials,
  employeeRoleLabel,
} from "./employee-display";

describe("employee display helpers", () => {
  it("formats employee initials", () => {
    expect(employeeInitials("Jose", "Natal")).toBe("JN");
  });

  it("formats employee roles for the directory", () => {
    expect(employeeRoleLabel("EMPLOYEE")).toBe("Barista");
    expect(employeeRoleLabel("LEAD")).toBe("Lead Barista");
    expect(employeeRoleLabel("MANAGER")).toBe("Manager");
    expect(employeeRoleLabel("OWNER")).toBe("Owner");
  });
});
