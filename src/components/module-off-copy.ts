import { MODULES, type ModuleId } from "@/lib/workspace-presentation/modules";
import type { PortalLang } from "@/lib/i18n/portal-lang";

/* The module-off and release-hold screens. See docs/design/voice.md. */
const en = {
  // src/components/module-off.tsx:13
  heldTitle: (name: string) => `${name} are coming in a later release`,
  // src/components/module-off.tsx:14
  heldBody: (lower: string) => `NEVORA doesn’t offer ${lower} yet. Nothing has been deleted.`,
  // src/components/module-off.tsx:19
  offTitle: (name: string) => `${name} is turned off`,
  // src/components/module-off.tsx:20
  offBody: (workspace: string, lower: string) => `${workspace} doesn’t use ${lower} in NEVORA right now. Nothing has been deleted.`,
  // src/components/module-off.tsx:22
  turnOn: 'Turn it on in Settings',
  // src/components/module-off.tsx:23
  askManager: 'Ask your manager if you need it.',
  // src/components/module-off.tsx:15
  home: 'Back to Home ›',
  // src/lib/workspace-presentation/current.server.tsx:45
  company: 'Your company',
};

const es: typeof en = {
  // src/components/module-off.tsx:13
  heldTitle: name => `${name}: próximamente`,
  // src/components/module-off.tsx:14
  heldBody: lower => `NEVORA todavía no ofrece ${lower}. No se borró nada.`,
  // src/components/module-off.tsx:19
  offTitle: name => `Función desactivada: ${name}`,
  // src/components/module-off.tsx:20
  offBody: (workspace, lower) => `${workspace} no usa ${lower} en NEVORA ahora. No se borró nada.`,
  // src/components/module-off.tsx:22
  turnOn: 'Activar en Configuración',
  // src/components/module-off.tsx:23
  askManager: 'Pregúntale a tu gerente si lo necesitas.',
  // src/components/module-off.tsx:15
  home: 'Volver a Inicio ›',
  // src/lib/workspace-presentation/current.server.tsx:45
  company: 'Tu empresa',
};

export const MODULE_OFF_COPY = {en, es};

// src/lib/workspace-presentation/modules.ts, used by ModuleOff at src/components/module-off.tsx:8.
const spanishNames: Record<ModuleId, string> = {
  timeOff: 'Días libres',
  marketplace: 'Cambios de turno y cubiertas',
  updates: 'Avisos de la empresa',
  payStatements: 'Comprobantes de pago',
  breaks: 'Descansos en el Clocker',
};

export function moduleName(module: ModuleId, lang: PortalLang) {
  return lang === 'es' ? spanishNames[module] : MODULES.find(definition => definition.id === module)!.name;
}

export const copy = {
  en: {
    // src/components/module-off.tsx:11
    areComingInLaterRelease: '{name} are coming in a later release',
    // src/components/module-off.tsx:12
    nevoraDoesnRsquoTOfferYet: 'NEVORA doesn&rsquo;t offer {name} yet. Nothing has been deleted.',
    // src/components/module-off.tsx:13, src/components/module-off.tsx:22
    backHome: 'Back to Home ›',
    // src/components/module-off.tsx:17
    turnedOff: '{name} is turned off',
    // src/components/module-off.tsx:18
    doesnRsquoTUseInNevora: '{workspaceName} doesn&rsquo;t use {name} in NEVORA right now. Nothing has been deleted.',
    // src/components/module-off.tsx:20
    turnOnInSettings: 'Turn it on in Settings',
    // src/components/module-off.tsx:21
    askManagerIfNeed: 'Ask your manager if you need it.',
  },
  es: {
    // src/components/module-off.tsx:11
    areComingInLaterRelease: '{name} viene en un lanzamiento posterior',
    // src/components/module-off.tsx:12
    nevoraDoesnRsquoTOfferYet: 'NEVORA doesns&rsquo;t ofrecen {name} todavía. Nada ha sido eliminado',
    // src/components/module-off.tsx:13, src/components/module-off.tsx:22
    backHome: 'Volver a casa ›',
    // src/components/module-off.tsx:17
    turnedOff: '{name} está apagado',
    // src/components/module-off.tsx:18
    doesnRsquoTUseInNevora: '{workspaceName} doess&rsquo;t utilizar {name} en NEVORA en este momento. Nada ha sido eliminado',
    // src/components/module-off.tsx:20
    turnOnInSettings: 'Enciéndelo en Configuración',
    // src/components/module-off.tsx:21
    askManagerIfNeed: 'Pregúntale a tu gerente si lo necesita',
  },
} as const;
