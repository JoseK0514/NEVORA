import "@/components/auth-premium/auth-b.css";
import "@/components/quiet/quiet.css";
import Link from "next/link";
import { POLICY_DOCUMENTS, POLICY_FACTS, type Block, type Inline, type PolicyDocument } from "@/lib/legal/policies";

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

export const policySlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const shortTitle = (doc: PolicyDocument) => doc.slug === "account-deletion" ? "Account deletion" : doc.title;
