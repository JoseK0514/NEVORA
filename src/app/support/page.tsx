import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal/legal-document";
import { SUPPORT } from "@/lib/legal/policies";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";

export const metadata: Metadata = { title: "Support · NEVORA" };

export default function Page() {
  return <LegalDocumentPage doc={SUPPORT} />;
}
