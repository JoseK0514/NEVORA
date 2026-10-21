"use client";
import { isPopoverOpen, hidePopover, showPopover } from "./kit/popover-open";

import { useEffect, useRef, type ReactNode } from "react";
import { actionMenuGeometry } from "./action-menu-geometry";
import { DotsThreeIcon, XIcon } from "@phosphor-icons/react/ssr";

type ActionMenuProps = {
  id: string;
  label: string;
  ariaLabel?: string;
  children: ReactNode;
  align?: "start" | "end";
  triggerIcon?: ReactNode;
  iconOnly?: boolean;
  /** Replaces the default trigger look, e.g. for a tab-bar More button. */
  triggerClassName?: string;
  triggerContent?: ReactNode;
  /** A full sheet (the Owner and Manager More): announced as a modal dialog, and focus moves into it however it opens. */
  sheet?: boolean;
};

export function ActionMenu({
  id,
  label,
  ariaLabel,
  children,
  align = "end",
  triggerIcon,
  iconOnly = false,
  triggerClassName,
  triggerContent,
  sheet = false,
}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const keyboardOpenRef = useRef(false);

  useEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const visibleViewport = () => ({
      width: window.visualViewport?.width ?? document.documentElement.clientWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
      offsetLeft: window.visualViewport?.offsetLeft ?? 0,
      offsetTop: window.visualViewport?.offsetTop ?? 0,
    });
    const position = () => {
      if (!isPopoverOpen(menu)) return;
      const triggerBox = trigger.getBoundingClientRect();
      const viewport = visibleViewport();
      if (getComputedStyle(menu).getPropertyValue('--home-menu-sheet').trim() === '1') {
        menu.style.width = `${Math.max(0, viewport.width - 32)}px`;
        menu.style.left = `${viewport.offsetLeft + 16}px`;
        menu.style.maxHeight = `${Math.max(44, viewport.height - 96)}px`;
        menu.style.top = 'auto';
        menu.style.bottom = `${Math.max(16, window.innerHeight - viewport.offsetTop - viewport.height + 16)}px`;
        return;
      }
      // Wrapping changes the natural height after a viewport resize.
      menu.style.width = `${actionMenuGeometry({ trigger: triggerBox, viewport, naturalHeight: 0, align }).width}px`;
      const geometry = actionMenuGeometry({
        trigger: triggerBox,
        viewport,
        naturalHeight: menu.scrollHeight + menu.offsetHeight - menu.clientHeight,
        align,
      });
      menu.style.width = `${geometry.width}px`;
      menu.style.left = `${geometry.left}px`;
      menu.style.maxHeight = `${geometry.maxHeight}px`;
      menu.style.bottom = "auto";
      menu.style.top = `${geometry.top}px`;
    };

    const onBeforeToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== "open") return;
      // Set a safe horizontal size before the popover reaches the top layer.
      const geometry = actionMenuGeometry({
        trigger: trigger.getBoundingClientRect(),
        viewport: visibleViewport(),
        naturalHeight: 0,
        align,
      });
      menu.style.width = `${geometry.width}px`;
      menu.style.left = `${geometry.left}px`;
    };
    const onToggle = () => {
      position();
      if (!isPopoverOpen(menu)) {
        keyboardOpenRef.current = false;
        return;
      }
      if (!keyboardOpenRef.current && !sheet) return;
      // The toggle event runs after the popover opens. Keyboard focus must
      // not wait for a paint that a busy/background document can defer.
      const first = menu.querySelector<HTMLElement>(
        'a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      first?.focus({ preventScroll: true });
      keyboardOpenRef.current = false;
    };

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
  }, [align, sheet]);

  return (
    <div className="nevora-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName ?? "button ghost nevora-action-menu-trigger"}
        popoverTarget={id}
        aria-label={ariaLabel ?? label}
        title={ariaLabel ?? label}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            keyboardOpenRef.current = true;
          }
        }}
        onPointerDown={() => {
          keyboardOpenRef.current = false;
        }}
      >
        {triggerContent ?? <>{triggerIcon}
        {!iconOnly ? <DotsThreeIcon className="mobile-workforce-action-symbol" size={24} weight="regular" aria-hidden="true"/> : null}
        <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
        {!iconOnly ? <svg
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
        </svg> : null}</>}
      </button>
      <div
        ref={menuRef}
        id={id}
        className={`nevora-action-menu-popover align-${align}`}
        popover="auto"
        role={sheet ? "dialog" : undefined}
        aria-modal={sheet || undefined}
        aria-label={ariaLabel ?? `${label} actions`}
      >
        {children}
        <button className="mobile-workforce-sheet-close" type="button" aria-label="Close"
          onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
          <XIcon size={20} aria-hidden="true"/><span>Close</span>
        </button>
      </div>
    </div>
  );
}
