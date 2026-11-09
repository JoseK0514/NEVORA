import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";

export function AuthDisclosureSymbol() {
  return <span className="auth-disclosure-symbol" aria-hidden="true">
    <PlusIcon className="auth-disclosure-closed" size={16} weight="regular" focusable="false" />
    <MinusIcon className="auth-disclosure-open" size={16} weight="regular" focusable="false" />
  </span>;
}
