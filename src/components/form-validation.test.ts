import { describe, expect, it } from '@rstest/core';
import { describedByWith } from "./form-validation";

// Nov 14 inspection (RA-9): the field's link to its message is re-asserted every time the message shows.
describe("describedByWith", () => {
  it("adds the message to a field that describes nothing yet", () => {
    expect(describedByWith(null, "email-error-a1b2c")).toBe("email-error-a1b2c");
    expect(describedByWith("", "email-error-a1b2c")).toBe("email-error-a1b2c");
  });
  it("keeps a hint that was already there and puts the message after it", () => {
    expect(describedByWith("email-hint", "email-error-a1b2c")).toBe("email-hint email-error-a1b2c");
  });
  it("never lists the message twice", () => {
    expect(describedByWith("email-hint email-error-a1b2c", "email-error-a1b2c")).toBe("email-hint email-error-a1b2c");
    expect(describedByWith("  email-error-a1b2c  ", "email-error-a1b2c")).toBe("email-error-a1b2c");
  });
  it("restores the link when a re-render replaced the attribute with the hint alone", () => {
    const first = describedByWith("email-hint", "email-error-a1b2c");
    const afterRerender = "email-hint"; // React wrote its own value back
    expect(describedByWith(afterRerender, "email-error-a1b2c")).toBe(first);
  });
});
