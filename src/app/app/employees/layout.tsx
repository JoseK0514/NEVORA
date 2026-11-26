import type { ReactNode } from "react";
import { TeamReturnScope } from "@/components/owner-b/team-return";

export default function EmployeesLayout({children}: {children: ReactNode}) {
  return <TeamReturnScope>{children}</TeamReturnScope>;
}
