# NEVORA UI audit

One command audits the whole app's UI on fictional data. Every selected view is a role × route × state × width ×
text size × browser × language. Each view is checked against the rules below and gets a full-page screenshot and a
crop per finding. The run writes a JSON report and a ranked `summary.md`, and with `--baseline` it diffs pixels
against an earlier run. It exits non-zero on any fail-severity finding, so it can gate a merge.

```bash
npm run ui:audit                                   # everything: 7 roles, every route, 5 widths, 100% and 200% text, Chromium and WebKit, English
npm run ui:audit -- --roles owner --routes /app/schedule --widths 390,1440 --text 100
npm run ui:audit -- --lang en,es --browsers webkit
npm run ui:audit -- --baseline /tmp/nevora-ui-audit/20261124T120000Z    # pixel diffs against an earlier run
npm run ui:audit -- --selftest                     # prove each rule catches a seeded defect
```

The audit never sends email or SMS, takes a payment or presses the billing handoff. It uses a throwaway local
PostgreSQL and the owned test app (`src/test/integration/owned-next-app.ts`), seeded by `fixtures/seed.mts`. Every
request to an origin other than the app is aborted.

## Requirements

- PostgreSQL 16 binaries (default `/usr/lib/postgresql/16/bin`, or `NEVORA_TEST_PG_BIN`).
- The pinned Playwright in `tools/ci-browser-runtime` (1.62.1) with its Chromium and WebKit, as the readiness tests use.
  In the cloud container these are at `/opt/pw-webkit`, which the CLI picks up when `PLAYWRIGHT_BROWSERS_PATH` is unset.
  Elsewhere, set `PLAYWRIGHT_BROWSERS_PATH`, or run `npx playwright install chromium webkit` inside
  `tools/ci-browser-runtime`.
- A non-root user. Run as root and the CLI re-runs itself as `SCAN_USER` (default `postgres`). That user needs to write
  `node_modules/.vitest-cache`, `.omo/evidence` and the output folder; the CLI hands them over.
- The owned app builds from the **committed** tree. Commit or stash application changes before you audit them; files
  under `tools/ui-audit` may stay uncommitted.

## Options

| Option | Default | Meaning |
|---|---|---|
| `--roles` | all | `owner,manager,scoped-manager,lead,employee,public,clocker`. `scoped-manager` includes the empty-location Manager (state `empty`) and `employee` includes the new employee with no records (state `empty`). |
| `--routes` | every route of each role | Comma-separated. An entry starting with `/` matches a path exactly (query ignored); anything else matches as a substring, e.g. `payroll`. |
| `--widths` | `320,390,768,1024,1440` | Viewport widths. Heights: 844 up to 430, 1024 up to 800, 768 up to 1100, else 900. Up to 768 the context has touch; above it, a mouse. |
| `--text` | `100,200` | 200% sets the root font size (`html { font-size: 200% }`), not zoom. |
| `--browsers` | `chromium,webkit` | Both run in parallel. |
| `--lang` | `en` | `en`, `es` or `en,es`. Sets the `nv-lang` cookie (the app's language when the person has no saved choice) and the kiosk's saved locale. |
| `--build` | `production` | `production`: `next build` and `next start`, served at `https://collab.nevora.example.invalid` through the owned TLS proxy, so secure cookies work in WebKit. `dev`: `next dev` over http. |
| `--out` | `/tmp/nevora-ui-audit/<UTC time>` | Must be outside the repository. |
| `--baseline` | none | An earlier `--out`. Screenshots with the same path are compared; over 0.2% changed pixels is a `pixel-diff` warning with a diff image under `diffs/`. |
| `--workers` | `2` | Browser contexts per browser at once. |
| `--focus-stops` | `60` | Most Tab presses per view. |
| `--max-views` | none | Stop after N views (a quick look). |
| `--selftest` | off | See [Self-test](#self-test). |
| `--report-only` | off | Rebuild `report.json` and `summary.md` from an existing `--out`. |

Total time is printed at the end and recorded in `summary.md`. The run builds the app once, signs in each role once
(the session is reused by every context, so the login rate limit is never hit), and runs the browsers in parallel.

## Output

- `report.json`: options, totals, counts by rule and every view with its findings. A finding has `rule`, `severity`,
  `selector`, `text`, `rect` (page coordinates), `data` (measurements) and `crop`.
- `summary.md`: totals, counts by rule, views that could not be audited, then findings grouped by rule and element,
  fails first.
- `shots/<browser>/<role>/<lang>-<text>/<route>[~state]-<width>.png`: full page.
- `crops/…`: one crop per fail or warning that has a box (up to 12 per view).
- `views.jsonl` and `meta.json`: the raw stream and run metadata.

## Severities

- **fail**: a defect against WCAG 2.2 AA or a hard layout break. The run exits 1.
- **warn**: below NEVORA's own bar (DESIGN.MD, Apple HIG 44pt) or likely wrong. It is reported but doesn't gate.
- **info**: recorded for context, such as an exception that applied, a sampled glass contrast that passed, a known G69
  abort or an inline link's size.

## Rules

| Rule | Severity | What it checks |
|---|---|---|
| `overflow-x` | fail | The page is wider than the viewport. Lists the innermost wide elements. |
| `text-clipped` | fail / warn / info | Text cut by `overflow` or ellipsized. Product copy: fail. People data (names, the workspace, locations, positions from the fixtures, or anything inside `[data-user-data]` or `[translate=no]`): info at 100%, warn at 200%. |
| `text-overlap` | fail | Two text boxes overlap by more than 2×3 px. Text in fixed and in scrolling layers is not compared. |
| `text-over-control` | fail | Text outside a control is drawn over it, apart from the control's own label. |
| `offscreen` | warn | Text past the viewport's left or right edge, outside a horizontal scroller. |
| `axe:<id>` | fail / warn / info | axe-core 4.14.1, tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. Critical and serious are fail, moderate warn, minor info. **Glass:** axe can't see through `backdrop-filter`. For `color-contrast`, the audit samples the rendered pixels in the element's box (text colour against the most common other colour). If the sample meets the ratio axe asked for, the finding becomes info with `glassFalsePositive`. |
| `target-size` | fail / warn / info | Drawn size of a control: under 24 px in either direction fails (WCAG 2.5.8); under 44 px warns (HIG, DESIGN.MD). Inline text links are info. A checkbox or radio counts with its label. The exceptions file can turn either into info. |
| `reach` | fail / warn | After `scrollIntoView`, `elementFromPoint` at the control's centre ±12 px (fail on a miss: no 24 px reach) and ±21.5 px (warn: no 44 px reach), up, down, left and right. A miss names the element that was hit. Touch emulation at 768 and below, a mouse above. |
| `hidden-focusable` | fail | Tabbable but invisible: inside `aria-hidden`, fully transparent or zero-size (a skip link that shows on focus passes). Also a transparent control that still takes clicks at its centre. |
| `focus-ring` | fail | Tab through the page. Every stop needs a visible ring: an outline of 2 px or more, or a box-shadow, border, `::before` or `::after` that changes on focus by at least 2 px. Unfocused styles are recorded first. |
| `focus-order` | warn | A stop that goes back in DOM order (positive `tabindex`), or jumps more than 60 px up the screen outside fixed or sticky bars. |
| `focus-trap` | fail | Focus cycles before reaching the end of the page. |
| `label-in-name` | fail | WCAG 2.5.3: the accessible name (`aria-label` or `aria-labelledby`) contains the visible label. |
| `duplicate-id` | fail | An `id` used more than once. |
| `img-alt` | fail | `img` or `input[type=image]` without `alt`, or `role=img` without a name. |
| `row-button-heights` | warn | Filled or outlined buttons on one row, in one parent, whose heights differ by more than 1 px. |
| `button-wrap` | warn | At 100% text, a filled or outlined button whose label takes two lines. |
| `card-align` | warn | In a `.b-card`, `.c-card` or `.q-list`, the rows' first text starts at different left edges, by more than 1 px (from tools/ui-scan's audit.js). |
| `tabular-nums` | warn | Three or more figures sharing a right edge (a value column) where some lack `font-variant-numeric: tabular-nums`. |
| `console-error`, `page-error` | fail | Console errors and uncaught exceptions while the view loads. In WebKit, "due to access control checks" (G69) is reported as `known-g69` info instead. |
| `network` | fail / warn | Failed requests (fail) and 5xx (fail) or 4xx (warn) responses, apart from intended ones: aborted outside origins, navigation-cancelled prefetches, the state's own 503s, offline, an expected 404 or a denied page's 401/403/404. |
| `cls` | fail | Cumulative layout shift over 0.1 while the view loads (Chromium; WebKit has no layout-shift entries). |
| `reduced-motion` | fail | The context runs with `prefers-reduced-motion: reduce`. A transition over 0.01 s on a moving property (transform, position, margin, inset, size or `all`), or a running animation whose keyframes move, fails. |
| `forced-colors` | fail | With `forced-colors: active`, a button with no border or outline (it would vanish in Windows contrast themes). |
| `html-lang` | fail | `<html lang>` doesn't match `--lang`. |
| `spanish-leak` | fail | With `--lang es`, visible text with English UI words. Left out: people data, brand names (NEVORA, Rondo, Velani), and anything marked `lang="en"` or `translate="no"`. |
| `pixel-diff` | warn | With `--baseline`: more than 0.2% of pixels changed (a channel moves by over 24). |

## Routes and states

`routes.mjs` lists every role's routes, grouped by role.

The **roles**:

| Role | Who signs in |
|---|---|
| `owner` | QAOWNER, with rich data |
| `manager` | Elena Ruiz, company-wide Manager |
| `scoped-manager` | Daniel Fictional-Reyes, Manager for West Office with leave, publish and time-exception permissions |
| `empty-manager` | A Manager for an empty location (selected with `scoped-manager`) |
| `lead` | Ana Colon |
| `employee` | James Ortiz, with rich records |
| `new-employee` | An employee with no records (selected with `employee`) |
| `public` | Nobody (signed out) |
| `clocker` | A kiosk tablet enrolled on Main Office |

The **states**:

| State | What it shows |
|---|---|
| `default` | The page as it loads |
| `empty` | Nothing to show |
| `draft` | Next week's unpublished draft |
| `slow` | Every same-origin `/api` GET held 3.5 s; captured at 3 s |
| `failed` | `/api` GETs answered 503 |
| `offline` | The browser goes offline after load |
| `denied` | A route outside the role's access |
| `login-error`, `login-empty` | Sign-in error states on the public `/login` page |
| `clocker-pin` | The kiosk's PIN pad after a fictional Employee ID |

**To add a route**, put its path in the role's list in `routes.mjs`. To give it a state, add `{path, state}` to the
role's state list. Paths can use `{person}`, `{employee}`, `{lead}`, `{week}`, `{nextWeek}` and `{location}`, which
come from the fixture ids. If a route needs records that don't exist yet, add them in `fixtures/seed.mts` with the
app's own server functions and fictional values. If it needs a new preparation (anything a browser route or
`page.evaluate` can do, never an app code change), add it to `audit()` in `driver.integration.mts`.

## Exceptions

`exceptions.json` lists documented exceptions. Each has a `rule`, a `selector`, an optional `width` list or
`minWidth`, and a `reason`. A matching finding becomes info. The current list:

- **The 320 week strip:** seven 40 px days must fit at 320.
- **The desktop sidebar from 1024:** links are 200×40 with a mouse. They pass WCAG 2.5.8 and are below the 44 pt touch
  goal by design.

Add one only with a reason that points at DESIGN.MD or a decision.

## Self-test

`--selftest` checks that every rule catches a known defect. For each rule, `selftest/injections.mjs` holds one defect,
injected into the rendered page after load: a 2000 px strip, a borderless button, `lang="fr"` and so on. Defects are
never written into the app.

The audit runs each target view twice, clean and injected. A rule passes when it reports more findings on the injected
view than on the clean one. `pixel-diff` is checked by comparing the clean and injected screenshots of the
`overflow-x` case. `summary.md` gets a table of the results, and the run exits 1 if any rule misses.

## Files

| File | What it does |
|---|---|
| `cli.mjs` | Parses options, runs as a non-root user, starts PostgreSQL and the driver, writes the report and sets the exit code |
| `driver.integration.mts` | Builds the app and runs the views, through `vitest.ui-audit.config.mts`. Not in tsc or the unit suite. |
| `fixtures/seed.mts`, `seed-owner.mts`, `seed-employee.mts` | The fictional business (from tools/ui-scan) |
| `routes.mjs` | Roles, routes and states |
| `rules/page-rules.js` | The in-page rules |
| `report.mjs` | Writes `report.json`, `summary.md`, the pixel diffs and the self-test table |
| `exceptions.json` | Documented exceptions |
| `selftest/injections.mjs` | The defect for each rule |
