import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {correctionBoundary, correctionBoundaryResponse} from './http.server';

const deployed = 'https://nevora-candidate-123.vercel.app';
const request = (origin = deployed, host = 'nevora-candidate-123.vercel.app') => new Request(deployed + '/api/timecards', {
  method: 'POST', headers: {host, origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', 'x-nevora-timecards': '1'}, body: '{}',
});
beforeEach(() => {
  vi.stubEnv('NEVORA_WORKSPACE_MODE', 'single_company');
  vi.stubEnv('FUEL_PORTAL_ORIGIN', 'https://nevora-stable.vercel.app');
  vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('VERCEL_URL', 'nevora-candidate-123.vercel.app');
});
afterEach(() => vi.unstubAllEnvs());

describe('exact Vercel preview browser admission', () => {
  it('admits this immutable deployment while retaining the explicitly configured portal origin', () => {
    expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBeNull();
    expect(correctionBoundary(request('https://nevora-stable.vercel.app'), true, 'x-nevora-timecards')).toBeNull();
  });
  it.each(['https://other.vercel.app', 'https://nevora-candidate-123.vercel.app.evil.test', 'null'])('rejects other origins: %s', origin => {
    expect(correctionBoundary(request(origin), true, 'x-nevora-timecards')).toBe(403);
  });
  it('does not trust a request host as a preview allowlist', () => {
    expect(correctionBoundary(request(deployed, 'other.vercel.app'), true, 'x-nevora-timecards')).toBe(403);
  });
  it('still requires Origin when preview expansion is unavailable', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const headers = new Headers(request().headers); headers.delete('origin');
    expect(correctionBoundary(new Request(deployed, {method:'POST',headers,body:'{}'}), true, 'x-nevora-timecards')).toBe(403);
  });
  it('refuses contradictory proxy metadata for the preview origin', () => {
    for (const [name,value] of [['x-forwarded-host','other.test'],['x-forwarded-proto','http']]) {
      const headers = new Headers(request().headers); headers.set(name,value);
      expect(correctionBoundary(new Request(deployed,{method:'POST',headers,body:'{}'}),true,'x-nevora-timecards')).toBe(403);
    }
  });
  it.each(['production', 'development'])('does not expand origin admission in %s', environment => {
    vi.stubEnv('VERCEL_ENV', environment);
    expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBe(403);
  });
  it('requires the platform marker and rejects malformed platform deployment names', () => {
    vi.stubEnv('VERCEL', '0'); expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBe(403);
    vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_URL', 'nevora-candidate-123.vercel.app/path');
    expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBe(403);
  });
  it('retains JSON, intent, same-site and valid configured-origin controls', () => {
    const original = request();
    for (const [name, value] of [['content-type', 'text/plain'], ['x-nevora-timecards', ''], ['sec-fetch-site', 'cross-site']]) {
      const headers = new Headers(original.headers); headers.set(name, value);
      expect(correctionBoundary(new Request(original.url, {method: 'POST', headers, body: '{}'}), true, 'x-nevora-timecards')).toBe(403);
    }
    vi.stubEnv('FUEL_PORTAL_ORIGIN', 'https://invalid.test/path');
    expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBe(503);
  });
  it('keeps isolated workspace routing authoritative even on Vercel Preview', () => {
    vi.stubEnv('NEVORA_WORKSPACE_MODE', 'isolated');
    expect(correctionBoundary(request(), true, 'x-nevora-timecards')).toBe(503);
  });
  it('reports admission failure without calling it session expiry or revealing the expected origin', async () => {
    const response = correctionBoundaryResponse(request('https://other.test'), true, 'x-nevora-timecards');
    expect(response?.status).toBe(403);
    expect(response?.headers.get('x-nevora-failure')).toBe('origin_mismatch');
    expect(response?.headers.get('cache-control')).toBe('no-store, private');
    expect(await response?.json()).toEqual({state: 'unavailable'});
  });
});
