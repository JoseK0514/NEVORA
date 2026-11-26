/** Substitute each field once, so braces and dollar signs in people's names stay literal. */
export function formatPortalCopy(template: string, fields: Readonly<Record<string, string | number | null | undefined>>) {
  return template.replace(/\{(\w+)\}/g, (original, key: string) =>
    Object.hasOwn(fields, key) ? String(fields[key] ?? '') : original);
}
