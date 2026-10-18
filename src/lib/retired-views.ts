import { isValidIsoDate, isValidWeekStart } from "./date-utils";

/** R1: Home's old Schedule and Requests views now live in one place each.
 * Old links keep their week, day, location and person. */
export function retiredViewDestination(params: { view?: string; week?: string; day?: string; location?: string; employee?: string }) {
  if (params.view === "requests") return "/app/inbox?filter=requests";
  if (params.view !== "schedule") return null;
  const query = new URLSearchParams();
  if (params.week && isValidWeekStart(params.week)) query.set("week", params.week);
  if (params.day && isValidIsoDate(params.day)) query.set("day", params.day);
  if (params.location) query.set("location", params.location);
  const search = query.toString();
  return `/app/schedule${search ? `?${search}` : ""}${params.employee ? `#schedule-employee-${encodeURIComponent(params.employee)}` : ""}`;
}
