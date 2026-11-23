"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useKeptResult } from "@/components/owner-b/kept-result";

/* Gaps G84 (Nov 23, 2026): Find cover's "Replacement saved." arrives with the page (the save's own redirect flag). The
 * shell removes that flag from the address, and the access frame's re-check draws its checking shape in place of the page
 * (unmounting it) before the quiet re-read, which came back without the flag: the line turned into "Covered" within
 * seconds. The page keeps the saved result for this cover address in memory while the person stays on it (through
 * those re-reads); opening another cover address or reloading drops it. Nothing is read, stored or sent. */
let kept: string | null = null;
function coverKey() {
  const params = new URLSearchParams(window.location.search);
  params.delete("saved"); params.delete("refresh");
  return `${window.location.pathname}?${params.toString()}`;
}
const remembered = () => typeof window !== "undefined" && kept !== null && kept === coverKey();

function useKeptSaved(saved: boolean) {
  const [again] = useState(remembered); // drawn again after the frame's check, on the same cover address
  const here = useKeptResult(saved || null); // the flag dropped by a re-read while the page stays drawn
  useEffect(() => { if (saved) kept = coverKey(); else if (kept !== null && kept !== coverKey()) kept = null; }, [saved]);
  return !!here || again;
}

export function KeptSaved({ saved, children }: { saved: boolean; children: ReactNode }) {
  return useKeptSaved(saved) ? children : null;
}

/** What the page shows only while no save was kept (the shift card's grey "Covered"; the saved line already says it). */
export function UnlessSaved({ saved, children }: { saved: boolean; children: ReactNode }) {
  return useKeptSaved(saved) ? null : children;
}
