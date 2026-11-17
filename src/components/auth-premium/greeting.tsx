"use client";

import { useSyncExternalStore } from "react";
import type { AuthCopy } from "@/lib/auth-copy";

type Greetings = AuthCopy["greeting"];

/** Good morning 5:00–11:59, Good afternoon from 12:00 until the language's evening hour (English 5 PM; Spanish 7 PM, as
 * "Buenas tardes" is said in Puerto Rico: inspection Nov 14, PB-019), Good evening otherwise, from the device clock. */
export function greetingFor(hour: number, words: Greetings): string {
  return hour >= 5 && hour < 12 ? words.morning : hour >= 12 && hour < words.eveningFrom ? words.afternoon : words.evening;
}

const subscribe = () => () => {};
const currentHour = () => new Date().getHours();
const serverHour = () => -1;

/** The server renders "Welcome back"; after hydration the device's hour picks the greeting, so there is no mismatch
 * and never a blank title.
 * Phase 5 (Nov 17, 2026, PB-036): the title no longer changes under the reader. `data-greeting` says where it is:
 * "pending" (the server's words, held out of sight for a moment by auth-b.css so the hour's greeting is the first one
 * read; without JavaScript they show after that moment), "ready" (the hour's greeting, faded in when motion is allowed)
 * or "first" (someone arriving from activation: "Welcome", the same on the server and after, so nothing swaps). The
 * line keeps its height throughout. */
export function Greeting({ words, id, as = "h1", className = "ap-title", mobileTitle, first = false }: { words: Greetings; id?: string; /** "p" for the phone band's copy (the sheet keeps the h1). */ as?: "h1" | "p"; className?: string; mobileTitle?: string;
  /** Straight from activation: a first sign-in, greeted once and never swapped. */ first?: boolean }) {
  const hour = useSyncExternalStore(subscribe, currentHour, serverHour);
  const Tag = as;
  const text = first ? words.first : hour < 0 ? words.welcome : greetingFor(hour, words);
  const state = first ? "first" : hour < 0 ? "pending" : "ready";
  return mobileTitle
    ? <Tag className={className} id={id}><span className="ma-only">{mobileTitle}</span><span className="ma-desktop" data-greeting={state}>{text}</span></Tag>
    : <Tag className={className} id={id} data-greeting={state}>{text}</Tag>;
}
