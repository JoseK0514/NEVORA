"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Period } from "@/lib/timecards/project";
import { formatRecordedHours } from "@/lib/timecards/project";
import type { readPeriodClose, MemberReview } from "@/lib/period-close/service";
import { MobileHomeDisclosure } from "./mobile-home-disclosure";
import { payrollReviewIssues, payrollReviewState } from "./payroll-review-copy";
type Review = Awaited<ReturnType<typeof readPeriodClose>>;
type PendingCommand = { action: string; command: unknown };
export function PayrollPeriodClose({
  period,
  actorId,
}: {
  period: Period;
  actorId: string;
}) {
  const [review, setReview] = useState<Review | null>(null),
    [notice, setNotice] = useState("Loading complete population"),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [retry, setRetry] = useState<PendingCommand | null>(null),
    [recoveryReady, setRecoveryReady] = useState(false);
  const recoveryKey = `nevora-period-pending:${actorId}:${period.startDate}:${period.endDate}`;
  const generation = useRef({ value: 0 });
  const post = useCallback(
    async (action: string, command: unknown) =>
      fetch("/api/period-close", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-nevora-period-close": "1",
          "x-nevora-actor": actorId,
        },
        body: JSON.stringify({ action, command }),
      }),
    [actorId],
  );
  const load = useCallback(async () => {
    await Promise.resolve();
    const n = ++generation.current.value;
    setReview(null);
    setSelected([]);
    try {
      const response = await post("READ", period),
        body = await response.json();
      if (n !== generation.current.value) return;
      if (!response.ok || body.state !== "ready") throw Error();
      setReview(body.result);
      setNotice(
        "Review the complete roster, including inactive and zero-time employees.",
      );
    } catch {
      if (n === generation.current.value)
        setNotice("Population unavailable. Reload to try again.");
    }
  }, [post, period]);
  useEffect(() => {
    const lifecycle = generation.current;
    const recover = () => {
      try {
        const saved = localStorage.getItem(recoveryKey);
        const original: PendingCommand | null = saved ? JSON.parse(saved) : null;
        if (original && (!["POPULATION", "MANIFEST", "HANDOFF"].includes(original.action) || !original.command || typeof original.command !== "object")) throw Error();
        setRetry(original);
        setRecoveryReady(true);
        return true;
      } catch {
        setRecoveryReady(false);
        setNotice("Recovery storage unavailable. Enable browser storage before saving payroll period changes.");
        return false;
      }
    };
    const initialLoad = window.setTimeout(() => { if (recover()) void load(); }, 0);
    const storageChanged = () => { recover(); };
    const clear = () => {
        generation.current.value++;
        setReview(null);
        setNotice("Population paused. Reload to review current data.");
      },
      visibility = () => {
        if (document.visibilityState === "hidden") clear();
      };
    window.addEventListener("offline", clear);
    window.addEventListener("storage", storageChanged);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(initialLoad);
      lifecycle.value++;
      window.removeEventListener("offline", clear);
      window.removeEventListener("storage", storageChanged);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [load, recoveryKey]);
  const send = async (action: string, command: unknown) => {
    if (busy || !recoveryReady) return;
    let pending: PendingCommand;
    try {
      const saved = localStorage.getItem(recoveryKey);
      pending = saved ? JSON.parse(saved) : retry ?? { action, command };
      localStorage.setItem(recoveryKey, JSON.stringify(pending));
    } catch {
      setNotice("Could not retain the original command. No payroll period change was sent.");
      return;
    }
    setRetry(pending);
    setBusy(true);
    try {
      const response = await post(pending.action, pending.command),
        body = await response.json();
      if (response.status === 400 || response.status === 409) {
        localStorage.removeItem(recoveryKey);
        setRetry(null);
        setNotice(body.message);
        return;
      }
      if (!response.ok || body.state !== "ready") throw Error();
      localStorage.removeItem(recoveryKey);
      setRetry(null);
      await load();
      setNotice(
        pending.action === "HANDOFF"
          ? "Handoff report saved. Provider import and payroll processing remain unverified."
          : "Saved with an immutable operation receipt.",
      );
    } catch {
      setNotice(
        "Outcome unconfirmed. Retry the original command before starting another.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>Complete payroll population and handoff</h2>
      <p>
        Account creation and active status are not employment start or end
        dates. Review period employment facts for every member. Preparing a
        manifest does not mean payroll is processed.
      </p>
      <p role="status">{notice}</p>
      <button
        className="button secondary"
        type="button"
        disabled={busy || retry !== null}
        onClick={() => void load()}
      >
        Reload population
      </button>
      {retry && (
        <button
          className="button primary"
          type="button"
          disabled={busy}
          onClick={() => void send(retry.action, retry.command)}
        >
          Retry original period command
        </button>
      )}
      <MobileHomeDisclosure id="mobile-payroll-population" label="Review payroll population" expandedLabel="Close population details"
        available={Boolean(review) && !busy && !retry}
        summary={review && !busy && !retry ? <p>{review.members.length} people in this period.</p> : undefined}>
      {review && (
        <>
          <form
            className="employee-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const members: MemberReview[] = review.members.map((m) => ({
                employeeId: m.employeeId,
                disposition: String(
                  data.get(`${m.employeeId}.disposition`),
                ) as MemberReview["disposition"],
                reason: String(data.get(`${m.employeeId}.reason`) ?? ""),
                employmentFacts: String(
                  data.get(`${m.employeeId}.employment`) ?? "",
                ),
                employmentBasis: "MANAGER_ATTESTED",
              }));
              void send("POPULATION", {
                ...period,
                operationId: crypto.randomUUID(),
                expectedRevision: review.population?.revision ?? 0,
                sourceHash: review.sourceHash,
                members,
              });
            }}
          >
            {review.members.map((member) => {
              const saved = review.population?.members.find(
                (m) => m.employeeId === member.employeeId,
              );
              return (
                <fieldset
                  key={member.employeeId}
                  disabled={!recoveryReady || busy || retry !== null}
                >
                  <legend>
                    {member.name} ·{" "}
                    {member.active ? "Active account" : "Inactive account"}
                  </legend>
                  <p>
                    {payrollReviewState(member.cardState)} ·{" "}
                    {formatRecordedHours(member.recordedNanoseconds)} recorded ·{" "}
                    {member.hasPeriodEvidence
                      ? "Historical period evidence retained"
                      : "No recorded period evidence"}
                    {/* The plain labels phones already used; desktop showed the raw state and issue codes. */}
                    {member.issues.length ? ` · Needs review: ${payrollReviewIssues(member.issues)}` : null}
                  </p>
                  {!member.active && (
                    <p>
                      ADP RUN export is unavailable for inactive accounts.
                      Review a compatible neutral or custom export; do not drop
                      this member silently.
                    </p>
                  )}
                  <label>
                    Period disposition{" "}
                    <select
                      required
                      name={`${member.employeeId}.disposition`}
                      defaultValue={saved?.disposition ?? ""}
                    >
                      <option value="" disabled>
                        Review this member
                      </option>
                      <option value="INCLUDE">
                        Include finalized time in exports
                      </option>
                      <option value="ZERO_TIME">
                        Reviewed zero-time member
                      </option>
                      <option value="EXCLUDE">
                        Exclude with audited reason
                      </option>
                    </select>
                  </label>
                  <label>
                    Disposition reason{" "}
                    <input
                      required
                      maxLength={600}
                      name={`${member.employeeId}.reason`}
                      defaultValue={saved?.reason ?? ""}
                    />
                  </label>
                  <label>
                    Reviewed period employment facts (manager-attested; include
                    entrants/leavers){" "}
                    <textarea
                      required
                      maxLength={600}
                      name={`${member.employeeId}.employment`}
                      defaultValue={saved?.employmentFacts ?? ""}
                    />
                  </label>
                </fieldset>
              );
            })}
            <button
              className="button primary"
              disabled={!recoveryReady || busy || retry !== null}
              type="submit"
            >
              Save reviewed population revision
            </button>
          </form>
          <h3>Reconcile export batches</h3>
          <p>
            Population revision {review.population?.revision ?? 0}. Select all
            original export batches covering included members exactly once.
            Zero-time members and audited exclusions remain in the manifest.
          </p>
          {review.exports.map((e) => (
            <label key={e.actorId + e.operationId}>
              <input
                type="checkbox"
                disabled={!recoveryReady || busy || retry !== null}
                checked={selected.includes(e.actorId + ":" + e.operationId)}
                onChange={(event) =>
                  setSelected((values) =>
                    event.target.checked
                      ? [...values, e.actorId + ":" + e.operationId]
                      : values.filter(
                          (v) => v !== e.actorId + ":" + e.operationId,
                        ),
                  )
                }
              />
              {e.profileName} · {e.employeeIds.length} employees ·{" "}
              {e.operationId}
            </label>
          ))}
          <button
            className="button primary"
            type="button"
            disabled={
              busy ||
              !recoveryReady ||
              retry !== null ||
              !review.population ||
              review.manifests.some(
                (m) => m.populationRevision === review.population?.revision,
              )
            }
            onClick={() =>
              void send("MANIFEST", {
                ...period,
                operationId: crypto.randomUUID(),
                populationRevision: review.population?.revision,
                receipts: review.exports
                  .filter((e) =>
                    selected.includes(e.actorId + ":" + e.operationId),
                  )
                  .map((e) => ({
                    actorId: e.actorId,
                    operationId: e.operationId,
                  })),
              })
            }
          >
            Prepare verified manifest
          </button>
          {review.manifests.some(
            (m) => m.populationRevision === review.population?.revision,
          ) && (
            <p>
              This population revision already has a manifest below. If data
              changed, review and save a new population revision before
              preparing another.
            </p>
          )}
          <h3>Prepared manifests</h3>
          {review.manifests.map((m) => (
            <article className="panel" key={m.id}>
              <h4>
                {m.current
                  ? "Manifest matches current reviewed population"
                  : "Historical manifest — current data requires review"}
              </h4>
              <p>
                Population revision {m.populationRevision} ·{" "}
                {formatRecordedHours(m.totals.recordedNanoseconds)} recorded
              </p>
              <details>
                <summary>Manifest fingerprint</summary>
                <code style={{ overflowWrap: "anywhere" }}>{m.hash}</code>
              </details>
              <a
                className="button secondary"
                href={`/api/period-close/artifact?id=${m.id}&format=manifest`}
              >
                Retrieve saved manifest
              </a>
              {m.exports.map((e) => (
                <div key={e.index}>
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=csv&index=${e.index}`}
                  >
                    Retrieve saved CSV batch {e.index + 1}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=canonical&index=${e.index}`}
                  >
                    Retrieve canonical JSON batch {e.index + 1}
                  </a>
                  <details>
                    <summary>CSV fingerprint</summary>
                    <code style={{ overflowWrap: "anywhere" }}>
                      {e.csvSha256}
                    </code>
                  </details>
                </div>
              ))}
              <p>
                Server artifact responses are recorded. Browser file completion
                is unverified.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void send("HANDOFF", {
                    operationId: crypto.randomUUID(),
                    manifestId: m.id,
                    destination: data.get("destination"),
                    reference: data.get("reference"),
                    kind: data.get("kind"),
                  });
                }}
              >
                <fieldset disabled={!recoveryReady || busy || retry !== null || !m.current}>
                  <legend>Record manual downstream handoff</legend>
                  <label>
                    Destination{" "}
                    <input required name="destination" maxLength={600} />
                  </label>
                  <label>
                    External reference{" "}
                    <input required name="reference" maxLength={600} />
                  </label>
                  <label>
                    Reported state{" "}
                    <select name="kind">
                      <option value="REPORTED_SUBMITTED">
                        Reported submitted
                      </option>
                      <option value="REPORTED_IMPORTED">
                        Reported imported (unverified)
                      </option>
                    </select>
                  </label>
                  <button className="button secondary" type="submit">
                    Save handoff report
                  </button>
                </fieldset>
                <p>
                  No connected provider verifies import or payroll processing.
                </p>
              </form>
              <h4>Artifact and handoff history</h4>
              <ul>
                {m.events.map((event, i) => (
                  <li key={i}>
                    {event.kind.replaceAll("_", " ")} · {event.createdAt} ·
                    actor {event.actorId}
                    {event.payload.destination && (
                      <p>
                        {event.payload.destination} · reference{" "}
                        {event.payload.reference} · Manager reported, provider
                        verification unavailable.
                      </p>
                    )}
                    {event.payload.filename && (
                      <p>
                        {event.payload.filename} · Browser file completion
                        unverified.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </>
      )}
      </MobileHomeDisclosure>
    </section>
  );
}
