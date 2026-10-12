import {UsersThreeIcon,MegaphoneIcon} from "@phosphor-icons/react/ssr";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import Link from "next/link";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
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
import { SettingsHubMotion } from "./settings-hub-motion";
import "./settings-hub.css";

const groups = [
  {
    id: "workspace",
    title: "Company & locations",
    description: "The essentials for your business.",
    items: [
      { id: "profile", title: "Company profile", description: "Business name and timezone.", href: "/app/settings/workspace", icon: BuildingsIcon },
      { id: "locations", title: "Locations", description: "Location details, status, and Clocker links.", href: "/app/settings/locations", icon: MapPinIcon },
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
      { id: "account-recovery", title: "Account recovery", description: "Verify identity and help restore portal access.", href: "/app/account-recovery", icon: KeyIcon },
      { id: "clocker-recovery", title: "Clocker recovery", description: "Review an employee's saved Clocker action reference.", href: "/app/clocker-recovery", icon: ClockCounterClockwiseIcon },
    ],
  },
];

export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  const payroll = payrollFeatureEnabled() ? await readPayrollCapabilities(await requireSessionMutationProof()) : undefined;
  const visibleGroups = [...groups, ...(payroll?.canConfigure ? [{id:"payroll",title:"Payroll",description:"Financial settings and authorized payroll access.",items:[{id:"payroll",title:"Payroll settings",description:"Company preferences, employee exceptions, and financial access.",href:"/app/settings/payroll",icon:WalletIcon}]}] : [])];
  return (
    <SettingsHubMotion>
      <header className="settings-hub-heading">
        <h1>Settings</h1>
        <p>Set up your workspace and the way your team works.</p>
      </header>
      <div className="settings-hub-groups">
        {visibleGroups.map((group) => (
          <section key={group.id} className="settings-hub-group" aria-labelledby={`settings-${group.id}`}>
            <div className="settings-hub-group-heading">
              <h2 id={`settings-${group.id}`}>{group.title}</h2>
              <p>{group.description}</p>
            </div>
            <ul className="settings-hub-list">
              {group.items.map(({ id, title, description, href, icon: Icon }) => (
                <li key={href}>
                  <Link className="settings-hub-row" href={href} prefetch={false}
                    aria-labelledby={`setting-${id}-title`} aria-describedby={`setting-${id}-description`}>
                    <span className="settings-hub-icon" aria-hidden="true">
                      <Icon size={22} weight="regular" focusable="false" />
                    </span>
                    <span className="settings-hub-row-copy">
                      <span id={`setting-${id}-title`} className="settings-hub-row-title">{title}</span>
                      <span id={`setting-${id}-description`} className="settings-hub-row-description">{description}</span>
                    </span>
                    <CaretRightIcon className="settings-hub-chevron" size={18} weight="regular" aria-hidden="true" focusable="false" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="settings-hub-note">
        <ShieldCheckIcon size={18} weight="regular" aria-hidden="true" focusable="false" />
        <span>Available to Owners. Review and save changes on each settings page.</span>
      </p>
    </SettingsHubMotion>
  );
}
