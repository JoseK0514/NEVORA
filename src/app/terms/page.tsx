import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/legal-document";
import { TERMS } from "@/lib/legal/policies";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";

export const metadata: Metadata = { title: "Terms of Use · NEVORA" };

export default function Page() {
  return <LegalDocumentPage doc={TERMS} />;
}
