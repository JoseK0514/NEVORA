export const RESTRICTED_COPY = {
  en: {
    // page.tsx:7 (collab)
    managerTitle: 'That page is for Owners',
    // page.tsx:7 (collab)
    otherTitle: 'That page is for Owners and Managers',
    // page.tsx:20 (collab)
    help: 'Ask your Owner if you need access.',
    // page.tsx:20 (collab)
    home: 'Go to Home',
  },
  es: {
    // page.tsx:7 (collab)
    managerTitle: 'Esa página es para dueños',
    // page.tsx:7 (collab)
    otherTitle: 'Esa página es para dueños y gerentes',
    // page.tsx:20 (collab)
    help: 'Pídele acceso al dueño si lo necesitas.',
    // page.tsx:20 (collab)
    home: 'Ir a Inicio',
  },
} as const;

export const copy = {
  en: {
    // src/app/app/restricted/page.tsx:8
    pageOwners: 'That page is for Owners',
    // src/app/app/restricted/page.tsx:8
    pageOwnersManagers: 'That page is for Owners and Managers',
    // src/app/app/restricted/page.tsx:23
    help: 'Ask your Owner if you need access.',
  },
  es: {
    // src/app/app/restricted/page.tsx:8
    pageOwners: 'Esa página es para dueños',
    // src/app/app/restricted/page.tsx:8
    pageOwnersManagers: 'Esa página es para dueños y administradores',
    // src/app/app/restricted/page.tsx:23
    help: 'Pregúntale a tu dueño si necesitas acceso',
  },
} as const;
