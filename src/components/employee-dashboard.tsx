import {EmployeeHomeActions} from "./employee-home-actions";

export type EmployeeUpcomingShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead: boolean;
  locationName?: string;
};

export function isUpcomingEmployeeShift(
  date: string,
  startTime: string,
  currentDate: string,
  currentTime: string,
) {
  if (date > currentDate) return true;
  if (date < currentDate) return false;
  return startTime > currentTime;
}

export function employeeScheduleHref(weekStart: string, date: string) {
  return `/app/schedule?week=${encodeURIComponent(weekStart)}&day=${encodeURIComponent(date)}`;
}

export function formatEmployeeMetric(
  value: number,
  kind: "hours" | "earnings",
) {
  if (kind === "hours") return `${value.toFixed(1)} hrs`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function EmployeeDashboard({authority,timeAuthority,displayName}:{authority:string;timeAuthority:string;displayName?:string}){
 return <div className="employee-dashboard employee-home"><EmployeeHomeActions authority={authority} timeAuthority={timeAuthority} displayName={displayName}/></div>;
}
