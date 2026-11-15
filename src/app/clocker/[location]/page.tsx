import {readFeatureFlags} from '../../../lib/feature-flags';
import type {Metadata} from 'next';
import {clockerLaunchMetadata} from '@/lib/clocker/installation';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { notFound } from "next/navigation";
import { ClockerSetup } from "@/components/clocker-setup";
import { findActiveLocationByClockerKey } from "@/lib/data/locations";
import { getWorkspace } from "@/lib/data/workspaces";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { clockerBrandStyle } from "@/lib/workspace-presentation/derive";

// Resolve configured location identity on every request; never read customer
// configuration during static production generation.
export const dynamic = "force-dynamic";

export async function generateMetadata({params}:{params:Promise<{location:string}>}):Promise<Metadata>{
 const {location}=await params;return clockerLaunchMetadata(location);
}

export default async function ClockerPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: key } = await params;
  const location = await findActiveLocationByClockerKey(key);
  if (!location) notFound();
  const workspace = await getWorkspace();

  let pinEnabled = false;
  try { readPinKey(); pinEnabled = true; } catch { /* PIN setup stays unavailable until configured. */ }
  const brand = await currentBrand();
  // Direction B is the only Clocker presentation (Nov 8, 2026); the UI v2 flag is no longer read. Punch availability is
  // read through the central feature flags (development, Nov 15).
  return <ClockerSetup workspaceName={workspace.name} brand={{ style: clockerBrandStyle(brand.tokens), logoUrl: brand.logoUrl }} punchEnabled={readFeatureFlags(process.env).clockerPunch} pinEnabled={pinEnabled} locationKey={key} locationLabel={location.name} timeZone={workspace.timeZone} />;
}
