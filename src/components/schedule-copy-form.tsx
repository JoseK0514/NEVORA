"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { CopyCommand } from "@/lib/data/schedule-copy";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleCopy } from "./schedule-copy";
export function ScheduleCopyForm({
  command,
  actorId,
  label,
  className = "button secondary",
  ariaLabel,
  children,
}: {
  command: CopyCommand;
  actorId: string;
  label?: ReactNode;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const t = scheduleCopy(usePortalLang()).copy;
  const router = useRouter();
  const key = `nevora-copy-pending:${actorId}`;
  const [pending, setPending] = useState<CopyCommand | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const sync = () => {
      try {
        const saved = localStorage.getItem(key);
        setPending(saved ? JSON.parse(saved) : null);
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
  }, [key, t.storageUnavailable]);
  async function send() {
    if (busy || !ready) return;
    let original: CopyCommand;
    try {
      const saved = localStorage.getItem(key);
      original = saved ? JSON.parse(saved) : command;
      localStorage.setItem(key, JSON.stringify(original));
      setPending(original);
      window.dispatchEvent(new Event("nevora-copy-pending"));
    } catch {
      setNotice(t.notRetained);
      return;
    }
    setBusy(true);
    setNotice(t.checking);
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
        body: JSON.stringify(original),
      });
      const body = await response.json();
      if (
        response.ok &&
        body.state === "complete" &&
        body.operationId === original.operationId
      ) {
        localStorage.removeItem(key);
        window.dispatchEvent(new Event("nevora-copy-pending"));
        router.push(
          `/app/schedule/copy-receipt?operation=${original.operationId}`,
        );
        return;
      }
      if (
        response.ok &&
        body && typeof body === "object" &&
        (body as { operationId?: unknown }).operationId === original.operationId &&
        typeof (body as { state?: unknown }).state === "string" &&
        !["pending", "complete"].includes((body as { state: string }).state)
      ) {
        // Review fix (32/50): a copy the server reports as settled (failed, rejected, conflicted) is resolved —
        // clear the stored reference instead of showing "Check or retry" on every week forever.
        localStorage.removeItem(key);
        window.dispatchEvent(new Event("nevora-copy-pending"));
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
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className={className}
        aria-label={pending ? t.checkRetry : ariaLabel}
        type="button"
        disabled={!ready || busy}
        onClick={() => void send()}
      >
        {/* Round 5 (Nov 8): a server-built label sits beside children; its own fragment keeps React's list check quiet. */}
        {pending ? t.checkRetry : <>{label ?? t.copyPrevious}</>}
        {!pending && children}
      </button>
      {pending && (
        <p>
          <a
            href={`/app/schedule/copy-receipt?operation=${pending.operationId}`}
          >
            {t.viewOriginal(pending.operationId)}
          </a>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
