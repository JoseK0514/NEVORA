"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ActionMenuProps = {
  id: string;
  label: string;
  ariaLabel?: string;
  children: ReactNode;
  align?: "start" | "end";
};

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 8;
const PREFERRED_WIDTH = 318;

export function ActionMenu({
  id,
  label,
  ariaLabel,
  children,
  align = "end",
}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const position = () => {
      if (!menu.matches(":popover-open")) return;
      const triggerBox = trigger.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const width = Math.max(
        0,
        Math.min(PREFERRED_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2),
      );
      const naturalHeight = menu.scrollHeight;
      const spaceBelow =
        viewportHeight - triggerBox.bottom - VIEWPORT_MARGIN - MENU_GAP;
      const spaceAbove =
        triggerBox.top - VIEWPORT_MARGIN - MENU_GAP;
      const openAbove =
        naturalHeight > spaceBelow && spaceAbove > spaceBelow;
      const available = Math.max(
        120,
        openAbove ? spaceAbove : spaceBelow,
      );
      const desiredLeft =
        align === "end" ? triggerBox.right - width : triggerBox.left;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, desiredLeft),
        Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
      );

      menu.style.width = `${width}px`;
      menu.style.left = `${Math.round(left)}px`;
      menu.style.maxHeight = `${Math.max(120, Math.floor(available))}px`;

      if (openAbove) {
        menu.style.top = "auto";
        menu.style.bottom = `${Math.max(
          VIEWPORT_MARGIN,
          Math.round(viewportHeight - triggerBox.top + MENU_GAP),
        )}px`;
      } else {
        menu.style.bottom = "auto";
        menu.style.top = `${Math.max(
          VIEWPORT_MARGIN,
          Math.round(triggerBox.bottom + MENU_GAP),
        )}px`;
      }
    };

    const onBeforeToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== "open") return;
      // Set a safe horizontal size before the popover reaches the top layer.
      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.max(
        0,
        Math.min(PREFERRED_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2),
      );
      const box = trigger.getBoundingClientRect();
      const desiredLeft = align === "end" ? box.right - width : box.left;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, desiredLeft),
        Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
      );
      menu.style.width = `${width}px`;
      menu.style.left = `${Math.round(left)}px`;
    };
    const onToggle = () => position();

    menu.addEventListener("beforetoggle", onBeforeToggle);
    menu.addEventListener("toggle", onToggle);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);

    return () => {
      menu.removeEventListener("beforetoggle", onBeforeToggle);
      menu.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [align]);

  return (
    <div className="nevora-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="button ghost nevora-action-menu-trigger"
        popoverTarget={id}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        <svg
          className="nevora-action-menu-chevron"
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>
      <div
        ref={menuRef}
        id={id}
        className={`nevora-action-menu-popover align-${align}`}
        popover="auto"
        aria-label={ariaLabel ?? `${label} actions`}
      >
        {children}
      </div>
    </div>
  );
}
