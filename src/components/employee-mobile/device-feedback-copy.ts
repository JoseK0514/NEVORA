import type { PortalLang } from '@/lib/i18n/portal-lang';
import { deviceAlertsCopy } from './device-alerts-copy';

export const deviceFeedbackCopy = {
  en: {
    // src/lib/notifications/device-client.ts:53
    accessChanged: 'Account or device ownership changed. Reload NEVORA to check this session.',
    // src/lib/notifications/device-client.ts:76
    unavailable: 'Device setup is unavailable. Retry, or turn off notifications if cleanup is pending.',
    // src/lib/notifications/device-client.ts:144
    storage: 'Device setup cannot safely coordinate this browser. Check browser storage and try again.',
    // src/lib/notifications/device-client.ts:148
    permission: 'Permission could not be requested. Check your browser settings.',
    // src/lib/notifications/device-client.ts:171
    enabled: 'Notifications enabled on this device.',
    // src/lib/notifications/device-client.ts:178
    setupFailed: 'Setup could not finish. Turn off stops server delivery. If reopening does not help, this browser notification setup may need recovery. Ask your manager for help.',
    // src/lib/notifications/device-client.ts:185
    dismissed: 'Could not remember Not Now on this device. Browser storage may be unavailable.',
    // src/lib/notifications/device-client.ts:192
    changed: 'Device setup changed. Check again before turning alerts off.',
    // src/lib/notifications/device-client.ts:212
    turnedOff: 'Notifications turned off on this device.',
    // src/lib/notifications/device-client.ts:216
    reminder: ' This browser couldn’t save the recovery reminder.',
    // src/lib/notifications/device-client.ts:223
    queuing: 'Queuing test…',
    // src/lib/notifications/device-client.ts:228
    queued: 'Test queued. Provider acceptance does not confirm receipt. Wait five minutes before another test.',
    // src/lib/notifications/device-client.ts:231
    testUnavailable: 'Test unavailable or rate limited. Wait five minutes, then reload NEVORA to check again.',
    // src/components/employee-mobile/device-owner.tsx:41
    installAccepted: 'Install request accepted. Open NEVORA from its icon to check setup.',
    // src/components/employee-mobile/device-owner.tsx:41
    installPostponed: 'Install postponed. You can use your browser menu later.',
    // src/components/employee-mobile/device-owner.tsx:41
    installUnavailable: 'Use your browser menu to add NEVORA to your Home Screen.',
  },
  es: {
    // src/lib/notifications/device-client.ts:53
    accessChanged: 'Cambió el acceso a la cuenta o al dispositivo. Vuelve a cargar NEVORA para verificar tu sesión.',
    // src/lib/notifications/device-client.ts:76
    unavailable: 'La configuración del dispositivo no está disponible. Inténtalo de nuevo o desactiva las notificaciones si la desactivación sigue pendiente.',
    // src/lib/notifications/device-client.ts:144
    storage: 'No pudimos configurar este navegador de forma segura. Verifica el almacenamiento del navegador e inténtalo de nuevo.',
    // src/lib/notifications/device-client.ts:148
    permission: 'No pudimos pedir permiso. Verifica la configuración del navegador.',
    // src/lib/notifications/device-client.ts:171
    enabled: 'Se activaron las notificaciones en este dispositivo.',
    // src/lib/notifications/device-client.ts:178
    setupFailed: 'La configuración quedó incompleta. Si las desactivas, NEVORA deja de enviar alertas. Si volver a abrir NEVORA no resuelve el problema, quizás tengas que corregir la configuración de las notificaciones del navegador. Pídele ayuda a tu gerente.',
    // src/lib/notifications/device-client.ts:185
    dismissed: 'No pudimos guardar «Ahora no» en este dispositivo. El almacenamiento del navegador quizás no esté disponible.',
    // src/lib/notifications/device-client.ts:192
    changed: 'La configuración del dispositivo cambió. Verifica de nuevo antes de desactivar las alertas.',
    // src/lib/notifications/device-client.ts:212
    turnedOff: 'Se desactivaron las notificaciones en este dispositivo.',
    // src/lib/notifications/device-client.ts:216
    reminder: ' Este navegador no pudo guardar el recordatorio para retomar la desactivación.',
    // src/lib/notifications/device-client.ts:223
    queuing: 'Preparando notificación de prueba…',
    // src/lib/notifications/device-client.ts:228
    queued: 'La prueba está en cola. Aunque el proveedor la haya aceptado, puede que no te llegue. Espera cinco minutos antes de hacer otra prueba.',
    // src/lib/notifications/device-client.ts:231
    testUnavailable: 'La prueba no está disponible o alcanzaste el límite. Espera cinco minutos y vuelve a cargar NEVORA para verificar.',
    // src/components/employee-mobile/device-owner.tsx:41
    installAccepted: 'Se aceptó la instalación. Abre NEVORA desde su ícono para verificar la configuración.',
    // src/components/employee-mobile/device-owner.tsx:41
    installPostponed: 'La instalación queda para después. Puedes usar el menú del navegador cuando quieras.',
    // src/components/employee-mobile/device-owner.tsx:41
    installUnavailable: 'Usa el menú del navegador para añadir NEVORA a tu pantalla de inicio.',
  },
} as const;

export function deviceFeedback(message: string, lang: PortalLang): string {
  if (lang === 'en') return message;
  const { en, es } = deviceFeedbackCopy;
  const pending = deviceAlertsCopy.en.turnOffPending;
  if (message === pending) return deviceAlertsCopy.es.turnOffPending;
  if (message === pending + en.reminder) return deviceAlertsCopy.es.turnOffPending + es.reminder;
  const key = (Object.keys(en) as (keyof typeof en)[]).find(key => en[key] === message);
  return key ? es[key] : message;
}
