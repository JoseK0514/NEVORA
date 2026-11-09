# Calendar reflow and shared focus design record

Ordinary documentation extension substituted for the unavailable `impeccable_documenter`, guided by the existing Impeccable `reference/document.md`. This records a refinement of the approved Employee mobile system; no new visual world, composition, catalog component or system metadata rewrite was needed.

Reviewed artifact: `outputs/employee-mobile/index.html`.

SHA-256: `d28b942b0b8e32c164e1e5464a3c62b9eda0d64f7fa5152c1b27bdd52b3f77d7`.

I personally hashed the HTML and compared all 81 current source files against `work/employee-mobile/evidence/calendar-focus-pass/before/src`. Exactly two files differ, with no removed source files:

- `src/Calendar.css`: the existing link heading retains its type token and gains an `8ch` flex basis and text-relative minimum. The existing status badge can wrap beneath a readable heading when space is limited or text enlarged.
- `src/App.tsx`: click capture finds the actual invoking button, link or summary, focuses it before opening the native dialog, and clears the transient reference on the next task. Existing native opening/closing, keyboard containment, specialized flows and session/epoch guards remain in place.

The byte comparison confirms shared tokens, Appearance, UI primitives, layout and all model files are unchanged. I inspected `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, both project design JSON records and the private Calendar-focus surface contract. The existing 23 Light/20 Dark color roles, system typography, regular Phosphor icons, 16/12/8px radii and 48/44px controls persist. Existing design documents and preexisting metadata omissions were preserved.

Evidence inspected, not rerun by this documenter: the three focused green result files each record 20/20 passing groups at this hash, without page errors or unexpected network requests. [Independent QA](calendar-focus-qa.md) and its summary record 120/120 fresh scenarios across WebKit, Chromium and Firefox and verify EM-A01/EM-A02 resolved. The [finish review](calendar-focus-ui-review.md) approves this bounded change after inspecting all 61 original captures; no material fix remains. I read that report; I did not personally inspect its images or open a browser.

Closure covers only EM-A01 Calendar reflow and EM-A02 shared sheet focus return. Eight other full-audit findings remain open. This is a local fictional prototype, with no full Employee parity, physical-device/screen-reader certification, live integration or production approval. The workspace is not a Git repository; this documentation task made no commit, push or deployment. No additional user action is required for this record.
