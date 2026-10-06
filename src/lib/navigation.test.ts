import { describe, expect, it } from "vitest";
import { navigationForRole } from "./navigation";

describe("role navigation", () => {
  it("keeps owner controls restricted to owners", () => {
    const owner = navigationForRole("OWNER").map((item) => item.href);
    const manager = navigationForRole("MANAGER").map((item) => item.href);
    const lead = navigationForRole("LEAD").map((item) => item.href);
    const employee = navigationForRole("EMPLOYEE").map((item) => item.href);

    expect(owner).toContain("/app/settings");
    expect(manager).toContain("/app/employees");
    expect(manager).toContain("/app/schedule/settings");
    expect(manager).not.toContain("/app/settings");
    expect(lead).toEqual(employee);
    expect(employee).not.toContain("/app/employees");
    expect(employee).not.toContain("/app/settings");
  });
});
