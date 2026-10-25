import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { UserCheckIcon } from "@phosphor-icons/react/dist/ssr/UserCheck";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr/FileText";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/ssr/ClipboardText";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeCircle";

const icons = {
  payroll: WalletIcon,
  statement: FileTextIcon,
  receipt: ReceiptIcon,
  dashboard: HouseIcon,
  schedule: CalendarBlankIcon,
  calendar: CalendarCheckIcon,
  clock: ClockIcon,
  availability: UserCheckIcon,
  timeOff: CalendarMinusIcon,
  exchange: ArrowsLeftRightIcon,
  employees: UsersIcon,
  templates: FileTextIcon,
  rules: SlidersHorizontalIcon,
  settings: GearSixIcon,
  coverage: ShieldCheckIcon,
  requests: ClipboardTextIcon,
  location: MapPinIcon,
  shift: BriefcaseIcon,
  hours: TimerIcon,
  alert: WarningCircleIcon,
  publish: UploadSimpleIcon,
  employee: UserCircleIcon,
  lead: MedalIcon,
  logout: SignOutIcon,
  more: DotsThreeIcon,
  arrowRight: ArrowRightIcon,
  refresh: ArrowClockwiseIcon,
  chevronRight: CaretRightIcon,
  updates: MegaphoneIcon,
  notifications: BellIcon,
  inbox: TrayIcon,
  reports: ChartBarIcon,
  export: ExportIcon,
  sidebar: SidebarSimpleIcon,
  // Clean Manager (v3) phone tab bar: the iOS-style glyphs for Team and More.
  team: UsersThreeIcon,
  moreCircle: DotsThreeCircleIcon,
};

export type NavIconName = keyof typeof icons;

export function NavIcon({
  name,
  size = 18,
  className,
  weight = "regular",
}: {
  name: NavIconName;
  size?: number;
  employee?: boolean;
  className?: string;
  /** Defaults to regular everywhere; the clean Manager tab bar passes "fill". */
  weight?: "regular" | "fill";
}) {
  const Icon = icons[name];
  return <Icon size={size} weight={weight} color="currentColor" className={className} aria-hidden="true" focusable="false" />;
}
