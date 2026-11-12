/** Presentation routing only. Every page and API retains its own authorization. */
export const RECOVERY_ROUTE_HEADER = 'x-nevora-recovery-route';
export function isCommerceRecoveryRoute(path: string | null): boolean {
  return path !== null && ['/app/billing', '/app/payroll-export', '/app/my-pay', '/app/pay'].includes(path);
}

export function clockerReturnPath(value:unknown):string|null {
 if(typeof value!=='string'||!value.startsWith('/clocker/'))return null;
 const key=value.slice('/clocker/'.length);
 return key.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)?value:null;
}
