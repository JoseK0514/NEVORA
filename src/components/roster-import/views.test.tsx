// Owner roster import: what each step renders (server string render; there is no DOM here). Fictional data only.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
import { parseRosterTable } from "@/lib/onboarding/roster";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

import { rosterImportCopy } from "./copy";
import { headcountsOf, readPreviewResponse, type PreviewReady } from "./contract";
import { importStep, offlineNotice } from "./messages";
import { RosterImport } from "./roster-import";
import { AddListStep, DoneStep, ImportingStep, NoticeCard, ReviewStep, RowEditor, StepActions, UnknownStep } from "./views";

const copy = rosterImportCopy.en;
const locations = [{ id: "cafe", name: "Café" }, { id: "bakery", name: "Bakery" }];
const headcounts = headcountsOf([{ active: true, role: "OWNER" }, { active: true, role: "MANAGER" }, { active: true, role: "EMPLOYEE" }]);
const nothing = () => undefined;
function review(lines: string[], defaults: Record<string, unknown> = { primaryLocationId: "cafe" }): PreviewReady {
  const parsed = parseRosterTable({ format: "csv", text: ["id,firstName,lastName,phone,email,role", ...lines].join("\n"), defaults });
  const outcome = readPreviewResponse(200, JSON.parse(JSON.stringify({ ...parsed, schemaVersion: 1, expectedVersion: "7" })));
  if (outcome.kind !== "ready") throw Error("not a review");
  return outcome.preview;
}
const MIXED = ["E-1,Ana,Pérez,7875550101,ana@example.invalid,", "E-2,Luis,Rivera,7875550102,,LEAD", "E-1,,Otra,nope,not-an-email,", "E-4,Mara,Gerente,7875550104,m@example.invalid,MANAGER"];
const reviewProps = (preview: PreviewReady, extra: Partial<ComponentProps<typeof ReviewStep>> = {}): ComponentProps<typeof ReviewStep> => ({
  copy, preview, locations, defaultLocationId: "cafe", headcounts, removedCount: 0, rowErrors: new Map(), editing: null, busy: false, scopeChoice: "",
  onEdit: nothing, onSaveRow: nothing, onRemoveRow: nothing, onScope: nothing, ...extra,
});
const count = (html: string, part: string) => html.split(part).length - 1;

describe("step 1, add your list", () => {
  const props: ComponentProps<typeof AddListStep> = { copy, text: "", fileNote: null, listError: null, locations, locationId: "", locationError: null, busy: false, onText: nothing, onFile: nothing, onLocation: nothing };
  it("says which columns the import reads, with an example and a template", () => {
    const html = renderToStaticMarkup(<AddListStep {...props} />);
    for (const item of copy.add.required) expect(html).toContain(item);
    expect(html).toContain(copy.add.noEmail);
    expect(html).toContain("<caption>Example</caption>");
    expect(html).toMatch(/<a[^>]*download="nevora-staff-list\.csv"/);
    expect(decodeURIComponent(/href="data:text\/csv;charset=utf-8,([^"]+)"/.exec(html)?.[1] ?? "")).toBe("﻿ID,First name,Last name,Phone,Email,Role\n");
  });
  it("labels the list and the location, and ties their help to them", () => {
    const html = renderToStaticMarkup(<AddListStep {...props} />);
    expect(html).toMatch(/<label class="c-field__label" for="rimp-list">Staff list<\/label>/);
    expect(html).toMatch(/<textarea[^>]*id="rimp-list"[^>]*aria-describedby="rimp-list-help"/);
    expect(html).toMatch(/<label class="c-field__label" for="rimp-location">Location for this list<\/label>/);
    expect(html).toMatch(/<select[^>]*id="rimp-location"[^>]*aria-describedby="rimp-location-help"/);
    expect(html).not.toContain("aria-invalid");
    expect(html).toMatch(/<input[^>]*type="file"[^>]*hidden=""/);
    expect(html).toContain("Choose a CSV file");
  });
  it("ties a validation error to its field", () => {
    const html = renderToStaticMarkup(<AddListStep {...props} listError={copy.table.REQUIRED_COLUMNS} locationError={copy.table.locationRequired} fileNote={copy.add.loaded("staff.csv")} />);
    expect(html).toMatch(/<textarea[^>]*aria-invalid="true"[^>]*aria-describedby="rimp-list-help rimp-list-error rimp-file-note"/);
    expect(html).toContain(`<span class="c-error" id="rimp-list-error">${copy.table.REQUIRED_COLUMNS}</span>`);
    expect(html).toMatch(/<select[^>]*aria-invalid="true"[^>]*aria-describedby="rimp-location-help rimp-location-error"/);
    expect(html).toContain('<span class="c-field__help" id="rimp-file-note" role="status">staff.csv is loaded.');
  });
  it("asks for a location first when the company has none", () => {
    const html = renderToStaticMarkup(<AddListStep {...props} locations={[]} />);
    expect(html).toContain("Add a location first.");
    expect(html).toContain('href="/app/settings/locations"');
    expect(html).not.toContain('id="rimp-location"');
  });
});

describe("step 2, check it", () => {
  it("shows each person, what they resolved to, and each row's problems beside the row", () => {
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(review(MIXED))} />);
    expect(html).toContain("2 ready · 2 need a fix");
    expect(html).toContain(copy.review.blocked(2));
    expect(html).toMatch(/<table class="rimp-table" role="table" aria-label="People on your list">/);
    expect(count(html, 'role="columnheader"')).toBe(6);
    expect(count(html, '<tr role="row" class="rimp-row"')).toBe(4);
    expect(html).toContain('<span class="rimp-row__name">Ana Pérez</span><span class="rimp-row__sub">E-1</span>');
    expect(html).toContain('<span class="rimp-row__main">Lead</span><span class="rimp-row__sub">Café</span>');
    expect(html).toContain('<span class="rimp-row__main">787-555-0102</span><span class="rimp-row__sub">No email. Tablet clock-in only.</span>');
    expect(count(html, ">Ready</span>")).toBe(2);
    expect(count(html, ">Needs a fix</span>")).toBe(2);
    const third = html.slice(html.indexOf('id="rimp-r4-problems"'), html.indexOf('id="rimp-r4-change"'));
    for (const problem of [copy.problems.firstNameMissing, copy.problems.phone, copy.problems.email, copy.problems.duplicateId]) expect(third).toContain(problem);
    expect(html).toMatch(/<button type="button" class="rimp-change" id="rimp-r4-change" aria-expanded="false" aria-label="Fix row 4, Otra" aria-describedby="rimp-r4-problems"/);
    expect(html).toMatch(/id="rimp-r2-change" aria-expanded="false" aria-label="Edit row 2, Ana Pérez"/);
  });
  it("asks for Manager access only when the list has a Manager, and marks it while it is missing", () => {
    const withManager = renderToStaticMarkup(<ReviewStep {...reviewProps(review(MIXED))} />);
    expect(withManager).toContain(copy.review.manager.line);
    expect(withManager).toMatch(/<select id="rimp-scope"[^>]*aria-invalid="true"/);
    expect(withManager).toContain('<option value="LOCATION:bakery">Bakery only</option>');
    expect(renderToStaticMarkup(<ReviewStep {...reviewProps(review(MIXED.slice(0, 2)))} />)).not.toContain('id="rimp-scope"');
  });
  it("shows the three headcounts with their own labels, now and after the import", () => {
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(review(MIXED.slice(0, 2)))} />);
    expect(html).toContain("2 ready");
    expect(html).toContain(copy.review.allReady(2));
    for (const text of [copy.counts.active, copy.counts.eligible, copy.counts.plan]) { expect(html).toContain(text.label); expect(html).toContain(text.help); }
    expect(html).toContain("<b>3 now</b><span>5 after this import</span>");
    expect(html).toContain("<b>1 now</b><span>3 after this import</span>");
    expect(html).toContain("<b>2 now</b><span>4 after this import</span>");
  });
  it("lists unused columns and removed rows", () => {
    const preview = { ...review(MIXED.slice(0, 2)), ignoredColumns: ["Notes", "Shirt size"] };
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(preview, { removedCount: 1 })} />);
    expect(html).toContain("These columns weren’t used: Notes, Shirt size.");
    expect(html).toContain("You removed 1 row. It won’t be imported.");
  });
  it("opens a row's editor under it, with each error on the field that fixes it", () => {
    const preview = review(MIXED);
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(preview, { editing: 4 })} />);
    expect(html).toMatch(/id="rimp-r4-change" aria-expanded="true" aria-controls="rimp-r4-editor"/);
    expect(html).toMatch(/<div class="rimp-editor" id="rimp-r4-editor" role="group" aria-label="Row 4">/);
    const phone = /<input[^>]*id="rimp-r4-phone"[^>]*>/.exec(html)?.[0] ?? "";
    for (const part of ['value="nope"', 'type="tel"', 'aria-invalid="true"', 'aria-describedby="rimp-r4-phone-error"']) expect(phone).toContain(part);
    expect(html).toContain(`<span class="c-error" id="rimp-r4-phone-error">${copy.problems.phone}</span>`);
    expect(html).toContain(`<span class="c-error" id="rimp-r4-firstName-error">${copy.problems.firstNameMissing}</span>`);
    expect(html).toContain(`<span class="c-error" id="rimp-r4-id-error">${copy.problems.duplicateId}</span>`);
    expect(html).toMatch(/<label class="c-field__label" for="rimp-r4-email">Email \(optional\)<\/label>/);
    expect(html).toContain("Save and check again");
    expect(html).toContain("Remove from list");
  });
  it("starts a row's editor from the cells as read, and leaves an unknown role unchosen", () => {
    const row = review(["E-9,Eva,Soto,7875550109,,Supervisor"]).rows[0];
    const html = renderToStaticMarkup(<RowEditor copy={copy} row={row} locations={locations} errors={row.fieldErrors} busy={false} onSave={nothing} onCancel={nothing} onRemove={nothing} />);
    expect(html).toMatch(/<select id="rimp-r2-role"[^>]*aria-invalid="true"[^>]*><option value="" selected="">Choose<\/option>/);
    expect(html).toContain(copy.problems.role);
    expect(html).toMatch(/<select id="rimp-r2-location"[^>]*><option value="" selected="">Same as the list<\/option>/);
  });
  it("marks a row the import itself refused as needing a fix", () => {
    const valid = review(MIXED.slice(0, 2));
    const refused = new Map([[3, [{ field: "phone", code: "CANONICAL_VALIDATION_FAILED" }]]]);
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(valid, { rowErrors: refused })} />);
    expect(html).toContain("1 ready · 1 needs a fix");
    expect(html).toContain(copy.problems.notAccepted);
  });
});

describe("step 3, import", () => {
  it("shows progress as a busy status", () => {
    const html = renderToStaticMarkup(<ImportingStep copy={copy} count={12} />);
    expect(html).toMatch(/<div class="b-statecard" data-kind="loading" role="status" aria-busy="true">/);
    expect(html).toContain("Importing 12 people…");
  });
  it("says how many were added, who was left out and why, and where to go next", () => {
    const html = renderToStaticMarkup(<DoneStep copy={copy} added={12} withoutEmail={3} removed={[{ rowNumber: 5, name: "Luis Rivera", why: copy.problems.phone }]} onAnother={nothing} />);
    expect(html).toContain("12 people added");
    expect(html).toContain("No invitations were sent.");
    expect(html).toContain("1 row was left out because you removed it while checking:");
    expect(html).toContain(`Row 5, Luis Rivera: ${copy.problems.phone}`);
    expect(html).toContain("3 people have no email.");
    expect(html).toMatch(/<a href="\/app\/employees" class="b-row b-row--link">.*?Send invitations/);
    expect(html).toMatch(/<a href="\/app\/schedule" class="b-row b-row--link">.*?Build your first schedule/);
    expect(html).toContain("Import another list");
  });
  it("says nobody was skipped when nobody was", () => {
    const html = renderToStaticMarkup(<DoneStep copy={copy} added={1} withoutEmail={0} removed={[]} onAnother={nothing} />);
    expect(html).toContain("1 person added");
    expect(html).toContain(copy.done.noneSkipped);
    expect(html).not.toContain("no email");
  });
  it("never calls an unknown outcome a failure, and offers only the same check again", () => {
    const html = renderToStaticMarkup(<UnknownStep copy={copy} offline={false} busy={false} onRetry={nothing} />);
    expect(html).toMatch(/<div class="b-statecard" data-kind="paused" role="alert">/);
    expect(html).toContain(copy.unknown.title);
    expect(html).toContain("NEVORA will not add anyone twice.");
    expect(html).not.toMatch(/failed|didn’t go through|not saved/i);
    expect(count(html, "<button")).toBe(1);
    expect(html).toContain(">Check again</button>");
    const offline = renderToStaticMarkup(<UnknownStep copy={copy} offline busy note={copy.unknown.signin} onRetry={nothing} />);
    expect(offline).toContain('data-kind="offline"');
    expect(offline).toContain(copy.offline.lineUnknown);
    expect(offline).toContain(copy.unknown.signin);
    expect(offline).toMatch(/<button[^>]*disabled=""[^>]*>Checking…<\/button>/);
  });
});

describe("refusals and the step buttons", () => {
  const preview = review(MIXED.slice(0, 2));
  it("announces a refusal with its one next step", () => {
    const limit = importStep(copy, { kind: "invalid", errors: [{ field: "people", code: "EMPLOYEE_LIMIT" }] }, preview, "/app/billing");
    if (limit.to !== "review") throw Error("expected a notice");
    const html = renderToStaticMarkup(<NoticeCard copy={copy} notice={limit.notice} onAction={nothing} />);
    expect(html).toMatch(/<div class="b-statecard" data-kind="failed" role="alert">/);
    expect(html).toContain(copy.refused.employeeLimit.title);
    expect(html).toContain(">Edit the list</button>");
    expect(html).toContain('<a href="/app/billing" class="b-btn b-btn--ghost">Open billing</a>');
  });
  it("links to sign-in and to Team where that is the next step, and shows offline as offline", () => {
    const signin = importStep(copy, { kind: "signin" }, preview), replay = importStep(copy, { kind: "conflict", reason: "changed_replay" }, preview);
    if (signin.to !== "review" || replay.to !== "review") throw Error("expected notices");
    expect(renderToStaticMarkup(<NoticeCard copy={copy} notice={signin.notice} onAction={nothing} />)).toContain('<a href="/login" class="b-btn b-btn--teal">Sign in</a>');
    expect(renderToStaticMarkup(<NoticeCard copy={copy} notice={replay.notice} onAction={nothing} />)).toContain('<a href="/app/employees" class="b-btn b-btn--teal">Open Team</a>');
    const offline = renderToStaticMarkup(<NoticeCard copy={copy} notice={offlineNotice(copy, "recheck")} onAction={nothing} />);
    expect(offline).toContain('data-kind="offline"');
    expect(offline).toContain("You’re offline");
    expect(offline).toContain(">Try again</button>");
  });
  it("draws the step buttons once for phones and once in the card footer", () => {
    const html = renderToStaticMarkup(<StepActions primary={{ label: "Import 2 people", onClick: nothing, disabled: true }} secondary={{ label: "Edit the list", onClick: nothing }} />);
    expect(html).toMatch(/<div class="rimp-actions"><button class="b-btn b-btn--teal b-btn--full" type="button" disabled="">Import 2 people<\/button>/);
    expect(html).toMatch(/<div class="c-form-foot"><button type="button" class="c-btn c-btn--secondary">Edit the list<\/button><button type="button" class="c-btn" disabled="">Import 2 people<\/button><\/div>/);
    expect(renderToStaticMarkup(<StepActions />)).toBe("");
  });
});

describe("the whole screen as it opens", () => {
  it("starts on step 1 inside the sheet frame, with one live region and no request made", () => {
    const html = renderToStaticMarkup(<RosterImport actorId="O-1" locations={[locations[0]]} headcounts={headcounts} />);
    expect(html).toMatch(/<h1 class="c-nav__title" id="roster-import-title" tabindex="-1">Import a staff list<\/h1>/);
    expect(html).toContain("Step 1 of 3");
    expect(html).toMatch(/<form class="c-teamform rimp" noValidate="" aria-labelledby="roster-import-title">/);
    expect(count(html, 'aria-live="polite"')).toBe(1);
    expect(html).toContain('<a href="/app/employees" class="c-formhead__link">Cancel</a>');
    // The company's only location is chosen already.
    expect(html).toMatch(/<option value="cafe" selected="">Café<\/option>/);
    expect(html).toContain(">Check list</button>");
    expect(html).not.toContain('class="rimp-table"');
  });
  it("renders the Spanish copy from the same module when asked", () => {
    const html = renderToStaticMarkup(<RosterImport lang="es" actorId="O-1" locations={locations} headcounts={headcounts} />);
    expect(html).toContain("Importar personal");
    expect(html).toContain("Paso 1 de 3");
    expect(html).toContain(rosterImportCopy.es.add.noEmail);
    expect(html).toContain(">Revisar lista</button>");
  });
});

describe("Package X: phone fixes", () => {
  it("the example scrolls as a named region the keyboard can reach", () => {
    const html = renderToStaticMarkup(<AddListStep copy={copy} text="" fileNote={null} listError={null} locations={locations} locationId="" locationError={null} busy={false} onText={nothing} onFile={nothing} onLocation={nothing} />);
    expect(html).toContain('<div class="rimp-scroll" tabindex="0" role="region" aria-label="Example">');
  });
  it("a row that needs a fix shows a 10-digit phone as checked rows do", () => {
    const html = renderToStaticMarkup(<ReviewStep {...reviewProps(review(["E-4,Mara,Gerente,7875550104,m@example.invalid,MANAGER"]))} />);
    expect(html).toContain('<span class="rimp-row__main">787-555-0104</span>');
    expect(html).not.toContain(">7875550104<");
  });
});
