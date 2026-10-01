import type { UserRole } from "./domain";

export type MarketplaceView = "available" | "requests";

export function marketplaceView(value?: string): MarketplaceView {
  if (["requests", "my", "history"].includes(value ?? "")) {
    return "requests";
  }

  return "available";
}

export function marketplaceRoleLabel(role: UserRole) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "LEAD") return "Lead Barista";
  return "Barista";
}

export function marketplaceDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";

  return `${parts[0]} ${parts.at(-1)?.[0] ?? ""}.`;
}
