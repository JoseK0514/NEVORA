import { describe, expect, it } from 'vitest';
import { rawHexCount, readHexCounts } from './hex-guard';

/* A ratchet: each Signature stylesheet may hold at most the raw hex colours it had when the guard landed
 * (2026-10-21), and a new Signature sheet holds none. Move a colour into tokens.css and read it with var(--sig-*);
 * when a count drops, lower its number here so it can't creep back. */
const BASELINE: Record<string, number> = {
  'src/app/app/profile/profile-signature.module.css': 21,
  'src/app/app/requests/hub/request-hub.module.css': 5,
  'src/app/app/requests/time-off-signature.module.css': 9,
  'src/components/availability-signature.module.css': 8,
  'src/components/communication-compose-signature.module.css': 13,
  'src/components/communication-detail-signature.module.css': 7,
  'src/components/employee-home-today.module.css': 8,
  'src/components/employee-my-schedule.module.css': 8,
  'src/components/employee-time-signature.module.css': 19,
  'src/components/employee-updates-signature.module.css': 2,
  'src/components/notification-inbox-signature.module.css': 3,
  'src/components/shift-requests-signature.module.css': 20,
  'src/components/signature/components.css': 13,
  'src/components/signature/signature.module.css': 25,
  'src/components/signature/system-state.module.css': 2,
  'src/components/timecards-signature.module.css': 2,
};

describe('Signature raw-hex guard', () => {
  it('counts hex outside comments, custom properties and var() fallbacks', () => {
    expect(rawHexCount('.a { color: #FFF; background: var(--sig-card, #FFFFFF); }')).toBe(1);
    expect(rawHexCount(':root { --sig-x: #0D3634; } /* #123456 */ .b { box-shadow: 0 0 0 1px var(--sig-rule, #E8E5DF), 0 1px 2px #000; }')).toBe(1);
    expect(rawHexCount('.c { color: var(--sig-ink, var(--sig-ink-1, #161C1B)); }')).toBe(0);
  });

  it('no Signature stylesheet adds a raw hex colour', () => {
    const counts = readHexCounts(process.cwd());
    const grown = Object.entries(counts).filter(([file, count]) => count > (BASELINE[file] ?? 0)).map(([file, count]) => `${file}: ${count} (allowed ${BASELINE[file] ?? 0})`);
    expect(grown, 'Use a --sig-* token from src/components/signature/tokens.css instead of a raw hex colour').toEqual([]);
  });
});
