"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import { DEFAULT_WORDS, type WordSlots } from "@/lib/workspace-presentation/words";

/** Company modules and words (B2) for client components inside the portal.
 * Only hides entry points; pages, actions and APIs enforce on the server. */
type Presentation = { modules: EnabledModules; words: WordSlots };
const PresentationContext = createContext<Presentation>({ modules: ALL_MODULES_ON, words: DEFAULT_WORDS.en });

export function PresentationProvider({ modules, words, children }: { modules?: EnabledModules; words?: WordSlots; children: ReactNode }) {
  return <PresentationContext.Provider value={{ modules: modules ?? ALL_MODULES_ON, words: words ?? DEFAULT_WORDS.en }}>{children}</PresentationContext.Provider>;
}

export const usePresentation = () => useContext(PresentationContext);
