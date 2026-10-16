import { cache } from "react";
import { getWorkspace } from "../data/workspaces";
import { readActiveBrand, type ActiveBrand } from "./service";

/** The active company brand for this request, read once and shared by the
 * layout and its viewport. Never throws: any failure renders NEVORA teal. */
export const currentBrand = cache(async (): Promise<ActiveBrand & { logoUrl: string | null }> => {
  try {
    const brand = await readActiveBrand((await getWorkspace()).id);
    return { ...brand, logoUrl: brand.logoAssetId ? `/api/workspace-presentation/logo/${brand.logoAssetId}` : null };
  } catch {
    return { style: undefined, tokens: null, logoAssetId: null, revision: 0, logoUrl: null };
  }
});
