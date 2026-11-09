import type { Metadata } from "next";
import Link from "next/link";
import { QuietLegalDocumentPage } from "@/components/legal/legal-document";
import { ACCOUNT_DELETION } from "@/lib/legal/policies";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";
import "@/components/quiet/quiet.css";

export const metadata: Metadata = { title: "Account deletion · NEVORA" };

/** Public: readable without signing in. Starting a request signs the person in first, so the server knows whose
 * account it is; an email address alone never deletes anything.
 * Quiet (v4, inspection Oct 24): the same white page and expandable sections as Privacy; the policy text is unchanged. */
export default function Page() {
  return <QuietLegalDocumentPage doc={ACCOUNT_DELETION}
    action={<Link className="q-btn q-doc__start" href="/login?returnTo=%2Fapp%2Faccount%2Fdelete">Start deletion request</Link>} />;
}
