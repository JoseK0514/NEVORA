export const copy = {
  en: {
    // src/components/corp/corp-motion.tsx:19
    cTabsDataCTabsC: '.c-tabs, [data-c-tabs], .c-pay-tabs, .c-tc-tabs, .app-shell[data-nv-clean] .page-frame > .section-tabs .section-tabs-track',
    // src/components/corp/corp-motion.tsx:22
    scopeAriaCurrentPageAriaCurrent: ':scope > :is([aria-current="page"], [aria-current="true"], [aria-pressed="true"], [aria-selected="true"])',
    // src/components/corp/corp-motion.tsx:55, src/components/corp/corp-motion.tsx:119
    before: '::before',
    // src/components/corp/corp-motion.tsx:55
    after: '::after',
  },
  es: {
    // src/components/corp/corp-motion.tsx:19
    cTabsDataCTabsC: '.c-tabs, [data-c-tabs], .c-pay-tabs, .c-tc-tabs, .app-shell[data-nv-clean] .frame-page > .section-tabs .section-tabs-track',
    // src/components/corp/corp-motion.tsx:22
    scopeAriaCurrentPageAriaCurrent: ':alcance > :es([aria-current="página"], [aria-current="verdadero"], [aria-presionado="verdadero"], [aria-seleccionado="verdadero"])',
    // src/components/corp/corp-motion.tsx:55, src/components/corp/corp-motion.tsx:119
    before: '::antes',
    // src/components/corp/corp-motion.tsx:55
    after: '::después',
  },
} as const;
