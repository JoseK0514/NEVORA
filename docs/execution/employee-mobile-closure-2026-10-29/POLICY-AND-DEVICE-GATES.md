# Employee first-release gates requiring evidence or policy authority

This is a concrete review package, not an accepted exception or release approval. Employee only; Lead remains deferred. Local engineering and fictional-data checks continue independently.

## Failed alert turn-off

The independent CacheStorage tombstone now covers worker restart after an IndexedDB suppression-write failure, even before the app is reopened. It contains only an opaque generation, survives public-cache upgrades/retirement, and cannot be cleared by passive enrollment. Saturation fails closed; a fresh generation is independently checked. Tests reproduce the previous display failure and prove this mitigation.

**Remaining irreducible boundary:** if both worker-readable stores (IndexedDB and CacheStorage), native unsubscribe and server cleanup fail simultaneously, a restarted worker cannot read an intent kept only in page storage. A successful localStorage reminder does not protect background delivery before the app reopens; failure of that reminder also removes page recovery. The app keeps cleanup pending, never claims alerts are off, and always offers the real immediate safeguard: block NEVORA notifications in device/browser settings, then retry. Site-data erasure while the native subscription/server record survive is likewise not proof of opt-out.

Recommendation: keep the explicit unconfirmed state and immediate settings guidance; require physical-device/provider evidence before enabling production alerts. Do not assert zero residual risk or silently accept it. Jose's release disposition remains required for this exact boundary; this document grants none.

Rollback must preserve a suppression-aware worker or retire delivery through verified controls. Reverting to historical worker bytes is not proven safe by a cache that those bytes do not consult.

## Deletion support and withdrawal

Current accepted employee copy truthfully says cancellation is unavailable in the app and provides Support contact/reference. Recommended wording if adopted: “Questions about your request? Contact Support with your reference. We can explain the available options.” This does not promise withdrawal or a processing deadline.

Recommended operations control pending policy approval:

- A reference, screenshot, claimed employee ID or access to an unverified contact address never proves identity.
- Never ask a person to email a password, passkey or authentication secret.
- Withdraw only before processing starts, after an approved identity-verification method and case record; use a guarded update that succeeds only while status is `received` and check the returned row. A status read followed by an unrestricted update is unsafe.
- Until a verification method is approved and available to operators, do not manually restore account access by changing status. Escalate the request through existing Support.
- Record verifier, method, time, request reference and decision without retaining authentication secrets or unnecessary identity documents.

**Jose decisions:** whether employee copy offers asking Support about withdrawal; which verified operational identity method is supported. No new self-service withdrawal/authentication product is invented here. Existing erasure/retention facts and policy text remain authoritative.

## Physical-device acceptance checklist

On actual supported iPhone and Android devices, using approved fictional accounts and an approved test environment, record device/OS/browser/app-install versions and candidate revision. Exercise portrait/landscape, OS text scaling, safe areas, virtual keyboard, touch and screen readers (VoiceOver/TalkBack). Verify all Employee-only workflows, account/session/module loss, return focus and private-data release. Native flows require their own evidence:

1. Installed-app PDF View retains/recovers the correct session, Download reaches the expected file destination, inaccessible/coworker documents stay protected, and return navigation is clear.
2. Passkey creation, native cancellation, last-key removal, authentication and denied/expired account state.
3. Calendar provider subscribe/replace/revoke and copied-entry/refresh-delay limitations; no false connection confirmation.
4. Push permission/install/turn-on/turn-off, worker restart, background delivery and stale generation suppression, cleanup failure and sign-out. No real notifications without explicitly authorized test delivery/account scope.
5. Slow/interrupted networks, foreground recovery, measured representative-device performance and error/empty/loading/success states.

Local engines and synthetic capability boundaries do not certify these gates. Hosted build/CI/staging, operational readiness, monitoring/rollback and production authorization remain separate evidence and approval steps.
