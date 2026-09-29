import { describe, expect, it } from "vitest";
import {
  formatPhoneInput,
  formatPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone";

describe("phone formatting", () => {
  it("adds hyphens while a phone number is entered", () => {
    expect(formatPhoneInput("7875551")).toBe("787-555-1");
    expect(formatPhoneInput("7875551212")).toBe("787-555-1212");
  });

  it("normalizes common phone number formatting", () => {
    expect(normalizePhoneNumber("(787) 555-1212")).toBe("787-555-1212");
    expect(normalizePhoneNumber("1-787-555-1212")).toBe("787-555-1212");
  });

  it("rejects phone numbers that do not contain ten digits", () => {
    expect(normalizePhoneNumber("787-555-121")).toBeNull();
  });

  it("formats stored phone numbers for display without hiding invalid legacy values", () => {
    expect(formatPhoneNumber("7875551212")).toBe("787-555-1212");
    expect(formatPhoneNumber("extension 42")).toBe("extension 42");
  });
});
