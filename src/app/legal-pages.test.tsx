import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => null, BrandWordmark: () => null }));
vi.mock("@/app/app/account/delete/actions", () => ({ requestAccountDeletion: vi.fn() }));
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import SupportPage from "./support/page";
import AccountDeletionPage from "./account-deletion/page";
import { AccountPrivacyLinks } from "@/components/legal/account-privacy-links";
import { BrandLegal } from "@/components/brand-legal";
import { AccountDeletionForm } from "@/components/account-deletion-form";

const pages = [["Privacy Policy", PrivacyPage], ["Terms of Use", TermsPage], ["Support", SupportPage], ["Delete your NEVORA account", AccountDeletionPage]] as const;
afterEach(() => vi.unstubAllEnvs());

describe("public policy pages", () => {
  it.each(pages)("%s reads without signing in, links the other pages and shows unresolved facts plainly", (title, Page) => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain(`<h1 id="legal-title">${title}</h1>`);
    expect(html).toContain('href="mailto:support@thevelani.com"');
    expect(html).toContain("Provided by VELANI LLC");
    for (const href of ["/privacy", "/terms", "/support", "/account-deletion"]) expect(html).toMatch(new RegExp(`href="${href}"|aria-current="page"`));
    expect(html).toContain('class="legal-unresolved"');
  });

  it("starts deletion by signing in, never by typing an email address", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionPage));
    expect(html).toContain('href="/login?returnTo=%2Fapp%2Faccount%2Fdelete"');
    expect(html).not.toMatch(/<input[^>]*type="email"/);
  });

  it.each(pages)("%s is hidden in production while facts are unconfirmed", (_title, Page) => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => renderToStaticMarkup(createElement(Page))).toThrow("NEXT_NOT_FOUND");
  });

  it("the sign-in footer and Profile show the links only when the policies are visible", () => {
    expect(renderToStaticMarkup(createElement(BrandLegal))).toContain('href="/privacy"');
    expect(renderToStaticMarkup(createElement(AccountPrivacyLinks))).toContain('href="/app/account/delete"');
    vi.stubEnv("VERCEL_ENV", "production");
    expect(renderToStaticMarkup(createElement(BrandLegal))).not.toContain("/privacy");
    expect(renderToStaticMarkup(createElement(AccountPrivacyLinks))).toBe("");
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

  it("shows an open request with its reference instead of a second form", () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionForm, { account, period: "Confirmed period", retention: null,
      existing: { kind: "duplicate", reference: "DEL-7KQ2M9XA", confirmedAt: "2030-01-01" } }));
    expect(html).toContain("A deletion request is already in progress.");
    expect(html).toContain("DEL-7KQ2M9XA");
    expect(html).toContain("Confirmed period");
    expect(html).not.toContain("Confirm deletion request");
  });
});
