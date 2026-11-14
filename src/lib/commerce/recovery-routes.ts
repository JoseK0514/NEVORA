/** Presentation routing only. Every page and API retains its own authorization. */
export const RECOVERY_ROUTE_HEADER = 'x-nevora-recovery-route';
export function isCommerceRecoveryRoute(path: string | null): boolean {
  return path !== null && ['/app/billing', '/app/payroll-export', '/app/my-pay', '/app/pay', '/app/account/delete'].includes(path);
}

/** The deletion server action retains its session/password/limiter checks.
 * Billing availability must not prevent a person from requesting account deletion. */
export function isCommerceRecoveryRequest(path: string, method: string): boolean {
  return (method === 'GET' && isCommerceRecoveryRoute(path)) ||
    (method === 'POST' && path === '/app/account/delete');
}

export function clockerReturnPath(value:unknown):string|null {
 if(typeof value!=='string'||!value.startsWith('/clocker/'))return null;
 const key=value.slice('/clocker/'.length);
 return key.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)?value:null;
}
