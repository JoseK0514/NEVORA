'use client';

import type {ReactNode} from 'react';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {NotePencilIcon} from '@phosphor-icons/react/dist/ssr/NotePencil';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {MapPinLineIcon} from '@phosphor-icons/react/dist/ssr/MapPinLine';
import type {CommunicationDraft} from '@/lib/communications/types';

export const updateKinds = {
 TODAYS_TEAM: {label: "Today's team", Icon: UsersThreeIcon},
 SHIFT_NOTE: {label: 'Shift note', Icon: NotePencilIcon},
 OPERATIONAL_UPDATE: {label: 'Important update', Icon: MegaphoneIcon},
 LOCATION_ANNOUNCEMENT: {label: 'Location announcement', Icon: MapPinLineIcon},
};

export function UpdateKind({type, iconOnly = false}: {type: CommunicationDraft['type']; iconOnly?: boolean}) {
 const {label, Icon} = updateKinds[type];
 return <span className={iconOnly ? 'update-kind-icon' : 'update-kind'}>
  <Icon size={22} weight="regular" aria-hidden="true" focusable="false" />
  {iconOnly ? null : <span>{label}</span>}
 </span>;
}

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function UpdateEntrance({children, className}: {children: ReactNode; className: string; identity?: string}) {
 return <div className={className}>{children}</div>;
}
