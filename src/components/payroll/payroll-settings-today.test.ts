import { expect, it, vi } from "vitest";
vi.mock("./native-payroll-config", () => ({ NativePayrollConfig: () => null }));
import { today } from "./payroll-settings";

it("UI effective dates default to today in the company's time zone, not the device's", () => {
  const lateEveningInPuertoRico = new Date("2026-10-21T02:30:00Z"); // 10:30 PM on Oct 20 in San Juan
  expect(today("America/Puerto_Rico", lateEveningInPuertoRico)).toBe("2026-10-20");
  expect(today("UTC", lateEveningInPuertoRico)).toBe("2026-10-21");
  expect(today("America/Puerto_Rico", new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
});
