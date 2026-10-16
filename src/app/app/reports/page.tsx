import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Reports} from '@/components/reports';
import {ReportsEntrance} from '@/components/reports-entrance';
import {ChartBarIcon} from '@phosphor-icons/react/dist/ssr/ChartBar';
import styles from '@/components/reports.module.css';
import {redirect} from 'next/navigation';
export default async function ReportsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))redirect('/app');
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  return <ReportsEntrance><header className={styles.pageHeader} data-report-entrance=""><span className={styles.headerIcon}><ChartBarIcon size={26} weight="regular" aria-hidden="true"/></span><div><h1>Reports</h1><p>Hours, attendance and schedule changes for any period.</p></div></header>
    <Reports key={session.id} initialPeriod={period}/></ReportsEntrance>;
}
