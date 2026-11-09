### Task 1: Integrate onboarding/commerce backend
**Files:** adoption manifest underdocs/handoffs/2026-11-09-backend-source-completion.json; scoped paths from005c099b8; source inventory.
**Interfaces:** consumes developmente9c3b60f5 and005c099b8; produces canonical onboarding,company routing,commerce and hosted adapter modules with protected UI/native exclusions.
- [ ] Record the exact changed path inventory and held UI/native paths; run the existing source checker and preserve its current drift. Expected: main/collaboration drift reported before reconciliation.
- [ ] Three-way integrate005c099b8 into the owned detached worktree; preserve development-only changes; restore excluded UI/native paths to the base. Resolve any migration/fixture conflict from actual code/tests. Expected: all intended backend paths adopted; zero excluded-path diff.
- [ ] Install from the resulting exact lockfile withnpm ci --ignore-scripts --no-fund. Run focused onboarding/commerce/workspace-routing/mail tests plus types. Expected: green; any integration defect must first have a reproducing regression. Commit the source/adoption checkpoint.

