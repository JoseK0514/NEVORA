# Guides for the release candidate: Owner guide Clocker steps

Shared tip `6801e035` (Clocker UI steps 1–3). Release commits, in order:

| Commit | Parent | What |
|---|---|---|
| `6bedd3ed` | `6801e035` | Owner guide (`docs/guides/web/owner.md`): **Clock in at** under "Add people and grant access"; **How staff sign in** and the name picker under "Tablet setup and uncertain punches". `sources.json` adds the three copy files as evidence. |
| `32002835` | `6bedd3ed` | The six PDFs and `manifest.json`, built from `6bedd3ed` (application hash `6b9e45ea…`, the same app source as `6801e035`; no file under `src` changes). |

The builder only builds from committed source, so the text and the build are two commits; the shared branch
fast-forwards to `32002835`. `check-manuals` verifies all six; `manual-publication` and `manual-bundle`: 57 passed.

## What the guide now says
- **Clock in at**, on the page of an active person who isn't an Owner: **Where they work**, **Only these locations** (tick
  at least one) or **Every location** (includes locations added later); **Works here** and **Main** beside each
  location; **Save** turns on once something changes.
- A tablet's row: **How staff sign in**, **Employee ID + PIN** or **Name picker + PIN**, with the warning title quoted word
  for word (**Names are visible to anyone near this tablet**), **Turn on name picker**, own PIN still needed, Employee ID
  still available. Only a connected tablet at an active location can change; a replaced tablet starts with Employee ID
  + PIN.
- The tablet: **Choose your name**, tap a name, **Enter your PIN**; the back arrow (**Choose another name**, its
  accessible name) returns to the list; the list shows active people with a Clocker PIN who may clock in there, by
  first name and last initial; **Use Employee ID** is always there.

No payroll, tax, legal, billing or privacy sentence was changed. The guides are text only (the builder renders offline
and embeds no images), so the captures below are the evidence, not guide content.

## Captures (production build, fictional data)
Owned production build (`next build` + `next start`) of `6801e035`, served on the owned https origin through the
repository's TLS proxy (production refuses Clocker setup on plain http), Chromium, reduced motion. Fictional seed
(Northside Café & Bakery). The tablet was added and connected through the Owner screens ("Stockroom tablet", Calle
Loíza), fictional PINs were set for seven Calle Loíza people through **Clocker PINs**, and the name picker was turned
on from the tablet's row. `shots/guides-rc/`:

| File | Shows |
|---|---|
| `step1-row-390` | Person page (Elena Ruiz): **Clock in at** · "Where they work · Calle Loíza, Condado" |
| `step1-sheet-1440`, `step1-only-1440` | The Clock in at sheet; Only these locations with Works here · Main |
| `step2-sheet-1440`, `step2-picker-warning-1440`, `step2-saved-1440` | How staff sign in; the warning and Turn on name picker; Saved |
| `step2-tablets-after-1440` | Clocker tablets with the new tablet's row ("Name picker + PIN") |
| `step3-names-1024`, `step3-names-phone-390` | Choose your name (iPad 1024 and phone 390) |
| `step3-pin-1024`, `step3-useid-1024` | Enter your PIN with the back arrow; Use Employee ID |

Found while capturing, already reflected in the text: on the PIN screen "Choose another name" is the back arrow's
accessible name, not visible text; a tablet in picker mode with nobody eligible (no PINs yet) shows the Employee ID
screen.
