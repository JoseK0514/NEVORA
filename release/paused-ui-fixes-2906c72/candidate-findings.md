# Home continuation on 2906c72

## ST-RC-HOME-01 — P1 continuation: review extra grows at320px/200% text

Exact source `2906c72a57d24bb02d3c3e5bafc54df02076a428`. The summary repair succeeds at320px/100% text: held/ready summary and band remain fixed; total navigation CLS0.0005671.390px/100+200 and844×390/100+200 also pass in Chromium.

The responsive held-read proof exposes a second element in the same Home band at320×844/200% text. After all Inter faces load, the held Home placeholder review note has height51px; releasing the own read renders “3 items need your review” at87px. Band543→579px and primary shift pass y547.515625→583.515625, a36px movement. Summary remains144px, title144px, eyebrow80px: none causes this continuation. Overall navigation CLS0.0186485; before release0. The observer entry identifies pass and review-link SVG moving36px with no recent input.

Source `src/components/employee-home-reviewed.tsx:303` switches the nbsp note to the review link without reserving the responsive review-line shape. The existing P3-ST-01 comment assumes the line always has the same height, which is false at320px/200% text. Extend the same Home-band reservation to this dynamic extra area, preserving actual accessible words/link focus and natural responsive sizing; do not hide or clip actual data.

[Raw before/after geometry, fonts and observer sources](home-responsive.json); crops `home-responsive/chromium-320x844-t200-held.png` and `home-responsive/chromium-320x844-t200-ready.png`. This extends the named Home band initial-read finding; no checker pass is claimed on this checkpoint. Other engine rows are retained as they finish. All business writes are blocked.


WebKit continuation:320px/200% band543→691 (+148); eyebrow80→120 (+40), title144→216 (+72), review extra51→87 (+36), summary144→144. At390px/200% band471→579 (+108), with title/review growth. All computed font sizes and line heights remain unchanged; all requested fonts are loaded. WebKit lacks layout-shift observer support; these are exact rendered bounds, not a claimed CLS measurement. Both widths at100% and landscape100/200 pass. Overall9/12 responsive rows pass; three actual failures are retained.
