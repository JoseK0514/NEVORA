"use client";
import { isPopoverOpen } from "./kit/popover-open";

import { useEffect, useRef, type ReactNode } from "react";
import { actionMenuGeometry } from "./action-menu-geometry";
import { CaretDownIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";

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
  /** The phone sheet's header title ("Schedule options", "Location"); defaults to the label. */
  title?: string;
  /** The popover's preferred width on wider screens (default 318px; the account menu uses 240px). */
  width?: number;
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
  title,
  width,
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
      menu.style.width = `${actionMenuGeometry({ trigger: triggerBox, viewport, naturalHeight: 0, align, preferredWidth: width }).width}px`;
      const geometry = actionMenuGeometry({
        trigger: triggerBox,
        viewport,
        naturalHeight: menu.scrollHeight + menu.offsetHeight - menu.clientHeight,
        align,
        preferredWidth: width,
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
        preferredWidth: width,
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
  }, [align, sheet, width]);

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
        {/* Owner premium (visual-craft M): the Phosphor caret, 16px, like every other inline chevron. */}
        {!iconOnly ? <CaretDownIcon className="nevora-action-menu-chevron" size={16} aria-hidden="true" /> : null}</>}
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
        {/* Owner premium (phone-native M4, visual-craft O): on a phone the menu is a sheet with a titled header and Done.
          The header is hidden wherever the menu is a popover (CSS), so desktop menus are unchanged. */}
        <div className="c-menu-head" aria-hidden="true">
          <span className="c-menu-head__title">{title ?? label}</span>
        </div>
        {children}
        {/* Round 2 (R8): one sheet pattern, "Done" on the right of the centred title (Close and its × retired). */}
        <button className="mobile-workforce-sheet-close" type="button"
          onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}
