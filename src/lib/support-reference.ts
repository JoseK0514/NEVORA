/** Content-free diagnostic reference from this response only; never an operation or customer identifier. */
export function readSupportReference(response: Pick<Response, "headers">): string | null {
  try {
    const value = response.headers.get("X-Nevora-Request-Id");
    return value && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value) ? value : null;
  } catch { return null; }
}
