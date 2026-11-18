import type { Metadata } from "next";
import { QuietLegalDocumentPage } from "@/components/legal/policy-page";
import { POLICY_COPY } from "@/components/legal/policy-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { TERMS } from "@/lib/legal/policies";

export async function generateMetadata(): Promise<Metadata> {
  return { title: POLICY_COPY[await readAuthLang()].metaTitle.terms };
}

/** The page follows the sign-in language (its chrome only; the document stays in English), so it reads the request. */
export default async function Page() {
  return QuietLegalDocumentPage({ doc: TERMS });
}
