import {scopedObservation} from '@/lib/company-access/observation';
import Link from "next/link";
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { CorpPage } from "@/components/corp/corp";
import { SheetMarker } from "@/components/team/team-forms";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { getWorkspace } from "@/lib/data/workspaces";
import { christmasBonusApplies } from "@/lib/reports/christmas-bonus";
import { createEmployeeFormAction } from "@/app/app/employees/actions";

import {NewEmployeeForm} from "@/components/company-access/new-employee-form";
import {readPageLang} from "@/lib/i18n/page-lang.server";
import {EMPLOYEES_COPY} from "../employees-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: EMPLOYEES_COPY[await readPageLang()].addEmployee }; }

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const params=await searchParams;
  const t=EMPLOYEES_COPY[await readPageLang()];
  // Review 30 (D38): the workspace's time zone says whether Christmas bonus hours exist here (Puerto Rico only). A failed
  // read keeps today's line; it never takes the form down.
  const source=await withOperationalCompany(await requireSessionMutationProof(),()=>Promise.all([listLocations(),listPositions(),getWorkspace().then(workspace=>christmasBonusApplies(workspace.timeZone)).catch(()=>true)]));
  if(source.state==='unavailable')return <OperationalUnavailable lang={await readPageLang()} title={t.addUnavailable} reason={source.reason}/>;
  const [locations,positions,bonusApplies]=source.data;
  const activeLocations = locations.filter((location) => location.active);

  // Release 1 (boards O-AddEmployee, O-AddEmployeePay): a sheet in two steps; the form carries its own header.
  return (
    <ScopedReadFrame observation={scopedObservation(source)}><CorpPage className="c-addemp c-sheetpage" labelledBy="new-employee-title">
      <SheetMarker />
      <NewEmployeeForm actorRole={session.role} locations={activeLocations} positions={positions} action={createEmployeeFormAction} bonusApplies={bonusApplies} notice={<>
        {params.error ? <p className="c-error" role="alert">{t.addErrors[params.error] ?? t.addIncomplete}</p> : null}
        {!activeLocations.length ? <p className="c-note" role="status">{session.role === "OWNER" ? <span>{t.addLocationFirst}{" "}<Link className="c-link c-link--l" href="/app/settings/locations">{t.locations}</Link></span> : t.askOwnerLocation}</p> : null}
      </>}/>
    </CorpPage></ScopedReadFrame>
  );
}
