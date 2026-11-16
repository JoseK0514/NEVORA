import { Fragment, type ReactNode } from "react";
import "@/components/auth-premium/auth-b.css";
import "@/components/quiet/quiet.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthBrand } from "@/components/auth-brand";
import { BrandLegal } from "@/components/brand-legal";
import { NUVORA_BRAND } from "@/lib/brand";
import { POLICY_DOCUMENTS, POLICY_FACTS, POLICY_OPERATOR, SUPPORT_EMAIL, policiesVisible, type Block, type Inline, type PolicyDocument } from "@/lib/legal/policies";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { AuthBackNav, DocBrand } from "@/components/auth-premium/auth-back-nav";
import { OpenOnDesktop } from "./open-on-desktop";

function Run({ run, context }: { run: Inline; context?: 'employee' }) {
  if (typeof run === "string") return <>{run}</>;
  if ("fact" in run) {
    const value = POLICY_FACTS[run.fact];
    return value ? <>{value}</> : <mark className="legal-unresolved">[CONFIRM_{run.fact}]</mark>;
  }
  if ("strong" in run) return <strong>{run.strong}</strong>;
  const href = context === 'employee' && POLICY_DOCUMENTS.some(doc => `/${doc.slug}` === run.href) ? `/app/profile${run.href}` : run.href;
  return href.startsWith("mailto:") ? <a href={href}>{run.text}</a> : <Link href={href}>{run.text}</Link>;
}

const Runs = ({ runs, context }: { runs: Inline[]; context?: 'employee' }) => <>{runs.map((run, index) => <Run key={index} run={run} context={context} />)}</>;

export function BlockView({ block, context }: { block: Block; context?: 'employee' }) {
  return "p" in block ? <p><Runs runs={block.p} context={context} /></p> : <ul>{block.list.map((item, index) => <li key={index}><Runs runs={item} context={context} /></li>)}</ul>;
}

/** A public policy page: NEVORA brand, the document, links to the other three, and the VELANI footer.
 * Readable without signing in. Production hides it until every fact is confirmed. */
export function LegalDocumentPage({ doc, action }: { doc: PolicyDocument; action?: ReactNode }) {
  if (!policiesVisible()) notFound();
  const effective = POLICY_FACTS.EFFECTIVE_DATE;
  return (
    <main className="auth-page employee-login-page auth-refinement-page legal-page">
      <div className="employee-login-shell">
        <header className="employee-login-brand"><Link href="/login" aria-label="NEVORA sign in" className="legal-brand-link"><AuthBrand /></Link></header>
        <article className="legal-document" aria-labelledby="legal-title">
          <header className="legal-head">
            <h1 id="legal-title">{doc.title}</h1>
            <p className="legal-summary">{doc.summary}</p>
            <p className="legal-meta">
              {doc.effective ? <>Effective {effective ? effective : <mark className="legal-unresolved">[CONFIRM_EFFECTIVE_DATE]</mark>} · </> : null}
              Provided by {POLICY_OPERATOR}
            </p>
            {action}
          </header>
          {doc.sections.map(section => (
            <section key={section.heading} className="legal-section" aria-labelledby={`legal-${slug(section.heading)}`}>
              <h2 id={`legal-${slug(section.heading)}`}>{section.heading}</h2>
              {section.blocks.map((block, index) => <BlockView key={index} block={block} />)}
            </section>
          ))}
        </article>
        <nav className="legal-nav" aria-label="NEVORA policies and help">
          {POLICY_DOCUMENTS.map(other => other.slug === doc.slug
            ? <span key={other.slug} aria-current="page">{shortTitle(other)}</span>
            : <Link key={other.slug} href={`/${other.slug}`}>{shortTitle(other)}</Link>)}
        </nav>
        <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal /></footer>
      </div>
    </main>
  );
}

const TOC_TITLE: Partial<Record<PolicyDocument["slug"], string>> = { privacy: "In this policy", terms: "In these terms" };
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const shortTitle = (doc: PolicyDocument) => doc.slug === "account-deletion" ? "Account deletion" : doc.title;

/** Quiet (v4, approved Oct 23): a policy page on the white sign-in page. Back to Sign in, the title and its effective date,
 * then one row per section that opens its text in place; Questions ends the list with the support email. */
export function QuietLegalDocumentPage({ doc, action }: { doc: PolicyDocument; action?: ReactNode }) {
  if (!policiesVisible()) notFound();
  const effective = POLICY_FACTS.EFFECTIVE_DATE;
  const sub = doc.effective ? `Effective ${effective ?? "[CONFIRM_EFFECTIVE_DATE]"} · ${POLICY_OPERATOR}` : POLICY_OPERATOR;
  // Review B4 (Nov 10, 2026): the white wordmark on the band (NV-200); one back control (NV-318); the action on the title
  // row inside the band (NV-204); a contents list only where it saves scanning (more than six sections) and, from 1024px,
  // the sections open as one reading card the list moves through (NV-201); the how-to on Account deletion opens first
  // (NV-205); disclosures turn a down caret (NV-101 here).
  const toc = doc.sections.length > 6;
  return (
    <main className="q-page q-auth q-doc" data-nv-page="">
      <div className="q-auth__col">
        <DocBrand />
        <AuthBackNav href="/login" label="Sign in" />
        <div className="q-hd q-doc__hd"><div><h1 id="legal-title">{doc.title}</h1><p>{sub}</p></div>{action ? <div className="q-doc__action">{action}</div> : null}</div>
        <p className="q-sr">{doc.summary}</p>
        {/* Desktop (auth-b.css, 1024px and wider): the sections as a contents list on the left; a link jumps to its open
          * section. Phones and tablets don't show it. */}
        {toc ? <nav className="q-doc__toc" aria-labelledby="legal-toc-title"><h2 id="legal-toc-title">{TOC_TITLE[doc.slug] ?? "On this page"}</h2>
          <ul>{doc.sections.map(section => <li key={section.heading}><a href={`#legal-${slug(section.heading)}-text`}>{section.heading}</a></li>)}</ul></nav> : null}
        <ul className="q-list q-doc__list" id="legal-sections" aria-labelledby="legal-title">
          {doc.sections.map((section, index) => <li key={section.heading}>
            <details className="q-details" id={`legal-${slug(section.heading)}`} open={doc.slug === "account-deletion" && index === 0 ? true : undefined}>
              <summary className="q-row q-row--one"><span className="q-rt"><b>{section.heading}</b></span><CaretDownIcon className="q-chev" weight="bold" aria-hidden="true" /></summary>
              <div className="q-doc__body" id={`legal-${slug(section.heading)}-text`}>{section.blocks.map((block, index) => <BlockView key={index} block={block} />)}</div>
            </details>
          </li>)}
          {doc.slug === "privacy" ? <li><a className="q-row q-row--one" href={`mailto:${SUPPORT_EMAIL}`}><span className="q-rt"><b>Questions</b></span><span className="q-rv">{SUPPORT_EMAIL}</span></a></li> : null}
        </ul>
        <QuietPolicyLinks current={doc.slug} />
        {toc ? <OpenOnDesktop list="legal-sections" /> : null}
      </div>
    </main>
  );
}

/** Quiet (v4): the policy pages link each other (and Account deletion) in one line at the end. */
export function QuietPolicyLinks({ current }: { current: PolicyDocument["slug"] }) {
  return <nav className="q-doc__links" aria-label="NEVORA policies and help">
    {/* Each link keeps its dot, so a line never ends on "·" or splits a title (NV-317). */}
    {POLICY_DOCUMENTS.map((other, index) => <Fragment key={other.slug}>{index ? " " : null}<span className="q-legal__item">{index ? "· " : null}{other.slug === current
      ? <span aria-current="page">{shortTitle(other)}</span>
      : <Link href={`/${other.slug}`}>{shortTitle(other)}</Link>}</span></Fragment>)}
  </nav>;
}
