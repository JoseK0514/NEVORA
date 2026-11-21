import type { Icon, IconProps } from "@phosphor-icons/react";

type TopicIconProps = Pick<IconProps, "size" | "className"> & { glyph: Icon };

/** Four units on Phosphor's 256-unit grid add a quarter pixel at 16px. */
export function TopicIcon({ glyph: Glyph, size, className }: TopicIconProps) {
  return <Glyph weight="duotone" size={size} className={className} color="currentColor"
    stroke="currentColor" strokeWidth={4} strokeLinejoin="round" aria-hidden="true" focusable="false" />;
}
