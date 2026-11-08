/** Reject libpq-style query overrides before passing a URL to pg. Error objects contain no input secrets. */
export function parsePostgresUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Error("invalid_database_target");
  }
  const keys = [...url.searchParams.keys()];
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname.slice(1) ||
    url.hash ||
    url.hostname.includes("%") ||
    keys.some((key) => !["sslmode", "channel_binding"].includes(key)) ||
    new Set(keys).size !== keys.length
  )
    throw Error("invalid_database_target");
  return url;
}
