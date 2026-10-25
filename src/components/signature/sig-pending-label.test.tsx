import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SigPendingLabel } from "./sig-button";

// Phase 1 (inspection Oct 24): the spinner was always rendered and only hidden, so its infinite rotation ran on every
// idle button (41 places). It now exists only while pending; an empty 16px slot keeps the button's size.
it("runs no spinner while idle and shows it while pending, at the same size", () => {
  const idle = renderToStaticMarkup(<SigPendingLabel pending={false} pendingText="Saving…">Save</SigPendingLabel>);
  expect(idle).not.toContain("sig-btn__spin\"");
  expect(idle).not.toContain("<svg");
  expect(idle).toContain('class="sig-btn__spin-slot"');
  const busy = renderToStaticMarkup(<SigPendingLabel pending pendingText="Saving…">Save</SigPendingLabel>);
  expect(busy).toContain("sig-btn__spin");
  expect(busy).toContain("<svg");
});
