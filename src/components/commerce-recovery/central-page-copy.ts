// Public plans uses the same tab titles as the dedicated English and Spanish billing links.
export const copy = {
  en: {
    // src/components/commerce-recovery/central-page.tsx:7
    title: 'Plan and billing · NEVORA',
    // src/lib/brand.ts:13
    description: 'Workforce scheduling and operations',
    // src/components/commerce-recovery/central.tsx:13 (collab)
    entry: 'Open Billing from your signed-in workplace Owner account to continue.',
    // src/components/commerce-recovery/central.tsx:14 (collab)
    signIn: 'Back to NEVORA sign-in',
  },
  es: {
    // src/components/commerce-recovery/central-page.tsx:8
    title: 'Plan y facturación · NEVORA',
    // src/lib/brand.ts:13
    description: 'Horarios y operaciones del personal',
    // src/components/commerce-recovery/central.tsx:13 (collab)
    entry: 'Para continuar, abre Facturación desde tu cuenta de Admin.',
    // src/components/commerce-recovery/central.tsx:14 (collab)
    signIn: 'Iniciar sesión',
  },
} as const;
