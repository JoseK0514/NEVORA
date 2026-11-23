import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";
import type { Employee, Location } from "@/lib/domain";

// Fictional reads: nobody is working today, so Team's live parts stay quiet.
rs.mock("./manager-today", () => ({ useToday: () => ({ snapshot: { state: "ready", observedAt: "2026-11-22T15:00:00Z", timeZone: "America/Puerto_Rico", shifts: [] } }) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: rs.fn(), replace: rs.fn() }), usePathname: () => "/app/employees", useSearchParams: () => new URLSearchParams() }));
rs.mock("./clean/use-clock-monitor", () => ({ useClockMonitor: () => ({ monitor: { state: "ready", employees: [] } }) }));

import { EmployeeDirectory, TEAM_SHOWN } from "./employee-directory";

const place: Location = { id: "loc-1", workspaceId: "w", clockerKey: "k", name: "Fictional Place", shortName: "Place", active: true };
const person = (index: number): Employee => ({ id: `p${index}`, firstName: `Person`, lastName: String.fromCharCode(65 + index), phone: "", role: "EMPLOYEE",
  primaryLocationId: "loc-1", eligibleLocationIds: ["loc-1"], positionIds: [], active: true });
const twelve = Array.from({ length: 12 }, (_, index) => person(index));
const render = (showAll = false) => renderToStaticMarkup(<EmployeeDirectory employees={twelve} visibleEmployees={twelve} locations={[place]} showAll={showAll}
  filters={{ query: "", status: "all", role: "", location: "" }} />);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// Gaps G49 (Nov 23, 2026): the company Team says how many people once. "See all" (phones and desktop) carries no count,
// as a location Manager's Team says it, and no aria-label that says it differently.
it("says how many people once: the title counts them, See all doesn't", () => {
  expect(TEAM_SHOWN).toBeLessThan(twelve.length);
  const html = render();
  const words = text(html);
  // The phone band and the desktop title, one per layout ("Off today 12" is the filter's own fact).
  expect(words.match(/\b12 employees\b/g)).toHaveLength(2);
  expect(html).toContain('<p class="b-sub">12 employees</p>');
  expect(html).toContain('<span class="c-title__sub">12 employees</span>');
  expect(words.match(/\b12\b/g)).toHaveLength(4);
  expect(words.match(/Off today 12\b/g)).toHaveLength(2);
  expect(words).not.toMatch(/See all \d/);
  expect(html.match(/>See all</g)).toHaveLength(2);
  expect(html).not.toMatch(/aria-label="See all/);
  // With everyone shown there is nothing more to see.
  expect(render(true)).not.toContain("See all");
});
