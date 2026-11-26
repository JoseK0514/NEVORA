import type { OwnerActivityEntry } from "@/lib/activity/owner-feed";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { shortPersonName } from "@/lib/short-person-name";
import { formatWithZone } from "@/lib/time-zone-label";
import { activityCopy } from "./activity-copy";

export function ActivityEntries({ entries, lang, timeZone }: { entries: OwnerActivityEntry[]; lang: PortalLang; timeZone: string }) {
  const t = activityCopy[lang], locale = lang === "es" ? "es-PR" : "en-US";
  const weekDate = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  return <ol className="activity-entries" aria-label={t.events}>
    {entries.map(({ id, occurredAt, actor, change }) => {
      const subject = "weekStart" in change
        ? [change.locationName ?? (change.locationId === null ? t.company : t.unknown), t.week(weekDate.format(new Date(change.weekStart + "T12:00:00Z")))]
        : [change.employeeName ? shortPersonName(change.employeeName) : t.unknown];
      if (change.kind === "MANAGER_SCOPE_ASSIGNED") {
        subject.push(change.scope.mode === "COMPANY" ? t.company : t.locations(change.scope.locationIds.length));
      }
      return <li key={id}>
        <div><strong>{t.kinds[change.kind]}</strong><p>{subject.join(" · ")}</p></div>
        <div className="activity-record"><time dateTime={occurredAt}>{formatWithZone(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, new Date(occurredAt), timeZone)}</time><p>{t.actor(actor.name ? shortPersonName(actor.name) : t.unknown)}</p></div>
      </li>;
    })}
  </ol>;
}
