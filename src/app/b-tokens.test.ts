// Nov 14, 2026 inspection (SY-008, RA-14): the Direction B colour pairs that carry text or meaning meet WCAG contrast,
// measured from the token values, and the Phase 1 names exist.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const source = readFileSync(join(__dirname, 'b-tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const token = (name: string) => {
  const match = source.match(new RegExp(`--b-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--b-${name} is not defined`);
  return match[1].trim();
};
type Rgb = [number, number, number];
const hex = (value: string): Rgb => {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${value} is not a six-digit hex colour`);
  return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)) as Rgb;
};
const over = (top: Rgb, alpha: number, under: Rgb) => top.map((channel, index) => channel * alpha + under[index] * (1 - alpha)) as Rgb;
const luminance = (colour: Rgb) => {
  const [r, g, b] = colour.map(channel => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const WHITE: Rgb = [255, 255, 255];

describe('Direction B contrast (text 4.5:1, graphics 3:1)', () => {
  it.each(['quiet', 'teal-50', 'red-50', 'amber-50', 'green-50', 'line', 'canvas'])('grey text on the %s fill', fill => {
    expect(contrast(hex(token('grey-on-fill')), hex(token(fill)))).toBeGreaterThanOrEqual(4.5);
  });
  it('grey text on white and on the hover fill', () => {
    expect(contrast(hex(token('grey')), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(token('grey')), hex(token('hover')))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['teal', 'amber', 'red', 'green'])('%s ink on its tint', status => {
    expect(contrast(hex(token(status)), hex(token(`${status}-50`)))).toBeGreaterThanOrEqual(4.5);
  });
  it('the field edge and row chevron on white, the canvas and the quiet and teal-50 fills', () => {
    for (const surface of [WHITE, hex(token('canvas')), hex(token('quiet')), hex(token('teal-50'))]) expect(contrast(hex(token('field-edge')), surface)).toBeGreaterThanOrEqual(3);
  });
  it('the amber and green solids on white, and amber on its tint and the grey track', () => {
    expect(contrast(hex(token('amber-solid')), WHITE)).toBeGreaterThanOrEqual(3);
    expect(contrast(hex(token('amber-solid')), hex(token('amber-50')))).toBeGreaterThanOrEqual(3);
    expect(contrast(hex(token('amber-solid')), hex('#EDF0F0'))).toBeGreaterThanOrEqual(3);
    expect(contrast(hex(token('green-solid')), WHITE)).toBeGreaterThanOrEqual(3);
  });
  it('white on the band and on its glass; the second white only on the solid band', () => {
    const band = hex(token('band-solid'));
    const glass = over(WHITE, 0.12, band);
    expect(token('on-band')).toBe('#FFFFFF');
    expect(token('glass')).toBe('rgb(255 255 255 / 0.12)');
    expect(token('on-band-2')).toBe('rgb(255 255 255 / 0.86)');
    expect(contrast(WHITE, band)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, glass)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(over(WHITE, 0.86, band), band)).toBeGreaterThanOrEqual(4.5);
    // …which is why b-foundation.css resolves it to white inside glass.
    expect(contrast(over(WHITE, 0.86, glass), glass)).toBeLessThan(4.5);
  });
  it('the bell dot is found by its white ring: coral alone is under 3:1 on the band', () => {
    expect(contrast(hex(token('coral')), hex(token('band-solid')))).toBeLessThan(3);
    expect(contrast(WHITE, hex(token('band-solid')))).toBeGreaterThanOrEqual(3);
  });
});

const TYPE_ROLES: [role: string, size: number, line: number][] = [
  ['display', 30, 36], ['figure', 24, 30], ['title', 20, 26], ['title-sm', 17, 22],
  ['body', 15.5, 22], ['body-sm', 14.5, 20], ['meta', 13.5, 18], ['caption', 12.5, 16],
];

describe('Phase 1 token names', () => {
  it.each(TYPE_ROLES)('--b-fs-%s is %spx and its line-height %spx, in rem', (role, size, line) => {
    expect(token(`fs-${role}`)).toBe(`${size / 16}rem`);
    expect(token(`lh-${role}`)).toBe(`${line / 16}rem`);
  });
  it.each(TYPE_ROLES)('--b-type-%s is that pair for the font shorthand', role => {
    expect(token(`type-${role}`)).toBe(`var(--b-fs-${role})/var(--b-lh-${role})`);
  });
  it('keeps the count size beside the roles', () => {
    expect(token('fs-count')).toBe('12px');
  });
  it('has the spacing scale, the three insets, the four radii and the motion timings', () => {
    for (const step of [2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]) expect(token(`space-${step}`)).toBe(`${step}px`);
    expect([token('gutter'), token('inset'), token('inset-wide')]).toEqual(['14px', '18px', '22px']);
    expect([token('radius-pill'), token('radius-card'), token('radius-field'), token('radius-small')]).toEqual(['999px', '22px', '14px', '10px']);
    expect([token('dur-press'), token('dur-hover'), token('dur-exit'), token('dur-enter'), token('ease-out')]).toEqual(['150ms', '150ms', '150ms', '300ms', 'ease-out']);
  });

  it('pins the desktop and tablet frame (Phase 2)', () => {
    expect([token('frame-wide'), token('frame-read'), token('frame-form')]).toEqual(['1080px', '812px', '560px']);
    expect([token('band-short'), token('band-sub'), token('band-strip')]).toEqual(['196px', '224px', '296px']);
    expect(token('band-figures')).toBe('363px');
    expect([token('title-top'), token('title-top-back')]).toEqual(['88px', '130px']);
  });
  it('has three elevations and the glow in one shadow colour', () => {
    expect(token('shadow-rgb')).toBe('16 40 38');
    for (const level of ['elev-1', 'elev-2', 'elev-3']) {
      const colours = token(level).match(/rgb\([^)]*\)/g) ?? [];
      expect(colours.length).toBe(3);
      for (const colour of colours) expect(colour).toMatch(/^rgb\(16 40 38 \/ 0\.\d+\)$/);
    }
    // each step casts further and darker than the one below it
    const far = (level: string) => { const m = token(level).match(/0 (\d+)px (\d+)px -\d+px rgb\(16 40 38 \/ (0\.\d+)\)$/); if (!m) throw new Error(level); return [Number(m[1]), Number(m[2]), Number(m[3])]; };
    const [one, two, three] = [far('elev-1'), far('elev-2'), far('elev-3')];
    for (const index of [0, 1, 2]) { expect(two[index]).toBeGreaterThan(one[index]); expect(three[index]).toBeGreaterThan(two[index]); }
    expect(token('elev-glow')).toBe('0 6px 14px -6px rgb(11 110 105 / 0.6)');
  });
  it('names the palette the other sheets read', () => {
    for (const name of ['teal', 'teal-50', 'ink', 'ink2', 'grey', 'grey-on-fill', 'line', 'canvas', 'quiet', 'amber', 'amber-50', 'amber-solid', 'red', 'red-50', 'green', 'green-50', 'green-solid', 'coral', 'field-edge', 'hover', 'disabled-bg', 'disabled-ink', 'band', 'on-band', 'glass', 'focus']) expect(token(name)).not.toBe('');
  });
});
