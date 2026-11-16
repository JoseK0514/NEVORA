import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BState } from "./b-kit";

const glyph = (html: string) => html.match(/<span class="b-ico[^"]*"[^>]*>(.*?)<\/span>/)?.[1] ?? "";

// Nov 14 inspection (SY-023): an empty list is not a warning.
describe("BState", () => {
  it("draws a neutral glyph for the empty kind and keeps the warning for the failed kind", () => {
    const empty = renderToStaticMarkup(<BState kind="empty" title="No requests yet" />);
    const failed = renderToStaticMarkup(<BState kind="failed" title="Requests didn’t load" />);
    expect(empty).toContain('class="b-ico b-ico--grey"');
    expect(failed).toContain('class="b-ico b-ico--red"');
    expect(glyph(empty)).toContain("<svg");
    expect(glyph(failed)).toContain("<svg");
    expect(glyph(empty)).not.toBe(glyph(failed));
  });
  it("still takes a page's own glyph", () => {
    const html = renderToStaticMarkup(<BState kind="empty" title="No requests yet" icon={<i data-own="" />} />);
    expect(glyph(html)).toBe('<i data-own=""></i>');
  });
});
