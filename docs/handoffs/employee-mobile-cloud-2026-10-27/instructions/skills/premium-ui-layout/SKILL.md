---
name: premium-ui-layout
description: Create and refine premium web layout, spacing, responsive composition, section structure, and visual rhythm. Use when a page feels generic, crowded, loose, unbalanced, too card-heavy, or inconsistent across desktop and mobile.
---

# Premium UI Layout

## Layout philosophy

Build composition first, decoration second.

Every page should have:
- a clear beginning
- controlled section pacing
- visual hierarchy
- consistent horizontal alignment
- deliberate changes in rhythm
- a strong ending or final action

Avoid stacking visually identical sections.

## Spacing

Use spacing to create hierarchy, not merely separation.

Preferred behavior:
- generous outer page margins
- tighter relationships within related content
- larger gaps between unrelated content groups
- consistent vertical rhythm
- no arbitrary one-off spacing values unless visually necessary

Avoid:
- huge dead zones
- cramped text near container edges
- inconsistent section padding
- buttons sitting too close to viewport edges
- content that appears accidentally centered

## Cards and containers

Do not put everything in cards.

Use a card only when the content benefits from being treated as a distinct object.

When cards are appropriate:
- keep radius restrained
- minimize shadow
- use borders sparingly
- avoid nesting cards inside cards
- vary structure if many cards appear together

For editorial content, prefer open layout, separators, image blocks, typography, or simple grouping over card containers.

## Desktop

Desktop should take advantage of width without stretching content excessively.

Prefer:
- readable text measures
- strong image proportions
- intentional two-column relationships
- meaningful negative space
- controlled max-widths
- visual anchors aligned across sections

Do not simply scale up the mobile layout.

## Mobile

Mobile must feel intentionally designed, not collapsed.

Requirements:
- no horizontal overflow
- no accidental side-to-side page movement
- no clipped buttons or controls
- no content hidden behind fixed elements
- readable typography
- comfortable tap targets
- logical stacking order
- imagery cropped intentionally
- preserve hierarchy from desktop

Avoid shrinking everything until it fits.

## Section construction

A premium section typically needs only:
- eyebrow or context, when useful
- headline
- short supporting copy
- content or image
- one clear action when needed

Remove secondary labels or decoration that do not help comprehension.

## Responsive QA

Test at minimum:
- small mobile
- large mobile
- tablet/narrow desktop
- standard desktop
- wide desktop

At each size inspect:
- wrapping
- clipping
- image crop
- spacing
- alignment
- overflow
- sticky/fixed behavior
- CTA visibility
