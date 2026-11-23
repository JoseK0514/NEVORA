// Phase 9 (Nov 18, 2026), package P6: the older kits' notes speak the one vocabulary. A Wave A notice sits on its page's
// white panel, so it is the kit's callout; a Wave C notice stands on the canvas, so it is the kit's notice card. Each
// carries its meaning's bold glyph; a saved line and a status carry no fill.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "@rstest/core";
import { BGlyph, type BMeaning } from "@/components/owner-b/b-kit";
import { Notice as WaveCNotice } from "@/app/app/settings/wave-c-kit";
import { Status } from "@/components/kit/kit";
import { Notice } from "./parts";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const glyph = (meaning: BMeaning) => html(<BGlyph meaning={meaning} solid />);
const src = (path: string) => readFileSync(join(__dirname, "../..", path), "utf8");

describe("Wave A Notice", () => {
  it.each([
    ["urgent", "red", "stop", "alert"], ["done", "green", "done", "status"], ["info", "teal", "info", "status"], ["review", "amber", "check", "status"],
  ] as const)("draws %s as the kit callout in %s with the %s glyph", (tone, color, meaning, role) => {
    const markup = html(<Notice tone={tone} title="Check the schedule first">Some shifts may already be on the schedule.</Notice>);
    expect(markup).toContain(`<div class="b-callout" data-tone="${color}" role="${role}">`);
    expect(markup).toContain(`<span class="b-callout__ic" aria-hidden="true">${glyph(meaning)}</span>`);
    expect(markup).toContain('<p class="b-callout__t">Check the schedule first</p>');
    expect(markup).toContain('<div class="b-callout__b">Some shifts may already be on the schedule.</div>');
  });

  it("is said by the page, not announced, when quiet", () => {
    expect(html(<Notice tone="info" quiet title="Draft assignment">Saving adds a draft shift.</Notice>)).not.toContain("role=");
  });

  it("leaves no notice rule behind in the Wave A sheet that could restyle the card", () => {
    expect(src("app/app/premium-wave-a.css")).not.toMatch(/\.wa-notice__|\.wa-notice\[data-tone/);
  });
});

describe("Wave C Notice", () => {
  it.each([["done", "green", "done"], ["urgent", "red", "stop"], ["info", "teal", "info"]] as const)("draws %s with the %s %s glyph", (tone, color, meaning) => {
    const markup = html(<WaveCNotice tone={tone} title="Location added" action={<button type="button">Next: staffing</button>}>It opens tomorrow.</WaveCNotice>);
    expect(markup).toContain('class="b-card wc-note"');
    // A done notice carries the app's one done mark (BDoneMark, which draws its own tick); the others keep their glyph.
    if (tone === "done") expect(markup).toContain('<span class="b-ico b-ico--green b-donemark" aria-hidden="true"><svg class="b-donemark__tick"');
    else expect(markup).toContain(`<span class="b-ico b-ico--${color}" aria-hidden="true">${glyph(meaning)}</span>`);
    // The one action sits under the words, inside the text column.
    expect(markup).toMatch(/<span class="b-notice__s">It opens tomorrow\.<\/span><span class="wc-note__act"><button type="button">Next: staffing<\/button><\/span><\/span>/);
    expect(markup).not.toContain("q-note");
  });
});

describe("weights", () => {
  it("draws every kit status glyph bold, with the check for done", () => {
    const done = html(<Status tone="done">Approved</Status>);
    expect(done).toContain(glyph("done").match(/<path[^>]*>/)![0]);
    for (const tone of ["neutral", "review", "done", "urgent"] as const) expect(html(<Status tone={tone}>Word</Status>)).not.toMatch(/weight="fill"/);
  });

  it("gives saved lines the small done mark, never a filled circle", () => {
    const forms = src("components/wave-b-forms.tsx");
    expect(forms).not.toMatch(/CheckCircle|weight="fill"/);
    expect(forms.match(/<SavedMark \/>/g)).toHaveLength(3);
  });

  it("keeps fill out of the setup card and the deletion receipt", () => {
    for (const file of ["components/owner-setup-card.tsx", "components/account-deletion-form.tsx", "components/wave-a/parts.tsx", "components/kit/kit.tsx"]) expect(src(file)).not.toMatch(/weight="fill"|weight=\{[^}]*"fill"/);
  });
});

describe("notices on the canvas", () => {
  it("gives the page-level failure notice the reason's glyph in the notice ring, for every reason", () => {
    const notice = src("components/leave-staffing/failure-notice.tsx");
    expect(notice).toMatch(/<span className="ls-ring" data-tone=\{look\.tone\} aria-hidden="true"><BGlyph meaning=\{look\.meaning\}\/><\/span>/);
    for (const reason of ["sign_in", "access_ended", "refresh_view", "origin", "contract"]) expect(notice).toMatch(new RegExp(`${reason}:\\{`));
  });

  it("draws the account deletion outcome as the kit notice card and keeps its words", () => {
    // Nov 23: Owners and Managers use the Employee's deletion screen, so every role sees the same outcome card and words.
    expect(src("components/account-deletion-form.tsx")).toContain("<EmployeeDeletionView");
    const view = src("components/employee-mobile/deletion.tsx");
    expect(view).toContain("em-delete-outcome");
    for (const words of ["Your request wasn’t sent", "Account deletion isn’t available right now", "Too many tries", "We don’t know yet if your request was saved",
      "Nothing was saved and you’re still signed in.", "wait about 15 minutes, then try again. Nothing was sent."]) expect(view).toContain(words);
  });
});
