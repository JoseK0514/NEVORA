import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Owner controls"
        title="Settings"
        description="Business rules will live here instead of being hard-coded into scheduling screens."
      />
      <section className="panel settings-list">
        <div><strong>Locations</strong><span>Configure the two Fuel Coffee Drive locations.</span><button className="button ghost">Manage</button></div>
        <div><strong>Roles & Permissions</strong><span>Owner, Manager, Lead, and Employee access.</span><button className="button ghost">Manage</button></div>
        <div><strong>Scheduling Rules</strong><span>Warnings, approval rules, and future hour limits.</span><button className="button ghost">Manage</button></div>
      </section>
    </>
  );
}
