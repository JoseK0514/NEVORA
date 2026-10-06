import { describe, expect, it } from "vitest";
import {
  marketplaceDisplayName,
  marketplaceRoleLabel,
  marketplaceView,
} from "./exchange-marketplace";

describe("shift marketplace helpers", () => {
  it("defaults the marketplace to available shifts", () => {
    expect(marketplaceView(undefined)).toBe("available");
    expect(marketplaceView("unknown")).toBe("available");
    expect(marketplaceView("coverage")).toBe("available");
  });

  it("keeps current and legacy request views together", () => {
    expect(marketplaceView("requests")).toBe("requests");
    expect(marketplaceView("my")).toBe("requests");
    expect(marketplaceView("history")).toBe("requests");
  });

  it("formats employee roles for the marketplace", () => {
    expect(marketplaceRoleLabel("EMPLOYEE")).toBe("Employee");
    expect(marketplaceRoleLabel("LEAD")).toBe("Lead");
    expect(marketplaceRoleLabel("MANAGER")).toBe("Manager");
  });

  it("shortens a full employee name to a friendly marketplace identity", () => {
    expect(marketplaceDisplayName("Sarah Martinez")).toBe("Sarah M.");
    expect(marketplaceDisplayName("Jose")).toBe("Jose");
  });
});
