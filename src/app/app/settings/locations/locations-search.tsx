"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr/SpinnerGap";

/** A plain GET search, so it works before scripts load; the filter in use travels with it. */
export function LocationsSearch({ query, status }: { query: string; status: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form method="get" action="/app/settings/locations" className="wc-search-form" role="search" aria-label="Search locations" aria-busy={pending} onSubmit={() => setPending(true)}>
      <label className="nv-sr" htmlFor="locations-query">Search locations</label>
      <span className="wc-search wc-search--plain">
        <input id="locations-query" className="wc-control" type="search" name="q" placeholder="Search by name" defaultValue={query} maxLength={160} enterKeyHint="search" autoComplete="off" />
      </span>
      {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
      <button type="submit" className="nv-btn" data-kind="secondary" disabled={pending} aria-label={pending ? "Searching locations" : "Search locations"}>
        {pending ? <SpinnerGapIcon className="wc-spin" size={20} weight="bold" aria-hidden="true" /> : <MagnifyingGlassIcon size={20} weight="bold" aria-hidden="true" />}<span className="wc-wide-only">{pending ? "Searching…" : "Search"}</span>
      </button>
      <span role="status" className="nv-sr">{pending ? "Searching locations…" : ""}</span>
    </form>
  );
}
