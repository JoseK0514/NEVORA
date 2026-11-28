"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { parseCopyCommand, type CopyCommand } from "@/lib/scheduling/copy-command";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleCopy } from "./schedule-copy";
// A malformed legacy entry cannot be submitted. Storage access errors still block a fresh copy.
function readPending(key: string): CopyCommand | null {
  const saved = localStorage.getItem(key);
  if (saved === null) return null;
  try {
    return parseCopyCommand(JSON.parse(saved));
  } catch {
    if (localStorage.getItem(key) === saved) localStorage.removeItem(key);
    return null;
  }
}

function releaseCopy(key: string, operationId: string) {
  if (readPending(key)?.operationId === operationId) {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("nevora-copy-pending"));
  }
}

/** Following the receipt link can confirm a copy even when the original response never arrived. */
export function ConfirmedCopy({actorId, operationId}: {actorId: string; operationId: string}) {
  useEffect(() => {
    try { releaseCopy(`nevora-copy-pending:${actorId}`, operationId); } catch { /* The receipt is still available. */ }
  }, [actorId, operationId]);
  return null;
}

export function ScheduleCopyForm({
  command,
  actorId,
  label,
  className = "button secondary",
  ariaLabel,
  children,
  retryReceipt = false,
}: {
  command: CopyCommand;
  actorId: string;
  label?: ReactNode;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
  retryReceipt?: boolean;
}) {
  const t = scheduleCopy(usePortalLang()).copy;
  const router = useRouter();
  const key = `nevora-copy-pending:${actorId}`;
  const [pending, setPending] = useState<CopyCommand | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const sending = useRef(false);
  const [navigating, startNavigation] = useTransition();
  useEffect(() => {
    if (retryReceipt) return;
    const sync = () => {
      try {
        setPending(readPending(key));
        setReady(true);
      } catch {
        setNotice(t.storageUnavailable);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("nevora-copy-pending", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nevora-copy-pending", sync);
    };
  }, [key, retryReceipt, t.storageUnavailable]);
  async function send() {
    if (sending.current || navigating || (!ready && !retryReceipt)) return;
    let original: CopyCommand;
    let retry: boolean;
    try {
      const saved = retryReceipt ? null : readPending(key);
      retry = retryReceipt || !!saved;
      original = retryReceipt ? command : saved ?? { ...command, operationId: crypto.randomUUID() };
      // A receipt already identifies a durable command. Leave any other pending copy alone.
      if (!retryReceipt) {
        localStorage.setItem(key, JSON.stringify(original));
        window.dispatchEvent(new Event("nevora-copy-pending"));
      }
    } catch {
      setNotice(t.notRetained);
      return;
    }
    sending.current = true;
    setBusy(true);
    setNotice(retry ? t.checking : t.copying);
    try {
      const response = await fetch("/api/schedule-copy", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-nevora-schedule-copy": "1",
          "x-nevora-actor": actorId,
        },
        body: JSON.stringify(retryReceipt ? { recover: original.operationId } : original),
      });
      const body = await response.json();
      if (
        response.ok &&
        body.state === "complete" &&
        body.operationId === original.operationId
      ) {
        // The receipt is authoritative even if browser storage became unavailable during the request.
        try { releaseCopy(key, original.operationId); } catch { /* Opening the receipt is still safe. */ }
        startNavigation(() => {
          if (retryReceipt) router.refresh();
          else router.push(`/app/schedule/copy-receipt?operation=${original.operationId}`);
        });
        return;
      }
      if (body?.operationId === original.operationId && (
        (response.status === 400 && body.state === "invalid") ||
        (response.status === 409 && body.state === "conflict")
      )) {
        releaseCopy(key, original.operationId);
        setNotice(t.didntGoThrough);
        return;
      }
      setNotice(
        response.status === 401 || response.status === 403
          ? t.accessRequired
          : t.unconfirmed,
      );
    } catch {
      setNotice(t.noResponse);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const offerRetry = !retryReceipt && !!pending;
  const working = busy || navigating;
  return (
    <div>
      <button
        className={className}
        aria-label={working ? undefined : offerRetry ? t.checkRetry : ariaLabel}
        aria-busy={working || undefined}
        type="button"
        disabled={(!ready && !retryReceipt) || working}
        onClick={() => void send()}
      >
        {/* Round 5 (Nov 8): a server-built label sits beside children; its own fragment keeps React's list check quiet. */}
        {working ? notice : offerRetry ? t.checkRetry : <>{label ?? t.copyPrevious}</>}
        {!working && !offerRetry && children}
      </button>
      {pending && !retryReceipt && !working && (
        <p>
          <a
            href={`/app/schedule/copy-receipt?operation=${pending.operationId}`}
          >
            {t.viewOriginal(pending.operationId)}
          </a>
        </p>
      )}
      {notice && <p role="status" className={working ? "b-sr" : undefined}>{notice}</p>}
    </div>
  );
}
