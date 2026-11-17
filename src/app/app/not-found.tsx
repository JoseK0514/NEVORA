import type { Metadata } from "next";
import { CorpPage } from "@/components/corp/corp";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { BButtonLink, BState, BStateScreen } from "@/components/owner-b/b-kit";
import { accountCopy } from "@/components/employee-b/account-copy";

export const metadata: Metadata = { title: "Page not found" };

/** Nov 1 upscale (kit consistency 9): a signed-in 404 stays inside the app. The shell keeps its header, sidebar and tab
 * bar; the page has one card with the way back (Home is the page's one primary action). Any unknown /app address reaches
 * it through app/app/[...missing]; a page that calls notFound() reaches it too. Review B2 (NV-076): a Direction B page (the
 * band with "‹ Home" and the title, then the state card). Phase 2 (package D): the same state screen at every width;
 * tablets and desktop drew the older title and card for the Owner and Manager, and the Employee's card was a full
 * reading column wide. Phase 4 (EM-019): a wrong link is not a failure, so the circle is the grey "nothing here" one with a
 * search glyph (red is for what failed or stops you), and the card offers two useful ways on: Home, the page's one filled
 * button, and Schedule as the quiet text link the closed pages use. Every role has both pages. */
export default function NotFound() {
  return <CorpPage className="c-page--narrow c-notfound c-route-state--checking" labelledBy="not-found-title">
    <BStateScreen title="Page not found" titleId="not-found-title" back={{ href: "/app", label: "Home" }}>
      <BState kind="empty" icon={<MagnifyingGlassIcon weight="bold" />} title="This page doesn’t exist" line="The link may be old, or the page may have moved.">
        <div className="b-state-actions b-closed-actions">
          <BButtonLink href="/app" kind="teal">Go to Home</BButtonLink>
          <Link className="b-closed-also" href="/app/schedule">{accountCopy().openSchedule}</Link>
        </div>
      </BState>
    </BStateScreen>
  </CorpPage>;
}
