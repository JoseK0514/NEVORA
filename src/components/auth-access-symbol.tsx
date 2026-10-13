import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { IdentificationBadgeIcon } from "@phosphor-icons/react/dist/ssr/IdentificationBadge";

export function AuthAccessSymbol({ kind }: { kind: "recovery" | "activation" }) {
  const Icon = kind === "recovery" ? LockKeyIcon : IdentificationBadgeIcon;
  return <span className="login-access-symbol" aria-hidden="true">
    <Icon size={24} weight="duotone" focusable="false" />
  </span>;
}
