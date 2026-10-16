import { expect, it } from "vitest";
import { laborBudgetReadiness, parseLaborPlanningInputs } from "./model";
const rates = [
  {
    id: "R1",
    employeeId: "E1",
    locationId: null,
    rate: "21.125",
    currency: "USD",
    rateUnit: "HOUR",
    validFrom: "2026-10-01T04:00:00Z",
    validUntil: null,
  },
];
const budgets = [
  {
    id: "B1",
    locationId: null,
    amount: "1000.50",
    currency: "USD",
    startAt: "2026-10-01T04:00:00Z",
    endAt: "2026-10-08T04:00:00Z",
  },
];
it("keeps customer values exact while no trusted Finance method means Not configured and null costs", () => {
  const input = parseLaborPlanningInputs({
    rates,
    budgets,
    calculationMethod: { id: "customer-claimed-method", revision: 1 },
  });
  expect(input.rates?.[0].rate).toBe("21.125");
  expect(laborBudgetReadiness(input)).toMatchObject({
    state: "not_configured",
    estimatedCost: null,
    variance: null,
    customerInputs: { rates: "provided", budgets: "provided" },
    calculationMethod: "not_configured",
  });
  expect(laborBudgetReadiness(input).missing).toContain(
    "approved_calculation_method",
  );
  expect(laborBudgetReadiness(input)).not.toHaveProperty("wageTotal");
});
it("distinguishes missing inputs from zero and rejects caller approval or implicit currency/rate defaults", () => {
  expect(laborBudgetReadiness(null).missing).toEqual(
    expect.arrayContaining([
      "customer_rates",
      "customer_budgets",
      "approved_calculation_method",
    ]),
  );
  expect(
    parseLaborPlanningInputs({
      rates: [{ ...rates[0], rate: "0" }],
      budgets,
      calculationMethod: null,
    }).rates?.[0].rate,
  ).toBe("0");
  for (const invalid of [
    {
      rates: [{ ...rates[0], currency: "" }],
      budgets,
      calculationMethod: null,
    },
    {
      rates,
      budgets,
      calculationMethod: { id: "M", revision: 1, status: "APPROVED" },
    },
    { rates: [{ ...rates[0], rate: 21 }], budgets, calculationMethod: null },
    { rates: [{ ...rates[0], rate: "-1" }], budgets, calculationMethod: null },
    { rates: [{ ...rates[0], rate: "1e3" }], budgets, calculationMethod: null },
  ])
    expect(() => parseLaborPlanningInputs(invalid)).toThrow();
});
it.each(["HOUR", "SHIFT", "SALARY_PERIOD"])(
  "never assumes a conversion/calculation for %s",
  (rateUnit) => {
    const input = parseLaborPlanningInputs({
      rates: [{ ...rates[0], rateUnit }],
      budgets,
      calculationMethod: null,
    });
    expect(laborBudgetReadiness(input).estimatedCost).toBe(null);
  },
);
it("validates explicit instant intervals, duplicate IDs and ambiguous rates without timezone conversion", () => {
  for (const invalid of [
    {
      rates: [{ ...rates[0], validUntil: rates[0].validFrom }],
      budgets,
      calculationMethod: null,
    },
    { rates: [rates[0], rates[0]], budgets, calculationMethod: null },
    {
      rates,
      budgets: [{ ...budgets[0], endAt: "2026-09-01T00:00:00Z" }],
      calculationMethod: null,
    },
    {
      rates: [rates[0], { ...rates[0], id: "R2" }],
      budgets,
      calculationMethod: null,
    },
  ])
    expect(() => parseLaborPlanningInputs(invalid)).toThrow();
  const adjacent = { ...rates[0], id: "R2", validFrom: "2026-10-08T04:00:00Z" };
  expect(
    parseLaborPlanningInputs({
      rates: [{ ...rates[0], validUntil: adjacent.validFrom }, adjacent],
      budgets,
      calculationMethod: null,
    }).rates,
  ).toHaveLength(2);
});
