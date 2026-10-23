import type { AdvisorSource } from "./contracts";

export type AttentionKind = "clock_in" | "coverage" | "missing_punches" | "setup";
export type AttentionDisposition = "tracking" | "deferred" | "dismissed";
export type AttentionItem = {
  id: string;
  fingerprint: string;
  kind: AttentionKind;
  locationId: string;
  locationName: string;
  date: string;
  title: string;
  detail: string;
  basis: "Published shifts and recorded punches" | "Current planning ledger, including drafts";
  source: AdvisorSource;
  reviewRevision: number;
  disposition: AttentionDisposition | null;
  deferredUntil: string | null;
};
export type AttentionReviewed = {
  id: string;
  fingerprint: string | null;
  kind: AttentionKind;
  date: string;
  locationName: string;
  title: string;
  state: "open" | "resolved" | "not_current" | "unverified";
  disposition: AttentionDisposition;
  deferredUntil: string | null;
  reviewRevision: number;
  evidenceChanged: boolean;
};
export type AttentionBriefing = {
  state: "ready" | "unavailable";
  date: string | null;
  observedAt: string;
  partial: boolean;
  items: AttentionItem[];
  reviewed: AttentionReviewed[];
  total: number;
  hidden: number;
  sources: AdvisorSource[];
};
