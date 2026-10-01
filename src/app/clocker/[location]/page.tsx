import { notFound } from "next/navigation";
import { ClockerKiosk } from "@/components/clocker-kiosk";
import { kioskLocationLabel } from "@/lib/clocker-kiosk";

export function generateStaticParams() {
  return [{ location: "2" }, { location: "110" }];
}

export default async function ClockerPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const locationLabel = kioskLocationLabel(location);

  if (!locationLabel) notFound();

  return <ClockerKiosk locationLabel={locationLabel} />;
}
