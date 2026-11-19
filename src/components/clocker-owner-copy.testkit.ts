// Test helpers for the Owner's Clocker settings: the words a rendered screen shows, and a check that a Spanish render
// leaks no English sentence from the copy module. Not imported by any page.
import {clockerOwnerCopy} from './clocker-owner-copy';

/** The visible and accessible words of rendered markup: text, aria-labels and placeholders, tags removed. */
export function wordsOf(html: string): string {
  const attributes = [...html.matchAll(/(?:aria-label|placeholder)="([^"]*)"/g)].map(match => match[1]).join(' \n ');
  return `${html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' \n ')} \n ${attributes}`
    .replace(/&#x27;|&apos;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

type Value = string | string[] | ((...args: never[]) => string);
const strings = (value: Value): string[] => typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
/** Proper names and words that are the same in both languages. */
const SAME = new Set(['Clocker', 'PIN']);

/** Every English sentence of the copy module that appears in the markup although its Spanish line differs. */
export function englishIn(html: string): string[] {
  const words = wordsOf(html), found: string[] = [];
  for (const key of Object.keys(clockerOwnerCopy.en) as (keyof typeof clockerOwnerCopy.en)[]) {
    const english = strings(clockerOwnerCopy.en[key] as Value), spanish = strings(clockerOwnerCopy.es[key] as Value);
    english.forEach((line, index) => {
      if (line === spanish[index] || SAME.has(line)) return;
      const pattern = new RegExp(`(^|[^\\p{L}])${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u');
      if (pattern.test(words)) found.push(`${String(key)}: ${line}`);
    });
  }
  return found;
}
