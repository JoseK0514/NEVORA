"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep the original compact layout only when the rendered labels fit it. */
export function ScheduleLocationControl({
  children,
  dense = false,
}: {
  children: ReactNode;
  dense?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // IS-29: the selected location is scrolled into its row on load, so it is never off screen.
  useLayoutEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>("a.selected, a[aria-current]");
    const row = selected?.closest<HTMLElement>(".segmented");
    if (!selected || !row || row.scrollWidth <= row.clientWidth) return;
    const start = selected.offsetLeft - row.offsetLeft, end = start + selected.offsetWidth;
    if (start >= row.scrollLeft && end <= row.scrollLeft + row.clientWidth - 28) return;
    row.scrollLeft = start < row.scrollLeft ? Math.max(0, start - 4) : end - row.clientWidth + 28;
  });

  useLayoutEffect(() => {
    const control = ref.current;
    const toolbar = control?.closest<HTMLElement>(".schedule-operations-toolbar");
    if (!control || !toolbar) return;

    let disposed = false;
    const measure = () => {
      if (disposed) return;
      // Synchronous measurement restores the chosen layout before paint. It
      // does not replace nodes, change selection, or move keyboard focus.
      control.dataset.expandedLocations = "false";
      // Every sibling region owns its space, including the central week
      // selector. Checking only command buttons misses text beneath that panel.
      const peers = Array.from(toolbar.children)
        .filter((element) => element !== control)
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const viewportWidth = document.documentElement.clientWidth;
      const expanded = Array.from(control.querySelectorAll("a")).some((link) => {
        const box = link.getBoundingClientRect();
        // Wrapped labels can safely make the inherited compact control taller
        // than adjacent actions. Measure containment and glyph intersections,
        // not equality with an unrelated button's height.
        if (box.left < 0 || box.right > viewportWidth) {
          return true;
        }
        const range = document.createRange();
        range.selectNodeContents(link);
        return Array.from(range.getClientRects()).some((text) =>
          text.left < box.left - 1 || text.right > box.right + 1 ||
          text.top < box.top - 1 || text.bottom > box.bottom + 1 ||
          peers.some((peer) =>
            text.left < peer.right && text.right > peer.left &&
            text.top < peer.bottom && text.bottom > peer.top,
          ),
        );
      });
      control.dataset.expandedLocations = String(expanded);
    };

    measure();
    const links = Array.from(control.querySelectorAll("a"));
    const dimensions = () => [
      toolbar.getBoundingClientRect().width,
      ...links.flatMap((link) => {
        const box = link.getBoundingClientRect();
        return [box.width, box.height];
      }),
    ].join(",");
    let previousDimensions = dimensions();
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      if (dimensions() !== previousDimensions && !animationFrame) {
        // Layout writes inside observer delivery can trigger WebKit loop errors.
        animationFrame = requestAnimationFrame(() => {
          animationFrame = 0;
          measure();
          previousDimensions = dimensions();
        });
      }
    });
    observer.observe(toolbar);
    links.forEach((link) => observer.observe(link));
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    window.addEventListener("resize", measure);
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      document.fonts.removeEventListener("loadingdone", measure);
      window.removeEventListener("resize", measure);
    };
  }, [children]);

  return (
    <div
      ref={ref}
      className="schedule-location-control"
      aria-label="Schedule location"
      data-expanded-locations="true"
      data-dense-locations={String(dense)}
    >
      {children}
    </div>
  );
}
