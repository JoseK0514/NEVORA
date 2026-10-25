'use client';

import type {ReactNode} from 'react';

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function ReportsEntrance({children}:{children:ReactNode}) {
 return <div className="nv-page wb-page wb-reports cm-page cm-insights" data-nv-page="">{children}</div>;
}
