# Signed-in Spanish: the rest (es-rest)

Branch `claude-codex-collab-nevora-es-rest`, from `7c1464eb`. Area: /app/settings, components/company, components/reports, components/premium, and every English-only signed-in area in reports/language-inventory.md that the README's owners table doesn't name. Work order: settings, company, reports, premium, then the remaining areas by size.

## Claim
### Areas and files taken (scan of 7c1464eb; EN count per file)

**components/premium (307)**

- `src/components/premium/treatments.tsx` (227)
- `src/components/premium-home.tsx` (67)
- `src/components/premium/clocker.tsx` (8)
- `src/components/premium/surfaces.tsx` (3)
- `src/components/premium/feedback.tsx` (2)

**route: /app/settings (252)**

- `src/app/app/settings/page.tsx` (33)
- `src/app/app/settings/positions/position-catalog.tsx` (30)
- `src/app/app/settings/closed-line.tsx` (18)
- `src/app/app/settings/workspace/page.tsx` (16)
- `src/app/app/settings/wave-c-form.tsx` (11)
- `src/app/app/settings/locations/page.tsx` (11)
- `src/app/app/settings/settings-b-form.tsx` (8)
- `src/app/app/settings/layout.tsx` (8)
- `src/app/app/settings/locations/locations-search.tsx` (8)
- `src/app/app/settings/actions.ts` (7)
- `src/app/app/settings/company-policies/page.tsx` (6)
- `src/app/app/settings/payroll/page.tsx` (6)
- `src/app/app/settings/clocker/actions.ts` (6)
- `src/app/app/settings/clocker/photos/review/page.tsx` (6)
- `src/app/app/settings/wave-c-kit.tsx` (5)
- `src/app/app/settings/locations/error.tsx` (5)
- `src/app/app/settings/locations/[locationId]/not-found.tsx` (5)
- `src/app/app/settings/breaks/page.tsx` (5)
- `src/app/app/settings/clocker/photos/actions.ts` (5)
- `src/app/app/settings/wave-c-focus.tsx` (4)
- `src/app/app/settings/clocker/photos/review/actions.ts` (4)
- `src/app/app/settings/locations/[locationId]/page.tsx` (3)
- `src/app/app/settings/locations/new/page.tsx` (3)
- `src/app/app/settings/breaks/actions.ts` (3)
- `src/app/app/settings/clocker/matching/actions.ts` (3)
- `src/app/app/settings/clocker/photos/page.tsx` (3)
- `src/app/app/settings/branding/page.tsx` (3)
- `src/app/app/settings/features/page.tsx` (2)
- `src/app/app/settings/clocker/pins/page.tsx` (2)
- `src/app/app/settings/positions/page.tsx` (2)
- `src/app/app/settings/loading.tsx` (1)
- `src/app/app/settings/settings-b.tsx` (1)
- `src/app/app/settings/locations/loading.tsx` (1)
- `src/app/app/settings/locations/[locationId]/loading.tsx` (1)
- `src/app/app/settings/locations/new/loading.tsx` (1)
- `src/app/app/settings/breaks/loading.tsx` (1)
- `src/app/app/settings/time-off/loading.tsx` (1)
- `src/app/app/settings/time-off/page.tsx` (1)
- `src/app/app/settings/company-policies/loading.tsx` (1)
- `src/app/app/settings/payroll/loading.tsx` (1)
- `src/app/app/settings/features/loading.tsx` (1)
- `src/app/app/settings/workspace/loading.tsx` (1)
- `src/app/app/settings/clocker/loading.tsx` (1)
- `src/app/app/settings/clocker/page.tsx` (1)
- `src/app/app/settings/clocker/matching/loading.tsx` (1)
- `src/app/app/settings/clocker/matching/page.tsx` (1)
- `src/app/app/settings/clocker/pins/loading.tsx` (1)
- `src/app/app/settings/clocker/photos/loading.tsx` (1)
- `src/app/app/settings/clocker/photos/review/loading.tsx` (1)
- `src/app/app/settings/branding/loading.tsx` (1)
- `src/app/app/settings/positions/loading.tsx` (1)

**components/reports (216)**

- `src/components/reports.tsx` (216)

**components/company (175)**

- `src/components/company-policy-editor.tsx` (175)

**components/notification (164)**

- `src/components/notification-inbox-signature.tsx` (82)
- `src/components/notification-inbox.tsx` (82)

**route: /app/employees (153)**

- `src/app/app/employees/[employeeId]/page.tsx` (86)
- `src/app/app/employees/new/page.tsx` (10)
- `src/app/app/employees/[employeeId]/clocker-pin/actions.ts` (9)
- `src/app/app/employees/actions.ts` (8)
- `src/app/app/employees/[employeeId]/time-off/page.tsx` (5)
- `src/app/app/employees/[employeeId]/pay/page.tsx` (5)
- `src/app/app/employees/[employeeId]/restrictions/page.tsx` (4)
- `src/app/app/employees/page.tsx` (3)
- `src/app/app/employees/[employeeId]/clocker-pin/page.tsx` (3)
- `src/app/app/employees/import/page.tsx` (3)
- `src/app/app/employees/[employeeId]/error.tsx` (2)
- `src/app/app/employees/[employeeId]/time-off/error.tsx` (2)
- `src/app/app/employees/[employeeId]/pay/error.tsx` (2)
- `src/app/app/employees/[employeeId]/restrictions/error.tsx` (2)
- `src/app/app/employees/new/error.tsx` (2)
- `src/app/app/employees/error.tsx` (1)
- `src/app/app/employees/[employeeId]/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/time-off/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/pay/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/restrictions/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/clocker-pin/loading.tsx` (1)
- `src/app/app/employees/new/loading.tsx` (1)

**components/owner (126)**

- `src/components/owner-home-corp.tsx` (75)
- `src/components/owner-setup-card.tsx` (36)
- `src/components/owner-only-notice.tsx` (13)
- `src/components/owner-only-title.tsx` (2)

**components/clocker-photo (122)**

- `src/components/clocker-photo/photo-review.tsx` (37)
- `src/components/clocker-photo/notice-settings.tsx` (19)
- `src/components/clocker-photo/photo-notice.tsx` (9)
- `src/components/clocker-photo/photo-settings.tsx` (2)

**components/schedule (121)**

- `src/components/schedule-shift-form.tsx` (31)
- `src/components/schedule-publication-change.tsx` (24)
- `src/components/schedule-publication-controls.tsx` (17)
- `src/components/schedule-generation-controls.tsx` (17)
- `src/components/schedule-copy-form.tsx` (11)
- `src/components/schedule-cover-pick.tsx` (9)
- `src/components/schedule-coverage-line.tsx` (7)
- `src/components/schedule-form-keys.tsx` (2)
- `src/components/schedule-template-controls.tsx` (1)

**components/availability (85)**

- `src/components/availability-signature.tsx` (26)
- `src/components/availability-team-list.tsx` (19)
- `src/components/availability-corp.tsx` (6)

**components/shift (84)**

- `src/components/shift-change-policy-fields.tsx` (22)
- `src/components/shift-assignment-fields.tsx` (15)
- `src/components/shift-review-recovery.tsx` (13)
- `src/components/shift-change-form.tsx` (9)
- `src/components/shift-change-form-state.ts` (8)
- `src/components/shift-requests-signature.tsx` (6)
- `src/components/shift-change-history.tsx` (3)
- `src/components/shift-request-decide.tsx` (3)

**components/manager-profile (84)**

- `src/components/manager-profile/manager-profile-live.tsx` (59)
- `src/components/manager-profile/contract.ts` (21)
- `src/components/manager-profile/manager-profile.tsx` (4)

**route: /app/requests (83)**

- `src/app/app/requests/time-off-form.tsx` (30)
- `src/app/app/requests/page.tsx` (23)
- `src/app/app/requests/time-off-signature.tsx` (16)
- `src/app/app/requests/hub/request-hub.tsx` (8)
- `src/app/app/requests/hub/page.tsx` (5)
- `src/app/app/requests/loading.tsx` (1)

**components/time (77)**

- `src/components/time-off-waiting-list.tsx` (23)
- `src/components/time-off-review-actions.tsx` (19)
- `src/components/time-off-withdrawal.tsx` (14)
- `src/components/time-correction-context.tsx` (8)
- `src/components/time-off-decision-form.tsx` (4)

**components/coverage (72)**

- `src/components/coverage-review.tsx` (38)
- `src/components/coverage-assistant.tsx` (28)
- `src/components/coverage-review-hold.tsx` (3)

**components/brand (72)**

- `src/components/brand-editor.tsx` (59)
- `src/components/brand-legal.tsx` (12)

**components/generation (72)**

**components/calendar (61)**

- `src/components/calendar-subscription-panel.tsx` (61)

**components/activity (58)**

**components/leave-staffing (57)**

- `src/components/leave-staffing/repair-note.tsx` (22)
- `src/components/leave-staffing/conflict-check.tsx` (19)
- `src/components/leave-staffing/failure-notice.tsx` (4)

**components/native-shell (56)**

- `src/components/native-shell/unsupported-role.tsx` (4)

**route: /app/availability (47)**

- `src/app/app/availability/page.tsx` (41)
- `src/app/app/availability/agreement/error.tsx` (2)
- `src/app/app/availability/agreement/page.tsx` (2)
- `src/app/app/availability/actions.ts` (1)
- `src/app/app/availability/agreement/loading.tsx` (1)

**components/team (44)**

- `src/components/team-desk-people.tsx` (8)
- `src/components/team-live.tsx` (4)
- `src/components/team/team-forms.tsx` (4)
- `src/components/team/phone.ts` (3)
- `src/components/team/return-to-next.tsx` (2)

**components/christmas (43)**

- `src/components/christmas-bonus-report.tsx` (38)
- `src/components/christmas-bonus-year-menu.tsx` (5)

**route: /app/help (42)**

- `src/app/app/help/page.tsx` (42)

**components/publish (40)**

- `src/components/publish-warning-review-surface.tsx` (40)

**components/management (38)**

- `src/components/management-close-form.tsx` (38)

**components/wave-a (38)**

- `src/components/wave-a/route-error.tsx` (4)
- `src/components/wave-a/pending-button.tsx` (3)
- `src/components/wave-a/action-form.tsx` (3)
- `src/components/wave-a/parts.tsx` (2)
- `src/components/wave-a/offline-notice.tsx` (2)

**components/wave (36)**

- `src/components/wave-b-forms.tsx` (36)

**components/operational (35)**

- `src/components/operational-rule-fields.tsx` (35)

**components/reviewed (35)**

- `src/components/reviewed-callout-form.tsx` (21)
- `src/components/reviewed-swap-form.tsx` (14)

**components/delegated (34)**

- `src/components/delegated-time-correction-form.tsx` (34)

**components/edit (33)**

- `src/components/edit-location-form.tsx` (33)

**components/whos (32)**

- `src/components/whos-working-corp.tsx` (32)

**components/notifications (31)**

- `src/components/notifications-manager-b.tsx` (31)

**components/assisted (30)**

- `src/components/assisted-recovery.tsx` (30)

**components/clean (30)**

- `src/components/clean/top-bar-slot.ts` (4)

**components/period (29)**

- `src/components/period-close-history.tsx` (29)

**components/new (28)**

- `src/components/new-location-form.tsx` (28)

**route: /app/reports (25)**

- `src/app/app/reports/christmas-bonus/page.tsx` (16)
- `src/app/app/reports/page.tsx` (6)
- `src/app/app/reports/christmas-bonus/error.tsx` (2)
- `src/app/app/reports/christmas-bonus/loading.tsx` (1)

**components/create (22)**

**components/mobile (20)**

**components/configured (20)**

- `src/components/configured-attendance-policies.tsx` (20)

**components/swap (19)**

- `src/components/swap-page-content.tsx` (10)
- `src/components/swap-shift-summary.tsx` (9)

**components/signature (19)**

- `src/components/signature/sig-overlays.tsx` (2)

**components/auth-premium (18)**

- `src/components/auth-premium/signed-out-footer.tsx` (10)
- `src/components/auth-premium/lang-switch.tsx` (4)
- `src/components/auth-premium/auth-validation.tsx` (1)
- `src/components/auth-premium/auth-back-nav.tsx` (1)
- `src/components/auth-premium/password-input.tsx` (1)
- `src/components/auth-premium/auth-shell.tsx` (1)

**route: /app/profile (18)**

- `src/app/app/profile/calendar/page.tsx` (7)
- `src/app/app/profile/passkeys/page.tsx` (4)
- `src/app/app/profile/[document]/page.tsx` (4)
- `src/app/app/profile/page.tsx` (2)
- `src/app/app/profile/device-alerts/page.tsx` (1)

**route: /app/payroll (18)**

- `src/app/app/payroll/payroll-route.tsx` (11)
- `src/app/app/payroll/page.tsx` (1)
- `src/app/app/payroll/history/page.tsx` (1)
- `src/app/app/payroll/review/page.tsx` (1)
- `src/app/app/payroll/prepare/page.tsx` (1)
- `src/app/app/payroll/import/page.tsx` (1)
- `src/app/app/payroll/fix/page.tsx` (1)
- `src/app/app/payroll/people/page.tsx` (1)

**components/messages (17)**

- `src/components/messages-manager-b.tsx` (17)

**components/features (17)**

- `src/components/features-editor.tsx` (17)

**components/coverage-minutes (17)**

- `src/components/coverage-minutes/coverage-minutes.tsx` (17)

**components/employment (16)**

- `src/components/employment-date-fields.tsx` (16)

**components/action (16)**

- `src/components/action-center-navigation.ts` (16)

**route: /app/(root) (15)**

- `src/app/app/page.tsx` (14)
- `src/app/app/[...missing]/page.tsx` (1)

**components/kit (14)**

**route: /app/timecards (14)**

- `src/app/app/timecards/corrections/page.tsx` (6)
- `src/app/app/timecards/corrections/new/[employeeId]/page.tsx` (5)
- `src/app/app/timecards/page.tsx` (3)

**components/first (13)**

- `src/components/first-week-setup.tsx` (13)

**components/rules (12)**

- `src/components/rules-hours-list.tsx` (12)

**route: /app/my-time (11)**

- `src/app/app/my-time/page.tsx` (10)
- `src/app/app/my-time/loading.tsx` (1)

**components/account (10)**

- `src/components/account-recovery.tsx` (9)
- `src/components/account-deletion-form.tsx` (1)

**components/app (10)**

- `src/components/app-error-screen.tsx` (10)

**route: /app/payroll-export (10)**

- `src/app/app/payroll-export/page.tsx` (6)
- `src/app/app/payroll-export/paid-time/page.tsx` (3)
- `src/app/app/payroll-export/loading.tsx` (1)

**route: /app/billing (10)**

- `src/app/app/billing/page.tsx` (10)

**components/correction (9)**

- `src/components/correction-time-ticket.tsx` (9)

**components/quiet (9)**

- `src/components/quiet/quiet-sheet.tsx` (5)
- `src/components/quiet/quiet.tsx` (4)

**route: /app/ai-manager (8)**

- `src/app/app/ai-manager/weekly/page.tsx` (5)
- `src/app/app/ai-manager/page.tsx` (1)
- `src/app/app/ai-manager/business/page.tsx` (1)
- `src/app/app/ai-manager/knowledge/page.tsx` (1)

**route: /app/updates (7)**

- `src/app/app/updates/page.tsx` (2)
- `src/app/app/updates/[id]/page.tsx` (2)
- `src/app/app/updates/compose/page.tsx` (2)
- `src/app/app/updates/compose/loading.tsx` (1)

**components/location (6)**

**components/policy (6)**

- `src/components/policy-save-form.tsx` (6)

**route: /app/account (6)**

- `src/app/app/account/delete/page.tsx` (6)

**components/module (5)**

- `src/components/module-off.tsx` (5)

**components/recovery (5)**

- `src/components/recovery-reset.tsx` (3)
- `src/components/recovery-request.tsx` (2)

**components/exchange (5)**

**components/sidebar (5)**

- `src/components/sidebar-rail-tooltip.tsx` (5)

**components/configuration (5)**

- `src/components/configuration-form.tsx` (5)

**components/blocked (5)**

- `src/components/blocked-open-shifts.tsx` (5)

**route: /app/notifications (5)**

- `src/app/app/notifications/page.tsx` (4)
- `src/app/app/notifications/open/route.ts` (1)

**components/update (4)**

- `src/components/update-visual.tsx` (4)

**components/theme (4)**

- `src/components/theme-switch.tsx` (4)

**components/passkeys (4)**

- `src/components/passkeys/passkey-section.tsx` (3)
- `src/components/passkeys/passkey-desktop-view.tsx` (1)

**route: /app/restricted (4)**

- `src/app/app/restricted/page.tsx` (4)

**components/position (3)**

- `src/components/position-quota-fields.tsx` (3)

**components/public (3)**

- `src/components/public-error-screen.tsx` (3)

**route: /app/my-pay (3)**

- `src/app/app/my-pay/page.tsx` (2)
- `src/app/app/my-pay/loading.tsx` (1)

**route: /app/clocker-recovery (3)**

- `src/app/app/clocker-recovery/page.tsx` (2)
- `src/app/app/clocker-recovery/loading.tsx` (1)

**route: /app/account-recovery (3)**

- `src/app/app/account-recovery/page.tsx` (2)
- `src/app/app/account-recovery/loading.tsx` (1)

**components/profile (2)**

**components/callout (2)**

- `src/components/callout-view.tsx` (2)

**components/finder (2)**

- `src/components/finder-glyph.tsx` (2)

**route: /app/inbox (2)**

- `src/app/app/inbox/page.tsx` (2)

**components/unconfirmed (1)**

- `src/components/unconfirmed-action-form.tsx` (1)

**components/status (1)**

**components/print (1)**

- `src/components/print-schedule-button.tsx` (1)

**components/skeleton (1)**

- `src/components/skeleton.tsx` (1)

**components/celebration (1)**

- `src/components/celebration.tsx` (1)

**components/illustrations (1)**

**components/onboarding (1)**

- `src/components/onboarding/signup-ui.tsx` (1)

**route: /app/@sheet (1)**

- `src/app/app/@sheet/(.)exchange/layout.tsx` (1)

### Not taken

- Owned by other rows (README table): shell files, employee-mobile, payroll, manager, timecards, employee, employee-b, /app/schedule, /app/exchange, communication, company-access, owner-advisor, owner-b, payroll-import, roster-import, restrictions, time-off-admin, wages, review-details, reminders, copy, workforce.
- Out of scope: components/ui-preview (preview-only), components/legal and src/lib/legal, public or kiosk areas with their own Spanish (clocker, mobile-access, access-recovery, commerce-recovery), shared kit (components/corp, components/kit, owner-b/b-kit).
- Not imported by any route (dead code, no visible text to translate):
  - `src/components/clocker-photo/punch-photo-flow.tsx`
  - `src/components/schedule-location-control.tsx`
  - `src/components/availability-editor.tsx`
  - `src/components/availability-feedback.tsx`
  - `src/components/shift-slot.tsx`
  - `src/components/time-clock-widget.tsx`
  - `src/components/time-off-review-decision.tsx`
  - `src/components/coverage-review-content.tsx`
  - `src/components/brand-lockup.tsx`
  - `src/components/generation-explanation-panel.tsx`
  - `src/components/activity-history-panel.tsx`
  - `src/components/leave-staffing/own-leave-note.tsx`
  - `src/components/native-shell/device-settings.tsx`
  - `src/components/team/team-overview.tsx`
  - `src/components/wave-a/swap-sent.tsx`
  - `src/components/wave-a/callout-sent.tsx`
  - `src/components/wave-a/shift-block.tsx`
  - `src/components/wave-a/keep-height.ts`
  - `src/components/clean/week-summary.tsx`
  - `src/components/clean/request-pages-nav.tsx`
  - `src/components/create-shift-form.tsx`
  - `src/components/mobile-home-overview.tsx`
  - `src/components/signature/system-state.tsx`
  - `src/components/kit/kit.tsx (kit, read-only)`
  - `src/components/kit/press-feedback.tsx`
  - `src/components/kit/focus-on-arrival.tsx (kit, read-only)`
  - `src/components/kit/focus-after-retry.ts (kit, read-only)`
  - `src/components/kit/overlay-exit.ts`
  - `src/components/kit/use-discard-guard.ts (kit, read-only)`
  - `src/components/kit/keep-selected-visible.tsx (kit, read-only)`
  - `src/components/location-configuration-fields.tsx`
  - `src/components/exchange-assignment.tsx`
  - `src/components/profile-calendar-disclosure.tsx`
  - `src/components/status-pill.tsx`
  - `src/components/illustrations/index.tsx`

## Commits

(filled in as slices land)

## For Jose to review

(billing, tax, payroll and privacy Spanish lines, filled in as slices land)
