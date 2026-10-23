# NEVORA — 50-reviewer inspection brief (read this first)

Jose (the owner of NEVORA) asked for a broad inspection of the whole product by many specialists, ending in
**recommendations**. You are one of 50 reviewers. Each reviewer has a narrow lens; stay inside yours so the 50 reports
don't repeat each other.

## What NEVORA is
A workforce app (scheduling, time clock, timecards, time off, shift swaps, availability, updates, payroll prep) for
small and mid-size businesses, built in Puerto Rico (English and Spanish users). Roles: **Owner, Manager, Lead,
Employee**. The Owner and Manager app was just rebuilt to an approved "clean manager v3" design (native-iOS feel on
phones, a flat hairline desktop, system font, NEVORA teal as the tint). Employee and Lead pages were not part of v3.

## Where things are
- Code (read-only for you): `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-wave-a-1283c8`
  (Next.js 16 / React 19 App Router, TypeScript; `src/app`, `src/components`, `src/lib`).
- Approved design: `docs/product/specs/clean-manager/spec.md`, mockups in `docs/product/specs/clean-manager/mockups/png/`
  and `mockups/build.tsx` + `mockups/v3.css`. Team rules: `docs/product/TEAM-RULES.md`. Design notes: `DESIGN.MD`.
- **Screenshots of every page, current build** (Owner `QAOWNER`, Manager `AUDIT-M`, Employee `AUDIT-E`, 390px phone and
  1440px desktop, full page):
  `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-a-1283c8/8826aaed-d30f-485c-8afb-4ef7d6834f83/scratchpad/review50/shots/`
  Earlier QA evidence (many more screenshots and probe logs):
  `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/qa-out/`
- A live local preview with fictional data runs at `http://127.0.0.1:59682`. **Only reviewers whose brief says "browser
  allowed" may use it.** Signed-in browser states (fictional accounts) are in
  `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-a-1283c8/8826aaed-d30f-485c-8afb-4ef7d6834f83/scratchpad/preview/state/{QAOWNER,AUDIT-M,AUDIT-E}.json`
  (Playwright `storageState`). Playwright is importable from
  `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. Example helper:
  `.../scratchpad/tools/common.mjs` (`open(account, width)` returns `{b, c, p}`; `BASE` is the preview URL).

## Hard rules
1. **Inspect only.** Do not edit, create, delete or move any file in the repository. No `git` commands that change
   anything (no commit, checkout, stash, reset, push). Reading is fine.
2. **No server, database or external writes.** Don't submit forms that change data, don't approve/decline, don't send
   anything, don't run seeds or migrations, don't call external services. Fictional data only.
3. **Never print secrets** (passwords, tokens, cookie values, connection strings). Don't read `.env*` values aloud.
4. **Browser use (only if your brief allows it):** at most one browser at a time; close it before opening another;
   keep total browser time under ~15 minutes; never more than 3 pages per second.
5. Don't start servers, builds (`next build`), Postgres, or long test runs. `npx vitest run <one file>` is OK if needed.
6. Don't re-report what is already fixed: the v3 rebuild just went through many QA rounds (titles, tabs, contrast,
   touch targets, large text, CLS). Look for what remains, what is structurally weak, and what would make the product
   better — not pixel nits already in the QA logs.

## Your output
1. Write your full report to
   `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-a-1283c8/8826aaed-d30f-485c-8afb-4ef7d6834f83/scratchpad/review50/reports/<NN>-<slug>.md`
   (the number and slug are in your brief). This is the only file you may write.
2. Report format:
   - `# <NN> <Role> — <lens>`
   - **Verdict** (2–3 sentences, plain language)
   - **Recommendations** — numbered, most important first, max 10. Each: *what to do*, *why* (evidence: file:line,
     screenshot name, or measured number), *impact* (High/Medium/Low), *effort* (S/M/L), *owner* (UI = Claude,
     Backend = Codex, Product = Jose).
   - **What's good** (max 3 bullets).
   - **Not checked / limits** (what you couldn't verify).
3. Your final reply (what the lead sees) must be **under 120 words**: the file path, your verdict, and your top 3
   recommendations in one line each. No long text in the reply — it goes in the file.
