import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
// U11 (Nov 17, 2026): the Owner's deletion form when the server answers LAST_OWNER, beside the outcomes it already had.
// The action's own behaviour (no request, no session ended on this refusal; the password-proven status check after a lost
// reply; the same DEL-… request for a duplicate) is the server's and is covered by actions.test.ts and requests.server.test.ts.
import { describe, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import type { DeletionFormState } from "@/app/app/account/delete/actions";

const control = rs.hoisted(() => ({ state: { kind: "idle" } as unknown }));
rs.mock("react", () => ({ ...(rstestImportedActual0), useActionState: () => [control.state, () => {}, false] }));
rs.mock("@/app/app/account/delete/actions", () => ({ requestAccountDeletion: async () => ({ kind: "idle" }) }));
rs.mock("@/app/login/actions", () => ({ logout: async () => {} }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {}, refresh() {} }), usePathname: () => "/app/account/delete", useSearchParams: () => new URLSearchParams() }));

import { AccountDeletionForm } from "./account-deletion-form";
import { ACCESS_COPY } from "./access-recovery/copy";

const account = { name: "Jose Natal", role: "Owner", roleKey: "OWNER" as const, employeeId: "QAOWNER" };
const form = (state: DeletionFormState, props: { lang?: "en" | "es"; owner?: boolean } = {}) => {
  control.state = state;
  return renderToStaticMarkup(<AccountDeletionForm account={account} period="30 calendar days" retention="Three years." existing={null} owner={props.owner ?? true} lang={props.lang} />);
};

describe("deleting the last Owner", () => {
  it("shows the calm state card, not the form and not an error", () => {
    const t = ACCESS_COPY.en.lastOwner, html = form({ kind: "unavailable", reason: "LAST_OWNER" });
    for (const text of [t.title, t.why, t.nothing, t.addTitle, t.addBody, t.closeTitle, t.closeBody]) expect(html).toContain(text);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('role="alert"');
    // Nothing to submit again from here: the retry is deliberate, from the form, after another Owner can sign in.
    expect(html).not.toContain('name="password"');
    expect(html).not.toContain("em-delete-confirm");
    expect(html).not.toContain("Account deletion isn’t available right now");
    // No request exists, so no deletion reference is shown; the enum never reaches the screen.
    expect(html).not.toMatch(/DEL-|LAST_OWNER/);
    expect(html).toMatch(/<a class="b-btn b-btn--teal" href="\/app\/employees">Go to Team<\/a>/);
    expect(html).toContain("mailto:support@thevelani.com?subject=");
    // Phase 2 (Nov 23, 2026): the card's second path is how the workspace closes, so the page doesn't say it twice.
    expect(html.match(/Your company’s workspace stays open/g)).toBeNull();
  });

  it("renders the card in Spanish with no English sentence of its own", () => {
    const html = form({ kind: "unavailable", reason: "LAST_OWNER" }, { lang: "es" });
    for (const text of Object.values(ACCESS_COPY.es.lastOwner).filter(value => value !== ACCESS_COPY.es.lastOwner.closeSubject)) expect(html).toContain(text);
    for (const text of Object.values(ACCESS_COPY.en.lastOwner)) expect(html).not.toContain(text);
  });

  it("keeps the plain \"not available\" outcome for every other reason", () => {
    const html = form({ kind: "unavailable" });
    expect(html).toContain("Account deletion isn’t available right now");
    expect(html).not.toContain(ACCESS_COPY.en.lastOwner.title);
    expect(html).toContain('name="password"');
  });

  it("keeps the receipt and its DEL-… reference for a real request, separate from any Support reference", () => {
    const received = form({ kind: "received", reference: "DEL-7KQ2M9XA", confirmedAt: "2026-11-17T12:00:00Z" });
    // Phase 2 (Nov 23, 2026): every role's receipt is the Employee's Direction B one.
    expect(received).toContain("Your deletion request was received");
    expect(received).toMatch(/<strong class="[^"]*ad-reference">DEL-7KQ2M9XA<\/strong>/);
    expect(received).not.toContain("ar-ref");
    const duplicate = form({ kind: "duplicate", reference: "DEL-7KQ2M9XA", confirmedAt: "2026-11-17T12:00:00Z" });
    expect(duplicate).toContain("A deletion request is already in progress");
    expect(duplicate).toContain("DEL-7KQ2M9XA");
  });

  it("keeps the unknown result as unknown: it asks to check, never says failed or done, and offers no second request", () => {
    const html = form({ kind: "uncertain" });
    expect(html).toContain("We don’t know yet if your request was saved");
    expect(html).toContain("choose Check my request to find out");
    expect(html).not.toContain("received");
    expect(html).not.toContain(ACCESS_COPY.en.lastOwner.title);
  });

  it("shows a Support reference beside a failure only when the action's state carries a valid one", () => {
    expect(form({ kind: "failed" })).not.toContain("ar-ref");
    const withReference = form({ kind: "failed", supportReference: "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d" } as DeletionFormState);
    expect(withReference).toContain("Support reference");
    expect(withReference).toContain("3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");
    expect(form({ kind: "failed", supportReference: "DEL-7KQ2M9XA" } as DeletionFormState)).not.toContain("ar-ref");
  });
});
