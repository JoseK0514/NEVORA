import { TopicIcon } from "./topic-icon";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { HouseLineIcon } from "@phosphor-icons/react/dist/ssr/HouseLine";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
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
import { NotePencilIcon } from "@phosphor-icons/react/dist/ssr/NotePencil";
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
import { CreditCardIcon } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatsCircle";

/* Phase 9 (Nov 18, 2026): one glyph per concept, and the same glyph in the sidebar, the rail, the phone tab bar and More.
 * Payroll is the wallet everywhere (the Owner's tab drew a card), a pay statement is the receipt for every role (an Owner's
 * or Manager's My pay drew Week templates' page), Plan and billing is the card (it drew Settings' gear) and Help someone
 * sign in is the key (it drew Profile's face). The tab bar's own card and page glyphs and the unused circled "more" left. */
const icons = {
  payroll: WalletIcon,
  statement: ReceiptIcon,
  receipt: ReceiptIcon,
  billing: CreditCardIcon,
  key: KeyIcon,
  // Rondo AI (Nov 18, 2026): two speech bubbles, a conversation (Jose: nothing that looks AI-generic, so no sparkle).
  // Messaging a person keeps its single bubble (ChatText); Insights keeps the chart Rondo used to borrow.
  rondo: ChatsCircleIcon,
  dashboard: HouseLineIcon,
  help: QuestionIcon,
  schedule: CalendarDotsIcon,
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
  requests: NotePencilIcon,
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
  // Who's working (three people on now; Team is Users).
  team: UsersThreeIcon,
};

export type NavIconName = keyof typeof icons;

export function NavIcon({
  name,
  size = 18,
  className,
  weight = "bold",
}: {
  name: NavIconName;
  size?: number;
  employee?: boolean;
  className?: string;
  /** Controls default to bold. Navigation uses duotone at rest and fill when current. */
  weight?: "regular" | "fill" | "bold" | "duotone";
}) {
  const Icon = icons[name];
  if (weight === "duotone") return <TopicIcon glyph={Icon} size={size} className={className} />;
  return <Icon size={size} weight={weight} color="currentColor" className={className} aria-hidden="true" focusable="false" />;
}
