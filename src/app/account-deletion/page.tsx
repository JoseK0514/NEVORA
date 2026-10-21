import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentPage } from "@/components/legal/legal-document";
import { ACCOUNT_DELETION } from "@/lib/legal/policies";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";

export const metadata: Metadata = { title: "Account deletion · NEVORA" };

/** Public: readable without signing in. Starting a request signs the person in first, so the server knows whose
 * account it is; an email address alone never deletes anything. */
export default function Page() {
  return <LegalDocumentPage doc={ACCOUNT_DELETION}
    action={<Link className="button primary employee-login-submit legal-action" href="/login?returnTo=%2Fapp%2Faccount%2Fdelete"><span>Start deletion request</span></Link>} />;
}
