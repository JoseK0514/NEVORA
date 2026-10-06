import { describe, expect, it } from "vitest";
import { isMobileKeyboardVisible } from "./mobile-keyboard";

describe("mobile keyboard visibility", () => {
  const mobileField = { hasFocusedField: true, hasMobileNavigation: true, layoutHeight: 714 };

  it("detects a phone keyboard shrinking Safari's visual viewport", () => {
    expect(isMobileKeyboardVisible({ ...mobileField, visualHeight: 377 })).toBe(true);
  });

  it("keeps navigation visible after the keyboard closes with the field still focused", () => {
    expect(isMobileKeyboardVisible({ ...mobileField, visualHeight: 714 })).toBe(false);
  });

  it("does not treat browser chrome movement as a keyboard", () => {
    expect(isMobileKeyboardVisible({ ...mobileField, visualHeight: 640 })).toBe(false);
  });

  it("does not hide desktop navigation or react without a focused field", () => {
    expect(isMobileKeyboardVisible({ ...mobileField, hasMobileNavigation: false, visualHeight: 377 })).toBe(false);
    expect(isMobileKeyboardVisible({ ...mobileField, hasFocusedField: false, visualHeight: 377 })).toBe(false);
  });
});
