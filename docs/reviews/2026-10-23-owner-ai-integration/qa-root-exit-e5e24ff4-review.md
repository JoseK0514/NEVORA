# Independent QA — e5e24ff4 root-exit correction review

**QA recommendation: GO WITH CONDITIONS for the bounded correction/next verification; release remains NO-GO. Independent runtime closure is not yet granted.**

Exact clean candidate `e5e24ff434c0f8c0a6f707dd1f7b85352db9f59c`, tree `a9392d76867930d2b77ca061041bd5836464814b`, isolated root-exit checkout. Read-only code/fixture/custody audit while parent full default suite is active. No runtime, source or HEAD mutation.

## VERIFIED

The exact delta fromab89 is three files: supervisor, new six-case early-root-exit test, and adding stderr context to the unchanged expected23 runner assertion. No application, SQL, browser scenario, deadlines or policy change.

The retained persisted RED log at9cf37990 shows actual creation-handle exit23, native zombie observation, final PID absence, zero resources/fallback signals, but returned status1. Three negative cases pass. This proves a local status-propagation defect under the fixture's explicit ordering; it is stronger than guessing from cloud timing. The two subsequent stderr REDs show why status1/empty stdout or native zombie output with diagnostic stderr cannot establish clean exit proof: both incorrectly returned23 before hardening. They remain retained failed evidence, not final candidate results.

The final parent raw log actually completes119/119,4 files,0 failure/skip,44.42s:6 new controls +90 runner +13 process +10 root-group. It includes the originally failed runner case passing. This is audited parent execution; no independent replay is claimed in this report. Security's earlier report correctly stopped short of claiming the final combined run; this later completed log supplies that result.

Code confines outcome preservation to unavailable initial root proof followed by a separate native `ps pid/stat` observation that rejects error and nonempty stderr. Only status1/empty stdout or exact PID/two-field zombie evidence qualifies. Final result requires an actual positive nonzero child exit status, zero collected resource leases and no cleanup failure. Exit0 remains failure1. Existing failure message and observation reason remain; initialRootExit is an explanatory enum, not ownership proof. No root lease/registration/signal authority is synthesized. Live invalid marker/group/parent paths do not qualify. Timeout behavior is not widened by this patch.

Fixture positive ordering uses a real spawned child and ready/exit files; it deliberately blocks the first observer until native absence/zombie proof. It does not fake the positive PID/status/zombie row. Negative error/stderr modes deliberately inject observer results, and missing-marker removes the child's actual marker. Original exit status, no fallback process.kill calls, no resources and actual final PID absence are asserted. Note that absence of fallback process.kill calls does not assert absence of creation-handle child.kill used in negative cleanup.

Candidate SHA256 values independently match security's reviewed bytes: supervisor f4242e9d765667a0938d87967ab21134fc8fd9e0a44066772fb49df8c324aca9; root-exit test37656f582e8492e250c82662742eff0c8a8432855b72cfc8c378391c58ba542b; runner test2ceed23b82f9b7cce748b221e50f508e636a33b3f44806a919cf828f3024f70c.

## RISK / limits and next gate

- Historical PR29 validation cause is still unproven: its stderr/initial-root observation was not retained. The reproduced local mechanism warrants correction without relabeling it as observed cloud causality. The failed workflow stays failed.
- Positive fixture observes native local exit, but its ordering is intentionally controlled, not a statistical cloud-race reproduction. Other existing Darwin process tests still simulate Linux marker retention and hostile identity fields. Native Linux verification remains required.
- Returning the child's nonzero code does not turn the run into success or prove no unobserved descendants exist. Resource list zero means no leases were collected. Existing architecture still depends on creation-handle exit delivery; after clean disappearance stopping is set and timeout stop does not create a new exit signal. No new claim of bounded recovery from a lost OS/Node exit event is justified. This is a failed-outcome preservation path, not successful ownership acceptance.
- Parent full default/types/lint/build completion and independent bounded replay of the four focused files are needed before independent local correction closure. Serialize the short process controls after the full suite, using safeEnvironment and external evidence. No heavy browser/PG rerun is required merely to retest this supervisor condition.
- Fresh all12 immutable candidate workflow and source/artifact custody audit remain mandatory. Oldab89 Home/Owner/Comms successes can establish their own historical execution facts, not certify this changed supervisor. COM01/OWN01/AT01 remain their recorded risks; AT02 remains scoped acceptance. No real data, hosted/provider/production or policy-exception authorization follows.

Audit evidence: `qa/root-exit-e5e24ff4-review/audit.json` and `candidate.diff`; parent logs `engineering/root-exit-persisted-red.log`, `root-exit-observer-stderr-red.log`, `root-exit-final-focused-green.log`. Prior reports unchanged. No active QA runtime/custody hold from this review.
