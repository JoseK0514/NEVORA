"use client";
import { CorpCard, CorpPage, CorpTitle } from "@/components/corp/corp";
import { BState } from "@/components/owner-b/b-kit";
import { useAdvisorLang } from "../lang";
import { WEEKLY_COPY } from "./weekly-copy";

/** The weekly route's own failure frame (the company read didn't answer), in the person's language. The page is a server
 * component, so it renders this small client frame instead of reading the language itself. */
export function WeeklyOpenError({ review }: { review: string | null }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  return <CorpPage className="c-page--narrow" labelledBy="wk-title">
    <CorpTitle id="wk-title" title={t.weeklyPlan} />
    <CorpCard as="div"><BState kind="failed" alert title={t.couldntOpenWeekly} line={t.accessChanged} action={{ label: t.tryAgain, href: review ? `/app/ai-manager/weekly?review=${review}` : "/app/ai-manager/weekly" }} /></CorpCard>
  </CorpPage>;
}
