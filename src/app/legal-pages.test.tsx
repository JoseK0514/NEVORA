import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => null, BrandWordmark: () => null }));
vi.mock("@/app/app/account/delete/actions", () => ({ requestAccountDeletion: vi.fn() }));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import SupportPage from "./support/page";
import AccountDeletionPage from "./account-deletion/page";
import { AccountPrivacyLinks } from "@/components/legal/account-privacy-links";
import { BrandLegal } from "@/components/brand-legal";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import { POLICY_FACTS } from "@/lib/legal/policies";

const pages = [["Privacy Policy", PrivacyPage], ["Terms of Use", TermsPage], ["Support", SupportPage], ["Delete your NEVORA account", AccountDeletionPage]] as const;
afterEach(() => vi.unstubAllEnvs());

describe("public policy pages", () => {
  it.each(pages)("%s reads without signing in, links the other pages and shows unresolved facts plainly", (title, Page) => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain(`<h1 id="legal-title">${title}</h1>`);
    expect(html).toContain('href="mailto:support@thevelani.com"');
    // Quiet (v4): the operator is named under the title ("Effective … · VELANI LLC").
    expect(html).toContain("VELANI LLC");
    for (const href of ["/privacy", "/terms", "/support", "/account-deletion"]) expect(html).toMatch(new RegExp(`href="${href}"|aria-current="page"`));
    // Every fact is confirmed, so no draft marker is left.
    expect(html).not.toContain("legal-unresolved");
    expect(html).not.toContain("CONFIRM_");
  });

  it("Support keeps the approved response commitment and mailing address word for word (Codex review, Oct 23)", () => {
    const html = renderToStaticMarkup(createElement(SupportPage)).replace(/’/g, "'");
    const fact = (key: string) => String(POLICY_FACTS[key]).replace(/’/g, "'");
    // “We aim to respond … two business days … public holidays observed in Puerto Rico … may take longer”, never a promise.
    expect(html).toContain(fact("SUPPORT_RESPONSE_TIME"));
    expect(html).toContain("We aim to respond");
    expect(html).toContain("excluding public holidays observed in Puerto Rico");
    expect(html).toContain("may take longer to resolve");
    expect(html).not.toMatch(/Reply within/i);
    expect(html).toContain(fact("BUSINESS_CONTACT_DETAILS"));
  });

  it("public Account deletion uses the Quiet legal layout like Privacy (inspection Oct 24)", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionPage));
    expect(html).toContain('class="q-page q-auth q-doc"');
    expect(html).toMatch(/<a (?=[^>]*class="q-btn q-doc__start")(?=[^>]*href="\/login\?returnTo=%2Fapp%2Faccount%2Fdelete")[^>]*>Start deletion request<\/a>/);
    expect(html).not.toContain("employee-login-submit");
  });

  it("starts deletion by signing in, never by typing an email address", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionPage));
    expect(html).toContain('href="/login?returnTo=%2Fapp%2Faccount%2Fdelete"');
    expect(html).not.toMatch(/<input[^>]*type="email"/);
  });

  it.each(pages)("%s is published in production now that every fact is confirmed", (title, Page) => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(renderToStaticMarkup(createElement(Page))).toContain(`<h1 id="legal-title">${title}</h1>`);
  });

  it("the sign-in footer and Profile link the policies and Delete my account in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(renderToStaticMarkup(createElement(BrandLegal))).toContain('href="/privacy"');
    expect(renderToStaticMarkup(createElement(AccountPrivacyLinks))).toContain('href="/app/account/delete"');
  });

  it("the sign-in footer names the links in Spanish; the employee Profile draws them as Settings rows", () => {
    const es = renderToStaticMarkup(createElement(BrandLegal, { lang: "es" }));
    for (const text of ['aria-label="Políticas y ayuda"', ">Privacidad</a>", ">Términos</a>", ">Ayuda</a>", "© 2026 VELANI LLC. Todos los derechos reservados."]) expect(es).toContain(text);
    const rows = renderToStaticMarkup(createElement(AccountPrivacyLinks, { variant: "settings", sectionClassName: "sig", headingClassName: "sig-h" }));
    expect(rows).toContain('class="profile-settings account-privacy sig"');
    expect(rows).toContain('<h2 id="account-privacy-title" class="sig-h">Privacy and your account</h2>');
    expect(rows.match(/class="profile-setting-row"/g)).toHaveLength(4);
    expect(rows).toContain('href="/app/account/delete"');
  });
});

describe("Delete my account", () => {
  const account = { name: "Fictional Person", role: "Employee", employeeId: "FICTIONAL-E1" };
  it("reviews the account and effects, then asks for the password before the destructive action", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: null, retention: null, existing: null }));
    for (const text of ["Fictional Person", "FICTIONAL-E1", "Your access ends now.", "What is removed:", "What may be kept:", "Confirm deletion request", "Keep my account"]) expect(html).toContain(text);
    expect(html).toMatch(/<input[^>]*type="password"[^>]*autoComplete="current-password"|<input[^>]*autoComplete="current-password"[^>]*type="password"/);
    expect(html).toMatch(/<button type="submit"[^>]*disabled=""/);
    expect(html).toContain("[CONFIRM_DELETION_COMPLETION_PERIOD]");
  });

  it("draws the review on Quiet rows with gutters, not the shell-scoped settings cards (inspection Oct 24)", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: "Confirmed period", retention: "Fictional retention.", existing: null }));
    expect(html).toContain('class="q-deletion"');
    expect(html).toMatch(/<h2 id="deletion-account-title">Your account<\/h2>/);
    expect(html.match(/class="q-row/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toMatch(/nv-card|wc-facts|wc-check/);
    expect(html).toContain("I understand my NEVORA account will be deleted and I won’t be able to sign in again.");
  });

  it("shows an open request with its reference instead of a second form", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: "Confirmed period", retention: null,
      existing: { kind: "duplicate", reference: "DEL-7KQ2M9XA", confirmedAt: "2030-01-01" } }));
    expect(html).toContain("A deletion request is already in progress.");
    expect(html).toContain("DEL-7KQ2M9XA");
    expect(html).toContain("Confirmed period");
    expect(html).not.toContain("Confirm deletion request");
  });
});
