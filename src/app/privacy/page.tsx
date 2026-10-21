import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/legal-document";
import { PRIVACY } from "@/lib/legal/policies";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";

export const metadata: Metadata = { title: "Privacy Policy · NEVORA" };

export default function Page() {
  return <LegalDocumentPage doc={PRIVACY} />;
}
