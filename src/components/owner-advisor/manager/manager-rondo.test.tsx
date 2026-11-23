import { describe, expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import { Answer, ClosedCard, ManagerRondo, WeekCard } from "./manager-rondo";

// Fictional values (Northside QA Workforce).
const at = "2026-11-18T15:04:00.000Z";
const place = { id: "loc-1", name: "Northside Main Office" };
const days = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]
  .map((date, i) => ({ date, draftShifts: i === 1 ? 1 : 0, publishedShifts: i < 5 ? 3 : 0, releasedShifts: i === 2 ? 1 : 0, scheduledMinutes: i < 5 ? 1440 : 0 }));
const answer = (question: "scheduled_minutes" | "draft_shifts", value: number) =>
  ({ data: { weekStart: "2026-11-30", location: place, question, value, observedAt: at, validForMs: 14980 }, until: Date.now() + 14980 });

describe("Rondo AI for a Manager", () => {
  it("opens on its title and a quiet loading card, with nothing private before the server answers", () => {
    const html = renderToStaticMarkup(<ManagerRondo currentWeek="2026-11-30" timeZone="America/Puerto_Rico" read={async () => ({ kind: "aborted" })} />);
    expect(html).toContain("Rondo AI");
    expect(html).toContain("Opening Rondo AI");
    expect(html).not.toContain("Northside");
  });

  it("answers with the figure, what it counts, and where and when it was checked", () => {
    const html = renderToStaticMarkup(<Answer question="scheduled_minutes" answer={answer("scheduled_minutes", 450)} state="idle" timeZone="America/Puerto_Rico" hidden={false} onRetry={() => {}} />);
    expect(html).toContain("How many hours are scheduled?");
    expect(html.replace(/\u00a0/g, " ")).toContain("7 h 30 min");
    expect(html).toContain("Planned time from the schedule. Timecards show hours worked.");
    expect(html).toContain("Northside Main Office");
    expect(html).toContain("Checked 11:04");
    expect(html).toContain('aria-live="polite"');
  });

  it("says a failed answer is a failure, never a zero", () => {
    const html = renderToStaticMarkup(<Answer question="draft_shifts" answer={null} state="unavailable" timeZone="UTC" hidden={false} onRetry={() => {}} />);
    expect(html).toContain("Couldn’t get an answer");
    expect(html).toContain("Try again");
    expect(html).not.toMatch(/0 drafts/);
  });

  it("reads the week day by day, hours as planned time, and drops zero facts", () => {
    const html = renderToStaticMarkup(<WeekCard summary={{ data: { weekStart: "2026-11-30", location: place, days, observedAt: at, validForMs: 14980 }, until: Date.now() + 14980 }}
      state="idle" hidden={false} now={Date.now()} onRetry={() => {}} onShow={() => {}} />);
    expect(html).toContain("Mon, Nov 30");
    expect(html).toContain("3 shifts");
    expect(html).not.toContain("shifts published");
    expect(html).toContain("1 released");
    expect(html).toContain("No shifts");
    expect(html).toContain("24 h");
  });

  it("gives every closed state one way on", () => {
    expect(renderToStaticMarkup(<ClosedCard why="session" />)).toContain('href="/login"');
    for (const why of ["disabled", "forbidden"] as const) expect(renderToStaticMarkup(<ClosedCard why={why} />)).toContain("Return to Home");
  });
});
