import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("../app/app/employees/actions", () => ({
  saveOperationalRulesAction: vi.fn(),
}));
vi.mock("../app/app/schedule/settings/actions", () => ({
  saveShiftChangePolicyAction: vi.fn(),
}));
vi.mock("./policy-save-form", () => ({
  PolicySaveForm: ({ children }: { children: React.ReactNode }) =>
    createElement("form", null, children),
}));
vi.mock("./shift-change-form", () => ({
  ShiftChangeForm: ({ children }: { children: React.ReactNode }) =>
    createElement("form", null, children),
}));

import { ShiftAssignmentFields } from "./shift-assignment-fields";
import { EmployeeSchedulingFields } from "./employee-scheduling-fields";
import { OperationalRuleFields } from "./operational-rule-fields";
import { ShiftChangePolicyFields } from "./shift-change-policy-fields";
import { ReviewedCalloutForm } from "./reviewed-callout-form";

const employee = {
  id: "worker",
  firstName: "Sam",
  lastName: "Rivera",
  phone: "787-555-0101",
  role: "EMPLOYEE" as const,
  primaryLocationId: "loc-1",
  eligibleLocationIds: ["loc-1"],
  positionIds: ["barista"],
  active: true,
};

it("uses the canonical select language for ordinary bounded assignment controls", () => {
  const html = renderToStaticMarkup(
    <ShiftAssignmentFields
      employees={[employee]}
      positions={[{ id:"barista", workspaceId:"w", name:"Barista", active:true, createdAt:"", updatedAt:"" }]}
      employeeId="worker"
      positionId="barista"
    />,
  );
  expect(html.match(/class="nevora-select"/g)).toHaveLength(2);
});

it("uses the canonical select language for operational and shift-change policies", () => {
  const operational = renderToStaticMarkup(
    <OperationalRuleFields
      employeeId="worker"
      canEdit
      profile={{
        version:1,
        revision:1,
        reviewedBy:null,
        reviewedAt:null,
        minimumRest:{status:"UNKNOWN"},
        maximumShift:{status:"UNKNOWN"},
        maximumDaily:{status:"UNKNOWN"},
        breaks:{status:"UNKNOWN"},
        projectedOvertime:{status:"UNKNOWN"},
      }}
    />,
  );
  const shiftPolicy = renderToStaticMarkup(
    <ShiftChangePolicyFields
      canEdit
      policy={{
        version:1,
        revision:1,
        swap:{revision:1,mode:"MANAGER_REVIEW",submissionAdvanceMinutes:0,completionAdvanceMinutes:0},
        coverage:{revision:1,mode:"MANAGER_REVIEW",submissionAdvanceMinutes:0,completionAdvanceMinutes:0},
      }}
    />,
  );
  expect(operational).toContain('class="nevora-select"');
  expect(shiftPolicy).toContain('class="nevora-select"');
});

// Phase 3 Signature (approved Oct 20, 2026): the reasons are one required choice among six tiles, not a select.
it("offers the board's four reasons as one required choice for reviewed inability reporting", () => {
  const html = renderToStaticMarkup(
    <ReviewedCalloutForm
      fields={{
        kind:"SUBMIT_CALLOUT",
        sourceShiftId:"shift",
        sourceEpisodeId:"11111111-1111-1111-1111-111111111111",
        sourceTermsFingerprint:"v1:" + "a".repeat(64),
      }}
    />,
  );
  for (const reason of ["ILLNESS", "FAMILY_EMERGENCY", "TRANSPORTATION", "OTHER"]) expect(html).toMatch(new RegExp(`<input type="radio"[^>]*required=""[^>]*name="reasonCode" value="${reason}"`));
  for (const retired of ["SCHOOL", "PERSONAL_EMERGENCY"]) expect(html).not.toContain(`value="${retired}"`);
  expect(html).not.toContain('checked=""');
});

it("progressively discloses large location catalogs but leaves small catalogs direct", () => {
  const many = Array.from({ length: 20 }, (_, index) => ({
    id:`loc-${index}`,
    workspaceId:"w",
    clockerKey:`loc-${index}`,
    name:`Regional Operations Center ${index}`,
    shortName:`Center ${index}`,
    active:true,
  }));
  const large = renderToStaticMarkup(
    <EmployeeSchedulingFields employee={employee} locations={many} positions={[]} />,
  );
  expect(large).toContain('class="employee-choice-disclosure"');
  expect(large).toContain("20 available");
  expect(large).not.toMatch(/\d+ selected/);

  const small = renderToStaticMarkup(
    <EmployeeSchedulingFields employee={employee} locations={many.slice(0, 3)} positions={[]} />,
  );
  expect(small).not.toContain('class="employee-choice-disclosure"');
});
