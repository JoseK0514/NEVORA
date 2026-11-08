import { expect, it } from "vitest";
import { databaseTarget } from "./config";
it("rejects driver target overrides, duplicate TLS modes and maintenance databases", () => {
  for (const target of [
    "postgresql://test@localhost/app?host=remote.example",
    "postgresql://test@localhost/app?port=6543",
    "postgresql://test@localhost/app?sslmode=verify-full&sslmode=disable",
    "postgresql://test@localhost/postgres",
    "postgresql://test@localhost/template1",
  ])
    expect(() => databaseTarget(target, "development")).toThrow();
  expect(
    databaseTarget("postgresql://test@127.0.0.1/application", "development"),
  ).toBe("postgresql://test@127.0.0.1/application");
  expect(() =>
    databaseTarget(
      "postgresql://test@db.example/application?sslmode=disable",
      "production",
    ),
  ).toThrow();
});
