export const accountDeletionCopy = {
  en: {
    // src/app/app/account/delete/page.tsx:11
    deleteAccount: 'Delete account',
    // src/lib/legal/policies.ts:22 (displayed on the signed-in screen)
    period: '30 calendar days after we receive the request',
    // src/app/app/account/delete/page.tsx:9
    roles: { OWNER: 'Owner', MANAGER: 'Manager', LEAD: 'Lead', EMPLOYEE: 'Employee' },
  },
  es: {
    // src/app/app/account/delete/page.tsx:11
    deleteAccount: 'Eliminar cuenta',
    // src/lib/legal/policies.ts:22 (displayed on the signed-in screen)
    period: '30 días calendario después de recibir la solicitud',
    // src/app/app/account/delete/page.tsx:9
    roles: { OWNER: 'Dueño', MANAGER: 'Gerente', LEAD: 'Líder', EMPLOYEE: 'Empleado' },
  },
} as const;

export const copy = {
  en: {
    // src/app/app/account/delete/page.tsx:9
    owner: 'Owner',
    // src/app/app/account/delete/page.tsx:9
    manager: 'Manager',
    // src/app/app/account/delete/page.tsx:9
    lead: 'Lead',
    // src/app/app/account/delete/page.tsx:9
    employee: 'Employee',
    // src/app/app/account/delete/page.tsx:11
    deleteAccount: 'Delete account',
  },
  es: {
    // src/app/app/account/delete/page.tsx:9
    owner: 'Dueño',
    // src/app/app/account/delete/page.tsx:9
    manager: 'Gerente',
    // src/app/app/account/delete/page.tsx:9
    lead: 'Líder',
    // src/app/app/account/delete/page.tsx:9
    employee: 'Empleado',
    // src/app/app/account/delete/page.tsx:11
    deleteAccount: 'Eliminar cuenta',
  },
} as const;
