/** Renderer policy complements platform URL callbacks, including redirects.
 * All application assets/logo reads stay same-origin. Temporary image previews
 * may use data/blob URLs; those schemes never become navigable backends.
 */
export function nativeContentSecurityPolicy(development: boolean): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "font-src 'self'", "connect-src 'self'", "worker-src 'self'",
    "frame-src 'none'", "object-src 'none'", "base-uri 'none'",
    "form-action 'self'", "frame-ancestors 'none'",
  ].join('; ');
}
