"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { CopyCommand } from "@/lib/data/schedule-copy";
export function ScheduleCopyForm({
  command,
  actorId,
  label = "Copy previous week",
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
        setNotice(
          "Local recovery storage is unavailable. Enable browser storage before copying.",
        );
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("nevora-copy-pending", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nevora-copy-pending", sync);
    };
  }, [key]);
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
      setNotice("Could not retain the operation for retry. No copy was sent.");
      return;
    }
    setBusy(true);
    setNotice("Checking the original operation…");
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
        setNotice("The original copy didn’t go through. You can start a new copy when ready.");
        return;
      }
      setNotice(
        response.status === 401 || response.status === 403
          ? "Current management access is required. Sign in again to check the original operation."
          : "Outcome is unconfirmed. Check or retry the original operation; its reference is retained across reloads.",
      );
    } catch {
      setNotice(
        "Response unavailable. Check or retry the original operation. A new copy is blocked until it is resolved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className={className}
        aria-label={pending ? "Check / retry original copy" : ariaLabel}
        type="button"
        disabled={!ready || busy}
        onClick={() => void send()}
      >
        {/* Round 5 (Nov 8): a server-built label sits beside children; its own fragment keeps React's list check quiet. */}
        {pending ? "Check / retry original copy" : <>{label}</>}
        {!pending && children}
      </button>
      {pending && (
        <p>
          <a
            href={`/app/schedule/copy-receipt?operation=${pending.operationId}`}
          >
            View original operation {pending.operationId}
          </a>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
