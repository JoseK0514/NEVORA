# Measured combined candidate findings

## ST-RC-PAYROLL-SAVE-01 — P2: Company save control loses36px while pending

Exact source `cd764f614be8ca5b5215be19d46e07cf968638d7`, QAOWNER, `/app/settings/payroll`,320×844 at200% text, Chromium and WebKit. The actual Company save button is88px tall before activation and52px while its intercepted POST is held (−36px; x/y/width unchanged).390×844/100% passes. The original connected DOM control retains focus, is natively enabled with aria-disabled=true, and repeated activation sends exactly one held request. Fields remain locked and client/guard checks pass. WebKit320/200 also retains a failed4.5:1 contrast assertion: computed rgb(95,102,106) on rgb(211,226,225),4.37676695:1 at the pending sample; its style/transition attribution is being investigated separately. No mutation reached the server.

Source: `src/components/payroll/payroll-settings.tsx:130` replaces “Save company preferences” with “Saving…” without reserving the larger label. Reserve both labels with the existing centered PendingLabel pattern while retaining the current synchronous command/focus guards. No app edit is made by this inspector; this is not called a regression without a source comparison.

| Engine | Idle | Held | Delta | Held crop | Settled crop |
| --- | ---: | ---: | ---: | --- | --- |
| chromium | 88px | 52px | -36px | [Held](crops/chromium-payroll-settings-focus-QAOWNER-320x844-t200-default-save-pending.png) | [After409](crops/chromium-payroll-settings-focus-QAOWNER-320x844-t200-default-409.png) |
| webkit | 88px | 52px | -36px | [Held](crops/webkit-payroll-settings-focus-QAOWNER-320x844-t200-default-save-pending.png) | [After409](crops/webkit-payroll-settings-focus-QAOWNER-320x844-t200-default-409.png) |

[Exact raw rows](targeted-base-states.json), [recovery log](payroll-locator-recovery.log), [original setup-gap custody](attempts/001-payroll-label-locator/recovery-lineage.json). The four original locator setup gaps are separate from these two completed negative application assertions. The checker continues regardless of this valid finding.

Existing-finding crosswalk: **IS-B12 /21e603b** covers Company pending/failure focus; the pending connected-button/focus contract passes here, so this height defect is not a failed IS-B12 fix. **IS-B31** covers native Enter in a field, a separate activation/focus scope. **IS-B27** covers which form gets a pending label, not intrinsic label height. **ST-WB-15 /980e823** reports the same88→52px pattern for Compose publication only (`p35-wave-b/round-4/stability.md:11`); its Compose fix passes this run and does not cover Company settings. No existing Company-save height ID was found in the inspected stability/crosswalk reports, so this receives its own ID.

The entire `src/components/payroll/payroll-settings.tsx` is byte-identical in cd764f6 and the separately frozen15a0fcd7, SHA256 `ee80b3cf0b5dbbe4dec10ad2155034c2bce9183cfb4888e1ae525cf903ff43e2`. The same unreserved label branch is therefore present in15; this is a source comparison, not fresh15 runtime credit.


### Painted impact confirmed with ordinary document scroll

The original320/200 pending overlay occludes the save control; that original limitation remains. A separate source-exact causal trace changes only the document reading position so the actual control is near y96, above the unchanged progress panel. It changes no app markup/styles and leaves the same held POST/guards intact. Chromium and WebKit both then paint88→52px and the visible **Employee exceptions** heading moves up36px (Chromium219.516→183.516; WebKit220.516→184.516). Element-from-point probes hit the real control/heading before and after. This supplies the visible impact for P2, rather than inferring it from occluded DOM geometry.

[Frame/ancestor/hitpoint/animation trace](pending-colour-attribution.json), [Chromium real early viewport](pending-colour/chromium-320-t200-above-feedback-early.png), [Chromium settled held viewport](pending-colour/chromium-320-t200-above-feedback-settled.png), [WebKit early](pending-colour/webkit-320-t200-above-feedback-early.png), [WebKit settled](pending-colour/webkit-320-t200-above-feedback-settled.png).

## TC-WA-16 continuation — P2: visible pending text crosses a low-contrast colour transition

The original WebKit320 raw assertion measures4.37676695:1 underneath the progress overlay; that single occluded sample is **not** used as visible failure proof. Its false assertion remains preserved as an oracle/visibility limitation, with no rewritten pass.

The separate actual-paint trace confirms a real visible colour dip: Chromium390/100 at the natural focus position and320/200 with the control scrolled above feedback both reach **1.05599:1**, five visible sampled frames below4.5. WebKit320/200 above feedback reaches **1.67711:1** in one visible sampled frame. All settled held colours are#5F666A on#EEF1F0, **5.13895:1**. The source's160ms background-color CSS transition is active while foreground switches immediately to muted; actual CSSTransition timing/currentTime is captured. Reduced-motion is true, but Payroll has no `.nv-page` ancestor, so kit.css:338's reduced-motion rule does not match. All relevant ancestor opacities are1, filters none, button background opaque; visible hitpoints verify the source text is painted rather than covered.

Sources: `src/components/kit/kit.css:243` background transition, `:250` pending colours, `:338` scoped reduced-motion override, and `src/app/app/premium-wave-b.css:638` preserved pending colours/opacity. Crosswalk: TC-WA-16's opacity preservation and coordinator superseding opacity rule pass; this remaining colour transition is a separate cause within its pending-kit contrast scope. It is not a failure of the dropped redundant namespace override. No application edit is made here.

## P3-ST-01 continuation — Recorded time read changes the visible Home card's height (evidence alias ST-RC-HOME-TIME-01)

The unchanged checker records Chromium320/100 Home CLS **0.0226** for both payroll-qa-a and payroll-qa-b, with HTTP200 and zero overflow, small-text, target, client-error or axe failures. An independent held Home read reproduces **0.0226202066** for both. PerformanceObserver identifies the real compact Recorded time card: footer y566→554 (−12px), next side column y630→618 (−12px), badge width24→81 and x260→203. The Home band remains296→296; its summary, extra and pass geometry assertions all pass. **Do not attribute this to ST-RC-HOME-01's band reservation.**

Source review narrows the cause to `employee-time-panel.tsx:67–73`: compact loading uses the two-line `.employee-time-message`, then an off-clock ready response uses `.employee-time-empty`; the shared compact min-height48px (`portal-premium.css:1304`) does not reserve the taller loading shape. The compact footer follows the changing content. This is separate from P3-ST-02's paused compact view and P3-ST-06's full noncompact footer placeholders. Badge text is legitimately updated; its geometry is retained as shift evidence, not a request to expose private data while loading.

Four attribution cells completed (both actors, both engines). Chromium2 retain the observed CLS failures. WebKit2 pass the sampled band/summary geometry; its layout-shift observer is unavailable, so no zero-CLS or full card-transition claim is made. Cold Recorded time child/read tracing on the separate integration target remains an explicit follow-up to isolate exact loading/ready content geometry and the public My time link contract.

[Held-read raw data](home-payroll-attribution.json), [Chromium payroll A held](home-payroll-attribution/chromium-payroll-qa-a-320x844-t100-held.png), [Chromium payroll A ready](home-payroll-attribution/chromium-payroll-qa-a-320x844-t100-ready.png), [unchanged checker raw ledger](checks-summary.json).


Recorded-time finding crosswalk: the source Phase3 report's **P3-ST-01**, `inspection/stability.md:650`, explicitly covers cold Home/pass/clock-card arrivals and records residual clock-card placeholder CLS0.022 on revisits. This fresh12px compact-card transition is therefore a **remaining P3-ST-01 scope observation**, with evidence alias ST-RC-HOME-TIME-01 rather than an extra independently counted finding. The current bounded visible12px/CLS0.0226 observation merits P2 review; this does not self-close or downgrade the independent owner's older broader P1. **P3-ST-02** (`:607`,`:651`) concerns paused/offline transitions and **P3-ST-12** (`:617`,`:661`) concerns failed reads; neither state was exercised by these successful cold-read cells. **P3-ST-06** (`:611`) is the full My time footer; its noncompact placeholder does not cover this compact Home branch. All remain separately owner-controlled. ST-RC-HOME-01's296px band is stable and is not charged for this observation.
