# Employee dropdown arrow refinement

Current HTML SHA-256: `c75ceac716f2d54ab243dd8aada9e2bf427f2340fb21674fadd32812ac0a7244`.

All Employee dropdowns now use the same Select primitive. The real native select, field label, value, required/validation and change behavior remain. Only its visual arrow is replaced with the existing Phosphor caret-down, centered with a16px logical end inset and44px reserved text space. The icon is decorative and ignores pointer events. Forced-colors mode retains a visible system-colored arrow.

TypeScript/build and source-built/saved/served byte checks pass. The11focused cases pass in Chromium, WebKit and Firefox, covering320/390/430/884px, controlled200% text at320/390px, native selection changes, keyboard focus, geometry, shared week/day/shift/reason fields and forced colors. All103existing cases were rerun and pass perengine on the same artifact. Total114cases perengine, with no reported runtime errors. The five changed UI files have0findings in the scoped21st review.

The first Firefox focus check lacked a keyboard event before testing focus-visible. The corrected scenario establishes keyboard modality and retains separate strict active-element and outline assertions. No UI assertion was removed. Real OS picker/keyboard and screen-reader sessions are not certified by these browser runs.

The independent report preserves the earlier full review and adds a bounded recheck for this exact cosmetic change. Employee permissions and feature coverage remain unchanged. This is still a fictional local prototype without a Git branch, commit, PR or deployment; production is unchanged.

[Week selector](availability-week.png) · [Field detail](availability-week-field.png) · [Independent review](next-pass-ui-review.md) · [Checks](checks.json)
