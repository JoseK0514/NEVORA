import { requireRoles } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/data/workspaces";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SettingsPageB } from "../settings-b";
import { CorpErrorCard } from "@/components/corp/corp";
import { ActivityFeed } from "./activity-feed";
import { activityCopy } from "./activity-copy";
import "./activity.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: activityCopy[await readPageLang()].title };
}

export default async function ActivityPage() {
  const owner = await requireRoles(["OWNER"]);
  const [workspace, lang] = await Promise.all([getWorkspace().catch(() => null), readPageLang()]);
  const t = activityCopy[lang];
  return <SettingsPageB title={t.title} lang={lang} className="c-owner-activity">
    {workspace ? <ActivityFeed key={`${workspace.id}:${owner.id}:${workspace.timeZone}`} timeZone={workspace.timeZone} lang={lang}/>
      // eslint-disable-next-line next-preserved/no-html-link-for-pages -- reload the document to re-read the workspace timezone
      : <CorpErrorCard title={t.unavailable} body={t.retryBody} action={<a className="c-btn c-btn--primary" href="/app/settings/activity">{t.retry}</a>}/>}
  </SettingsPageB>;
}
