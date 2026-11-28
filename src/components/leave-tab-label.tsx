"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { BSpin } from "./owner-b/b-kit";

export function LeaveTabLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className="tod-tab-label" aria-busy={pending}>{pending && <BSpin small />}{children}</span>;
}
