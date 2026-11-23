import {SquaresFourIcon} from '@phosphor-icons/react/dist/ssr/SquaresFour';
import {SlidersHorizontalIcon} from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import {BellSimpleIcon} from '@phosphor-icons/react/dist/ssr/BellSimple';
import {TextAlignLeftIcon} from '@phosphor-icons/react/dist/ssr/TextAlignLeft';
import {UsersIcon} from '@phosphor-icons/react/dist/ssr/Users';
import {DeviceTabletIcon} from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {XIcon} from '@phosphor-icons/react/dist/ssr/X';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {HourglassMediumIcon} from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {DotsThreeIcon} from '@phosphor-icons/react/dist/ssr/DotsThree';
import {CalendarDotsIcon} from '@phosphor-icons/react/dist/ssr/CalendarDots';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {LifebuoyIcon} from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import {MegaphoneSimpleIcon} from '@phosphor-icons/react/dist/ssr/MegaphoneSimple';
import {NumpadIcon} from '@phosphor-icons/react/dist/ssr/Numpad';
import {MapPinIcon} from '@phosphor-icons/react/dist/ssr/MapPin';
import {CoffeeIcon} from '@phosphor-icons/react/dist/ssr/Coffee';
import {ForkKnifeIcon} from '@phosphor-icons/react/dist/ssr/ForkKnife';
import {PlayIcon} from '@phosphor-icons/react/dist/ssr/Play';
import {SignInIcon} from '@phosphor-icons/react/dist/ssr/SignIn';
import {SignOutIcon} from '@phosphor-icons/react/dist/ssr/SignOut';
import {BackspaceIcon} from '@phosphor-icons/react/dist/ssr/Backspace';
import {CameraIcon} from '@phosphor-icons/react/dist/ssr/Camera';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {LockSimpleIcon} from '@phosphor-icons/react/dist/ssr/LockSimple';
import {WalletIcon} from '@phosphor-icons/react/dist/ssr/Wallet';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {NotePencilIcon} from '@phosphor-icons/react/dist/ssr/NotePencil';
import {UserCheckIcon} from '@phosphor-icons/react/dist/ssr/UserCheck';
import {TrayIcon} from '@phosphor-icons/react/dist/ssr/Tray';
import {FadersHorizontalIcon} from '@phosphor-icons/react/dist/ssr/FadersHorizontal';
import {ArrowUpRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {BookOpenIcon} from '@phosphor-icons/react/dist/ssr/BookOpen';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';

const marks = {
  overview: SquaresFourIcon,
  controls: SlidersHorizontalIcon,
  feedback: BellSimpleIcon,
  form: TextAlignLeftIcon,
  people: UsersIcon,
  clocker: DeviceTabletIcon,
  back: ArrowLeftIcon,
  right: CaretRightIcon,
  left: CaretLeftIcon,
  down: CaretDownIcon,
  close: XIcon,
  check: CheckIcon,
  approve: CheckCircleIcon,
  info: InfoIcon,
  warning: WarningIcon,
  blocked: WarningCircleIcon,
  wait: HourglassMediumIcon,
  search: MagnifyingGlassIcon,
  more: DotsThreeIcon,
  schedule: CalendarDotsIcon,
  clock: ClockIcon,
  help: LifebuoyIcon,
  notice: MegaphoneSimpleIcon,
  pin: NumpadIcon,
  location: MapPinIcon,
  break: CoffeeIcon,
  meal: ForkKnifeIcon,
  resume: PlayIcon,
  in: SignInIcon,
  out: SignOutIcon,
  backspace: BackspaceIcon,
  camera: CameraIcon,
  refresh: ArrowClockwiseIcon,
  lock: LockSimpleIcon,
  pay: WalletIcon,
  receipt: ReceiptIcon,
  request: NotePencilIcon,
  profile: UserCheckIcon,
  empty: TrayIcon,
  options: FadersHorizontalIcon,
  exit: ArrowUpRightIcon,
  shield: ShieldCheckIcon,
  book: BookOpenIcon,
  team: UsersThreeIcon,
};
export type MarkName = keyof typeof marks;

export function Mark({
  name,
  size = 20,
  weight = 'fill',
}: {
  name: MarkName;
  size?: number;
  weight?: 'fill' | 'bold' | 'duotone' | 'regular';
}) {
  const Glyph = marks[name];
  return <Glyph size={size} weight={weight} aria-hidden="true" focusable="false" />;
}
