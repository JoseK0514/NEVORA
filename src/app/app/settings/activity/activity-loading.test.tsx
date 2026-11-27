import { expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityFeed } from "./activity-feed";
import { activityCopy } from "./activity-copy";

it.each(["en", "es"] as const)("renders event-shaped placeholders and announces the initial read in %s", (lang) => {
  const html = renderToStaticMarkup(<ActivityFeed lang={lang} timeZone="America/Puerto_Rico" />);
  expect(html).toContain(activityCopy[lang].checking);
  expect(html).toContain('role="status"');
  expect(html).toContain('class="nevora-skeleton nevora-skeleton-line" aria-hidden="true"');
  expect(html).not.toContain(activityCopy[lang].empty);
});
