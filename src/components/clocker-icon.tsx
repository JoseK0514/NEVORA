import type { CSSProperties } from 'react';
import type { Icon, IconWeight } from '@phosphor-icons/react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { BackspaceIcon } from '@phosphor-icons/react/dist/ssr/Backspace';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CoffeeIcon } from '@phosphor-icons/react/dist/ssr/Coffee';
import { DeviceTabletIcon } from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { GlobeIcon } from '@phosphor-icons/react/dist/ssr/Globe';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SignInIcon } from '@phosphor-icons/react/dist/ssr/SignIn';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';

export type ClockerIconName = 'lock' | 'location' | 'arrow' | 'delete' | 'check' | 'clock-in' | 'clock-out' | 'break' | 'resume'
  | 'refresh' | 'shield' | 'globe' | 'rest' | 'meal' | 'tablet';

/** Signature Clocker icons: Phosphor, the portal's icon family. Duotone in tiles, regular for small marks. */
const icons: Record<ClockerIconName, Icon> = {
  lock: LockSimpleIcon, location: MapPinIcon, arrow: ArrowRightIcon, delete: BackspaceIcon, check: CheckIcon,
  'clock-in': SignInIcon, 'clock-out': SignOutIcon, break: CoffeeIcon, resume: CoffeeIcon, refresh: ArrowClockwiseIcon,
  shield: ShieldCheckIcon, globe: GlobeIcon, rest: TimerIcon, meal: ForkKnifeIcon, tablet: DeviceTabletIcon,
};

export function ClockerIcon({ name, size = 24, weight = 'regular', style }: { name: ClockerIconName; size?: number; weight?: IconWeight; style?: CSSProperties }) {
  const Glyph = icons[name];
  return <Glyph size={size} weight={weight} aria-hidden="true" focusable="false" style={style} />;
}
