# NEVORA page assets

This is the shared folder for original illustrations and future page content.
Follow [DESIGN.MD](../../DESIGN.MD) and record each image in
[manifest.json](manifest.json).

## Art direction

Generate flat editorial illustrations with the built-in image model. Use precise
geometric shapes, rounded forms, sparse detail, and transparent backgrounds.
Use orange #ED724C, burnt orange #D8613C, charcoal #111827, and the #FAFAFA/#E5E7EB
neutrals. Keep imagery secondary to employee tasks. Do not generate UI screenshots,
interface text, fake metrics, confirmation checkmarks, or navigation icons.

The workday illustration supports today's schedule; the open planner supports
upcoming schedule states. Neither illustration communicates a verified status.
The Employee Login blue/cyan artwork uses sculptural folded paper, a cyan sunrise,
a blank planner and a clock. Jose selected this palette and requested stronger
artwork. Use #0756D9, #43CCFB, ice blue and off-white with restrained tactile
shading for this surface; operational artwork retains the flat orange style. Its compact mobile rendering leaves the form primary;
the larger desktop treatment provides the first impression. It remains decorative.
Real schedule, punch, and pay information must remain accessible HTML.

Forgot access extends the same approved blue/cyan authentication art direction
with `illustrations/recovery-access-blue.png`: a folded-paper doorway, cyan
sunrise, blank closed envelope and small decorative key. Employee Login, Forgot
access, New user account activation and Reset access are the only surfaces using this shared
authentication variant;
the portal and assisted-recovery presentation remain unchanged. Jose added Reset
access to this variant on 2026-10-11.
The image supports focused assistance and suggests a welcoming route back to
work; it does not confirm email delivery, account existence or recovered access.
It remains decorative with empty alt text, reserved dimensions and responsive
sizing. The full exact generation prompt, original file metadata, SHA-256 and
usage are recorded in [manifest.json](manifest.json). Reuse the shared artwork
motion controller and keep the form immediate; retain Pause/Play and static
reduced-motion rendering. The official **Brighter work ahead** slogan stays in
real HTML. See [the recovery review](../../docs/ui/2026-10-10-nevora-forgot-access-review.md).

New user account activation at `/activate` uses
`illustrations/activation-welcome-blue.png`: a cobalt folded-paper doorway,
cyan sunrise, blank ivory employee badge and open blank notebook. The welcoming
still life supports the existing employee-record and matching-phone activation
task; it does not imply successful activation. Use the shared cobalt/cyan/ice
palette, tactile paper shading, transparent background and compact mobile
rendering. Inter and the exact **Brighter work ahead** slogan remain real HTML.
The artwork is decorative (`alt=""`), with reserved 1536×1024 dimensions and
responsive contain sizing. Its full prompt matches the embedded PNG metadata
and [manifest.json](manifest.json); SHA-256:
`26f962ecad03d759962291c68c6b6744ca61af4a9bb8c51d437f8be283baf813`.
Reuse the unchanged artwork/headline motion controller with Pause/Play,
reduced-motion static rendering and visibility gates; keep the four-field native
form stationary and immediately usable. See [the activation review and handoff](../../docs/ui/2026-10-10-nevora-new-user-review.md).

## Adding assets

Reset access at `/reset-access` uses `illustrations/reset-access-blue.png`, a
cobalt paper doorway, cyan sunrise and ivory key. It follows the same transparent
tactile artwork system, stays decorative, reserves 1536x1024 dimensions and reuses
the existing motion controller. It never asserts recovered access. The exact
built-in imagegen prompt, SHA-256 and alpha range are in the manifest; generation
was on 2026-10-11. See [the reset review](../../docs/ui/2026-10-11-nevora-reset-access-review.md).

1. Read the page's real content and states before drafting a subject-specific prompt.
2. Generate one image per subject with the built-in image tool; request transparency.
3. Inspect the generated image, then copy the selected file into `illustrations/`.
4. Record the full prompt, generator, original dimensions, SHA-256, usage, and alt
   treatment in the manifest. Keep a versioned sibling when replacing an asset.
5. Use `next/image` with fixed display dimensions and responsive sizes; preserve
   the alpha channel. Decorative images use `alt=""`. Meaningful images need
   accurate descriptive alt text and a nearby accessible equivalent when needed.
6. Verify the image at mobile and desktop sizes, including loading and error states.

Keep official logos, wordmarks, and PWA icons in their existing locations.
The current page inventory contains branding rather than stock content photos;
do not replace official identity with generated artwork.
