'use client';

import { useRef, useState } from 'react';
import type { PortalLang } from '@/lib/i18n/portal-lang';

export function useProfileLanguageChange() {
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pick(language: PortalLang) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch('/api/account/language', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json', 'X-Nevora-Language-Preference': '1'},
        body: JSON.stringify({ language }),
        credentials: 'same-origin',
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Language preference unavailable');
      window.location.reload();
    } catch {
      saving.current = false;
      setBusy(false);
      setFailed(true);
    }
  }

  return { pick, busy, failed };
}
