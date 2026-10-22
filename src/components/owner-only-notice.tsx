import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { Button, Card, CardBody, PageBand } from "./kit/kit";
import { EmptyState } from "./empty-state";
import "./owner-only-notice.css";

/** PD9 / UX10: an Owner-only page opened by someone else (a shared link, a bookmark) says why it is closed and who can
 * help, in place of a silent move to Home. Permissions are unchanged: nothing on the page is read or shown. */
export function OwnerOnlyNotice({ title, reason, help = "Ask an Owner if you need a change here." }: { title: string; reason: string; help?: string }) {
  return <div className="nv-page cm-page cm-owner-only" data-nv-page="">
    <PageBand title={title} />
    <div className="nv-content">
      <Card><CardBody>
        <EmptyState icon={<LockSimpleIcon size={24} weight="regular" />} title={reason} action={<Button href="/app" kind="secondary">Back to Home</Button>}>{help}</EmptyState>
      </CardBody></Card>
    </div>
  </div>;
}
