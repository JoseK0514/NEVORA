import { notFound } from "next/navigation";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Page not found" };

/** Nov 1 upscale (kit consistency 9): an /app address that matches no page renders the in-app 404 (app/app/not-found.tsx)
 * inside the signed-in shell, instead of the public sign-in style 404. Every real page is a more specific route, so this
 * matches only what would otherwise be unknown. */
export default function MissingPage(): never {
  notFound();
}
