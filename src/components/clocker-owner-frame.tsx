import type { ReactNode } from "react";
import { CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import "./clocker-owner-frame.css";

/* Phase 2, Settings part 2 (Nov 23, 2026): the Owner's Clocker settings pages (Clocker tablets, Shift matching, Punch
 * photos, Photo review, Clocker PINs) on the Direction B page, as Copy receipt and the other pushed Corp pages: on a phone
 * the band is the CorpNav (‹ back and the title); from 768px the CorpTitle carries the title in the band. The cards are
 * the pages' own. Presentation only: each page keeps its reads, forms and actions. */
export function ClockerOwnerFrame({ title, titleId, back, sub, actions, className, children }: {
  title: ReactNode; titleId: string; back: { href: string; label: string }; sub?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode;
}) {
  return <CorpPage className={`c-page--narrow ck-owner ck-frame${className ? ` ${className}` : ""}`} labelledBy={titleId}>
    <CorpNav back={back} title={title} titleId={titleId} phoneOnly />
    <CorpTitle title={title} sub={sub} actions={actions} wide />
    {children}
  </CorpPage>;
}
