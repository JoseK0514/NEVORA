import type { Metadata } from "next";
import { CorpButtonLink, CorpCard, CorpPage, CorpTitle } from "@/components/corp/corp";

export const metadata: Metadata = { title: "Page not found" };

/** Nov 1 upscale (kit consistency 9): a signed-in 404 stays inside the app. The shell keeps its header, sidebar and tab
 * bar; the page has the kit's title and one card with the way back (Home is the page's one primary action). Any unknown
 * /app address reaches it through app/app/[...missing]; a page that calls notFound() reaches it too. */
export default function NotFound() {
  return <CorpPage className="c-page--narrow c-notfound" labelledBy="not-found-title">
    <CorpTitle id="not-found-title" title="This page doesn’t exist" />
    <CorpCard as="div">
      <div className="c-error-card">
        <span className="c-error-card__body">The link may be old, or the page may have moved.</span>
        <span className="c-error-card__action"><CorpButtonLink href="/app" prefetch={false}>Go to Home</CorpButtonLink></span>
      </div>
    </CorpCard>
  </CorpPage>;
}
