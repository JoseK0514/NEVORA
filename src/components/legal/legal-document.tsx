import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthBrand } from "@/components/auth-brand";
import { BrandLegal } from "@/components/brand-legal";
import { NUVORA_BRAND } from "@/lib/brand";
import { POLICY_DOCUMENTS, POLICY_FACTS, POLICY_OPERATOR, policiesVisible, type Block, type Inline, type PolicyDocument } from "@/lib/legal/policies";

function Run({ run }: { run: Inline }) {
  if (typeof run === "string") return <>{run}</>;
  if ("fact" in run) {
    const value = POLICY_FACTS[run.fact];
    return value ? <>{value}</> : <mark className="legal-unresolved">[CONFIRM_{run.fact}]</mark>;
  }
  if ("strong" in run) return <strong>{run.strong}</strong>;
  return run.href.startsWith("mailto:") ? <a href={run.href}>{run.text}</a> : <Link href={run.href}>{run.text}</Link>;
}

const Runs = ({ runs }: { runs: Inline[] }) => <>{runs.map((run, index) => <Run key={index} run={run} />)}</>;

function BlockView({ block }: { block: Block }) {
  return "p" in block ? <p><Runs runs={block.p} /></p> : <ul>{block.list.map((item, index) => <li key={index}><Runs runs={item} /></li>)}</ul>;
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

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const shortTitle = (doc: PolicyDocument) => doc.slug === "account-deletion" ? "Account deletion" : doc.title;
