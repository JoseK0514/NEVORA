import {UsersThreeIcon,MegaphoneIcon} from "@phosphor-icons/react/ssr";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { ToggleRightIcon } from "@phosphor-icons/react/dist/ssr/ToggleRight";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { DeviceTabletIcon } from "@phosphor-icons/react/dist/ssr/DeviceTablet";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { CoffeeIcon } from "@phosphor-icons/react/dist/ssr/Coffee";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { getWorkspace } from "@/lib/data/workspaces";
import { SettingsFrame } from "./wave-c-kit";

const groups = [
  {
    id: "workspace",
    title: "Company & locations",
    description: "The essentials for your business.",
    items: [
      { id: "profile", title: "Company profile", description: "Business name and timezone.", href: "/app/settings/workspace", icon: BuildingsIcon },
      { id: "locations", title: "Locations", description: "Location details, status, and Clocker links.", href: "/app/settings/locations", icon: MapPinIcon },
      { id: "branding", title: "Branding", description: "Company color and logo, kept readable.", href: "/app/settings/branding", icon: PaletteIcon },
      { id: "features", title: "Features & words", description: "Turn features on or off, and choose your team’s words.", href: "/app/settings/features", icon: ToggleRightIcon },
    ],
  },
  {
    id: "work-rules",
    title: "Scheduling & attendance",
    description: "How your team is scheduled and works.",
    items: [
      { id: "company-policies", title: "Company policies", description: "Attendance thresholds, effective dates, and revision history.", href: "/app/settings/company-policies", icon: ShieldCheckIcon },
      { id: "scheduling", title: "Scheduling rules", description: "Staffing, coverage periods, and weekly hour goals.", href: "/app/schedule/settings", icon: SlidersHorizontalIcon },
      { id: "breaks", title: "Break types", description: "Break classifications and optional reference durations.", href: "/app/settings/breaks", icon: CoffeeIcon },
      { id: "positions", title: "Positions", description: "Job qualifications, separate from access roles.", href: "/app/settings/positions", icon: BriefcaseIcon },
    ],
  },
  {
    id: "team-communications",
    title: "Team & communications",
    description: "People, access roles, and company announcements.",
    items: [
      {id:"employees",title:"Employees & access",description:"Employee information, access roles, and scheduling eligibility.",href:"/app/employees",icon:UsersThreeIcon},
      {id:"updates",title:"Company updates",description:"Announcements, audiences, and review requirements.",href:"/app/updates",icon:MegaphoneIcon},
    ],
  },
  {
    id: "clocker",
    title: "Clocker & devices",
    description: "Shared tablets and their workspace access.",
    items: [{ id: "devices", title: "Clocker devices", description: "Register shared tablets and manage their access.", href: "/app/settings/clocker", icon: DeviceTabletIcon }],
  },
  {
    id: "access-recovery",
    title: "Access & recovery",
    description: "Help your team get back to work.",
    items: [
      { id: "account-recovery", title: "Account recovery", description: "Verify identity and help restore portal access.", href: "/app/account-recovery?from=settings", icon: KeyIcon },
      { id: "clocker-recovery", title: "Clocker recovery", description: "Review an employee’s saved Clocker action reference.", href: "/app/clocker-recovery?from=settings", icon: ClockCounterClockwiseIcon },
    ],
  },
];

export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  const payroll = payrollFeatureEnabled() ? await readPayrollCapabilities(await requireSessionMutationProof()) : undefined;
  const [presentation, workspace] = await Promise.all([currentPresentation(), getWorkspace()]);
  const words = wordPreset(presentation.words).en;
  // Features the company turned off leave the hub; rows name people and places in the company's words (B2).
  const named = groups.map(group => ({ ...group, items: group.items.filter(item => pathEnabled(item.href, presentation.modules)).map(item =>
    item.id === "employees" ? { ...item, title: `${words.people} & access`, description: `${words.person} information, access roles, and scheduling eligibility.` }
    : item.id === "locations" ? { ...item, title: words.locations, description: `${words.location} details, status, and Clocker links.` } : item) }));
  const visibleGroups = [...named, ...(payroll?.canConfigure ? [{id:"payroll",title:"Payroll",description:"Financial settings and authorized payroll access.",items:[{id:"payroll",title:"Payroll settings",description:"Company preferences, employee exceptions, and financial access.",href:"/app/settings/payroll",icon:WalletIcon}]}] : [])];
  return (
    <SettingsFrame back={null} eyebrow={workspace.name} title="Settings" summary="Set up your workspace and the way your team works.">
      <div className="wc-hub">
        {visibleGroups.map((group) => (
          <section key={group.id} className="nv-card" aria-labelledby={`settings-${group.id}`}>
            <div className="nv-card__head">
              <h2 className="nv-card__title" id={`settings-${group.id}`}>{group.title}</h2>
              <p className="nv-card__meta">{group.description}</p>
            </div>
            <ul className="nv-rows">
              {group.items.map(({ id, title, description, href, icon: Icon }) => (
                <li key={href}>
                  <Link className="nv-row" data-leading="true" href={href} prefetch={false}
                    aria-labelledby={`setting-${id}-title`} aria-describedby={`setting-${id}-description`}>
                    <span className="nv-tile" data-tone="accent" aria-hidden="true"><Icon size={22} weight="regular" focusable="false" /></span>
                    <span className="nv-row__text">
                      <span id={`setting-${id}-title`} className="nv-row__title">{title}</span>
                      <span id={`setting-${id}-description`} className="nv-row__meta">{description}</span>
                    </span>
                    <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" focusable="false" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="wc-footnote">
        <ShieldCheckIcon size={18} weight="regular" aria-hidden="true" focusable="false" />
        <span>Only Owners see Settings. Each page saves its own changes.</span>
      </p>
    </SettingsFrame>
  );
}
