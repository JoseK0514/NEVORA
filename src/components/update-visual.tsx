'use client';

import {useRef, type ReactNode} from 'react';
import {useGSAP} from '@gsap/react';
import {gsap} from 'gsap';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {NotePencilIcon} from '@phosphor-icons/react/dist/ssr/NotePencil';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {MapPinLineIcon} from '@phosphor-icons/react/dist/ssr/MapPinLine';
import type {CommunicationDraft} from '@/lib/communications/types';

gsap.registerPlugin(useGSAP);
const kinds = {
 TODAYS_TEAM: {label: "Today's team", Icon: UsersThreeIcon},
 SHIFT_NOTE: {label: 'Shift note', Icon: NotePencilIcon},
 OPERATIONAL_UPDATE: {label: 'Important update', Icon: MegaphoneIcon},
 LOCATION_ANNOUNCEMENT: {label: 'Location announcement', Icon: MapPinLineIcon},
};

export function UpdateKind({type, iconOnly = false}: {type: CommunicationDraft['type']; iconOnly?: boolean}) {
 const {label, Icon} = kinds[type];
 return <span className={iconOnly ? 'update-kind-icon' : 'update-kind'}>
  <Icon size={22} weight="regular" aria-hidden="true" focusable="false" />
  {iconOnly ? null : <span>{label}</span>}
 </span>;
}

export function UpdateEntrance({children, className, identity}: {children: ReactNode; className: string; identity?: string}) {
 const container = useRef<HTMLDivElement>(null);
 useGSAP(() => {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
   gsap.fromTo('[data-update-heading]', {y: 6, opacity: .85}, {y: 0, opacity: 1, duration: .38, ease: 'power2.out', clearProps: 'transform,opacity'});
  });
  return () => media.revert();
 }, {scope: container, dependencies: [identity], revertOnUpdate: true});
 return <div ref={container} className={className}>{children}</div>;
}
