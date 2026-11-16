/* Faces: initials on one of six soft tints, picked from the name so a person keeps their colour on every screen
 * (Direction B's BAvatar and the corporate CorpAvatar share it). */
export const FACE_TINTS = [["#E4ECF7", "#2C4A7A"], ["#E7F2EC", "#22603F"], ["#EEE7F7", "#5B3D8F"], ["#F6EBE1", "#7A4A22"], ["#FBE8EC", "#8A2E44"], ["#E6F0F6", "#1F5670"]] as const;
export function faceTint(name: string): readonly [string, string] {
  let hash = 0; for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FACE_TINTS[hash % FACE_TINTS.length];
}
