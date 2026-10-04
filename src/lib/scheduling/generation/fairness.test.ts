import { expect, it } from "vitest";
import {
  automaticWeek,
  automaticAssignment as shift,
} from "../../../test/fixtures/automatic-week";
import { compareEmployeeFairness } from "./fairness";

it("prefers confirmed availability before target balance", () => {
  const i = automaticWeek();
  i.employees[0].targetWeeklyHours = 40;
  expect(
    compareEmployeeFairness(i.employees[1], i.employees[0], {
      weekStart: i.weekStart,
      ledger: [],
      confirmedEmployeeIds: new Set(["e2"]),
      employeeIds: ["e1", "e2"],
    }),
  ).toBeLessThan(0);
});
it("orders below target, completion ratio, remaining target, then scheduled hours", () => {
  const i = automaticWeek();
  const [a, b] = i.employees;
  const compare = () =>
    compareEmployeeFairness(a, b, {
      weekStart: i.weekStart,
      ledger,
      confirmedEmployeeIds: new Set(),
      employeeIds: ["e1", "e2"],
    });
  let ledger = [shift("a", "e1"), shift("b", "e2")];
  a.targetWeeklyHours = 24;
  b.targetWeeklyHours = 8;
  expect(compare()).toBeLessThan(0);
  b.targetWeeklyHours = 16;
  expect(compare()).toBeLessThan(0);
  ledger = [];
  expect(compare()).toBeLessThan(0);
  a.targetWeeklyHours = undefined;
  b.targetWeeklyHours = 0;
  ledger = [shift("b", "e2")];
  expect(compare()).toBeLessThan(0);
});
it("rotates exact ties by business week without names or array order", () => {
  const [a, b] = automaticWeek().employees;
  const context = {
    weekStart: "2026-10-05",
    ledger: [],
    confirmedEmployeeIds: new Set<string>(),
    employeeIds: ["e2", "e1"],
  };
  const first = compareEmployeeFairness(a, b, context);
  expect(first).not.toBe(0);
  expect(
    Math.sign(
      compareEmployeeFairness(a, b, { ...context, weekStart: "2026-10-12" }),
    ),
  ).toBe(-Math.sign(first));
  expect(
    compareEmployeeFairness({ ...a, firstName: "Z" }, b, {
      ...context,
      employeeIds: ["e1", "e2"],
    }),
  ).toBe(first);
});
it("keeps mixed configured and absent target comparisons transitive after targets are met", () => {
  const [a, b, c, d] = automaticWeek().employees;
  a.targetWeeklyHours = 1;
  b.targetWeeklyHours = 16;
  c.targetWeeklyHours = undefined;
  d.targetWeeklyHours = 0;
  const context = {
    weekStart: "2026-10-05",
    confirmedEmployeeIds: new Set<string>(),
    employeeIds: [a.id, b.id, c.id, d.id],
    ledger: [
      shift("a", a.id, { startTime: "00:00", endTime: "16:00" }),
      shift("b1", b.id, { startTime: "00:00", endTime: "24:00" }),
      shift("b2", b.id, { date: "2026-10-06" }),
      shift("c", c.id, { startTime: "00:00", endTime: "24:00" }),
    ],
  };
  // Once no one is below target, actual hours determine the order: d=0, a=16, c=24, b=32.
  expect(compareEmployeeFairness(d, a, context)).toBeLessThan(0);
  expect(compareEmployeeFairness(a, c, context)).toBeLessThan(0);
  expect(compareEmployeeFairness(c, b, context)).toBeLessThan(0);
  expect(compareEmployeeFairness(a, b, context)).toBeLessThan(0);
  expect(compareEmployeeFairness(d, b, context)).toBeLessThan(0);
});
it.each([undefined, 0])(
  "prefers unscheduled target %s over a worker already at their configured target",
  (target) => {
    const [atTarget, unscheduled] = automaticWeek().employees;
    atTarget.targetWeeklyHours = 24;
    unscheduled.targetWeeklyHours = target;
    const context = {
      weekStart: "2026-10-05",
      confirmedEmployeeIds: new Set<string>(),
      employeeIds: [atTarget.id, unscheduled.id],
      ledger: [
        shift("used", atTarget.id, { startTime: "00:00", endTime: "24:00" }),
      ],
    };
    expect(
      compareEmployeeFairness(unscheduled, atTarget, context),
    ).toBeLessThan(0);
    expect(
      compareEmployeeFairness(atTarget, unscheduled, context),
    ).toBeGreaterThan(0);
  },
);
