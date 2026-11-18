/** Read this response's diagnostic reference without consuming its domain body.
 * No fallback to operation/deletion IDs and no reference retained between calls. */
export function readSupportReference(response: Pick<Response,'headers'>):string|null {
 const reference=response.headers.get('X-Nevora-Request-Id');
 return reference!==null&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(reference)?reference:null;
}
