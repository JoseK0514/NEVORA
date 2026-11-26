"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BackLinkHistoryMatch } from "../corp/corp-client";

type Filter = "all" | "working" | "late" | "off";
type Visit = { directory: string; profile: string; filter: Filter; top: number; keyboard: boolean };
const TeamVisit = createContext<{read: () => Visit | null; save: (value: Visit | null) => void} | null>(null);
const directory = "/app/employees";
const currentDirectory = () => location.pathname + location.search;
const sameTab = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function TeamReturnScope({children}: {children: ReactNode}) {
  const visit = useRef<Visit | null>(null);
  const history = useMemo(() => ({read: () => visit.current, save: (value: Visit | null) => { visit.current = value; }}), []);
  const path = usePathname();
  useLayoutEffect(() => {
    if (visit.current && path !== visit.current.profile && path !== directory) visit.current = null;
  }, [path]);
  return <TeamVisit.Provider value={history}>{children}</TeamVisit.Provider>;
}

export function useTeamReturn(ready: boolean, filter: Filter, setFilter: (value: Filter) => void) {
  const visit = useContext(TeamVisit);
  useLayoutEffect(() => {
    const saved = visit?.read();
    if (!visit || !saved || saved.directory !== currentDirectory()) return;
    if (filter !== saved.filter) { setFilter(saved.filter); return; }
    if (!ready) return;
    const frame = requestAnimationFrame(() => {
      const row = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.b-row[href]"))
        .find(link => link.pathname === saved.profile && link.getClientRects().length > 0);
      if (row) {
        row.scrollIntoView({block: "nearest", behavior: "instant"});
        let scroll = row.parentElement;
        while (scroll && !(/auto|scroll/.test(getComputedStyle(scroll).overflowY) && scroll.scrollHeight > scroll.clientHeight)) scroll = scroll.parentElement;
        (scroll ?? window).scrollBy({top: row.getBoundingClientRect().top - saved.top, behavior: "instant"});
        if (saved.keyboard) row.focus({preventScroll: true});
      }
      visit.save(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, filter, setFilter, visit]);
  return visit ? (event: MouseEvent<HTMLAnchorElement>) => {
    if (!sameTab(event)) return;
    const row = event.currentTarget;
    visit.save({directory: currentDirectory(), profile: row.pathname, filter, top: row.getBoundingClientRect().top, keyboard: event.detail === 0});
  } : undefined;
}

/** Use the actual directory history entry when the profile was opened from one. Deep links keep the usual Team destination. */
export function TeamProfileBack({children}: {children: ReactNode}) {
  const visit = useContext(TeamVisit);
  return <BackLinkHistoryMatch.Provider value={href => href === directory && visit?.read()?.profile === location.pathname}>
    {children}
  </BackLinkHistoryMatch.Provider>;
}
