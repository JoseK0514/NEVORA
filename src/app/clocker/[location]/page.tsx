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
  return <ClockerSetup brand={{ style: clockerBrandStyle(brand.tokens), logoUrl: brand.logoUrl }} punchEnabled={process.env.NEVORA_CLOCKER_PUNCH_ENABLED === 'true'} pinEnabled={pinEnabled} locationKey={key} locationLabel={location.name} timeZone={workspace.timeZone} />;
}
