"use client";

import { useSyncExternalStore } from "react";
import type { AuthCopy } from "@/lib/auth-copy";

type Greetings = AuthCopy["greeting"];

/** Good morning 5:00–11:59, Good afternoon 12:00–16:59, Good evening otherwise, from the device clock. */
export function greetingFor(hour: number, words: Greetings): string {
  return hour >= 5 && hour < 12 ? words.morning : hour >= 12 && hour < 17 ? words.afternoon : words.evening;
}

const subscribe = () => () => {};
const currentHour = () => new Date().getHours();
const serverHour = () => -1;

/** The server renders "Welcome back"; after hydration the device's hour picks the greeting, so there is no mismatch
 * and never a blank title. */
export function Greeting({ words, id, as = "h1", className = "ap-title", mobileTitle }: { words: Greetings; id?: string; /** "p" for the phone band's copy (the sheet keeps the h1). */ as?: "h1" | "p"; className?: string; mobileTitle?: string }) {
  const hour = useSyncExternalStore(subscribe, currentHour, serverHour);
  const Tag = as;
  return <Tag className={className} id={id}>{mobileTitle ? <><span className="ma-only">{mobileTitle}</span><span className="ma-desktop">{hour < 0 ? words.welcome : greetingFor(hour, words)}</span></> : hour < 0 ? words.welcome : greetingFor(hour, words)}</Tag>;
}
