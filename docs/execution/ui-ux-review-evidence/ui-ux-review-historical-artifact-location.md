# Historical reproduction artifact relocation

The original diagnostic is preserved unchanged at `../independent-review-evidence/ui-ux-review-reproduction.test.ts`.

SHA-256 before and after relocation: `62f84b17be26417d1ca9c00953e509b4c46083aaa0f1a0f96b8fac2d45f4ecf4`.

This artifact asserts the original defects at a2ce38a15594c913d42dfb433f5897c18bde5ffe. It is historical review evidence, not a regression contract for the corrected application. Moving it outside the implementation checkout prevents default Vitest discovery from treating those intentional historical defect assertions as current application tests. No assertions, application tests, configuration, or source were changed. The original run log remains `.omo/evidence/ui-ux-review-reproduction.log`; earlier reports retain their historical paths, superseded by this location note.
