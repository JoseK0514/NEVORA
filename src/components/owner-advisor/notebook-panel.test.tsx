import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotebookPanel } from "./notebook-panel";
import type { OwnerNotebook } from "@/lib/owner-advisor/notebook";
const notebook: OwnerNotebook = { revision: 1, goals: [{ id: "20000000-0000-0000-0000-000000000001", text: "<script>private goal</script>", updatedAt: "2026-10-30T12:00:00.000Z" }], tasks: [{ id: "30000000-0000-0000-0000-000000000001", objective: "Review coverage", notes: "<script>Owner notes</script>", state: "closed", focus: { kind: "coverage", date: "2026-10-31" }, updatedAt: "2026-10-30T12:00:00.000Z" }] };

it("escapes private Owner text and distinguishes a closed task from a verified business outcome", () => {
  const html = renderToStaticMarkup(<NotebookPanel notebook={notebook} date="2026-10-30" disabled={false} change={async () => false} selectTask={() => {}} inspect={() => {}} />);
  expect(html).toContain("&lt;script&gt;private goal&lt;/script&gt;");
  expect(html).toContain("&lt;script&gt;Owner notes&lt;/script&gt;");
  expect(html).toContain("Closed by you");
  expect(html).toContain("Reopen task");
  expect(html).not.toContain(">Continue investigation<");
  expect(html).not.toContain("<script>");
});

it("offers task continuation and a scoped record review with the provider disconnected", () => {
  const html = renderToStaticMarkup(<NotebookPanel notebook={{ ...notebook, tasks: [{ ...notebook.tasks[0], state: "open" }] }} date="2026-10-30" disabled={false} change={async () => false} selectTask={() => {}} inspect={() => {}} />);
  expect(html).toContain(">Continue investigation<");
  expect(html).toContain(">Review current coverage<");
  expect(html).not.toMatch(/disabled=""[^>]*>Review current coverage/);
});
