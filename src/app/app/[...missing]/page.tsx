import { notFound } from "next/navigation";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { HOME_PAGE_COPY } from "../home-page-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: HOME_PAGE_COPY[await readPageLang()].notFound }; }

/** Nov 1 upscale (kit consistency 9): an /app address that matches no page renders the in-app 404 (app/app/not-found.tsx)
 * inside the signed-in shell, instead of the public sign-in style 404. Every real page is a more specific route, so this
 * matches only what would otherwise be unknown. */
export default function MissingPage(): never {
  notFound();
}
