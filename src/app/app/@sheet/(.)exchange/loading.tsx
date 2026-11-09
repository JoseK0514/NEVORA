'use client';
import {usePathname} from 'next/navigation';
import {CreationSheetSkeleton} from '@/components/employee-mobile/creation-view';

/** While the shift change loads: the sheet's own frame (bar, shift, choices, button) at about its final height, static. */
export default function ShiftChangeSheetLoading() {
  const pathname = usePathname();
  return <CreationSheetSkeleton mode={pathname.endsWith('/callout') ? 'callout' : 'swap'} />;
}
