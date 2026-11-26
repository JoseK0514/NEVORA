/** Owner and Manager screens name people by first name and last initial ("Ana R."). */
export function shortPersonName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
}
