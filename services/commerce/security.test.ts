import { expect, it } from "vitest";
import { seal, unseal, token, digest } from "./security";
it("binds encrypted credentials to the owning installation and rejects tampering", () => {
  const key = Buffer.alloc(32, 7);
  const encrypted = seal("private-connection", key, "slot-a");
  expect(unseal(encrypted, key, "slot-a")).toBe("private-connection");
  expect(() => unseal(encrypted, key, "slot-b")).toThrow();
  expect(() => unseal(encrypted.slice(0, -3) + "abc", key, "slot-a")).toThrow();
});
it("creates unique opaque secrets and stores only fixed length digests", () => {
  const a = token(),
    b = token();
  expect(a).not.toBe(b);
  expect(a.length).toBeGreaterThanOrEqual(43);
  expect(digest(a)).toMatch(/^[a-f0-9]{64}$/);
});
