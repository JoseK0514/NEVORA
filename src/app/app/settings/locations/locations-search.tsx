"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function LocationsSearch({ query, status }: { query: string; status: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form method="get" action="/app/settings/locations" className="locations-search" role="search" aria-label="Search locations" aria-busy={pending} onSubmit={() => setPending(true)}>
      <label className="sr-only" htmlFor="locations-query">Search locations</label>
      <MagnifyingGlass size={20} aria-hidden="true" />
      <input id="locations-query" type="search" name="q" placeholder="Search by name" defaultValue={query} maxLength={160} />
      {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
      <button type="submit" disabled={pending}>{pending ? "Searching..." : "Search"}</button>
      <span role="status" className="sr-only">{pending ? "Searching locations..." : ""}</span>
    </form>
  );
}
