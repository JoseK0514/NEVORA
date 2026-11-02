import {expect, it} from 'vitest';
import config from '../../../next.config';
import {nativeContentSecurityPolicy} from './security';
import {nativeContext} from './context';

it('blocks redirected frames, objects, forms and subresource connections outside the selected origin', () => {
  const policy=nativeContentSecurityPolicy(false);
  for (const directive of ["default-src 'self'", "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "connect-src 'self'", "frame-ancestors 'none'"])
    expect(policy).toContain(directive);
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).not.toMatch(/(?:^|\s)\*(?:\s|;|$)/);
});
it('keeps the local development renderer compatible without widening the release policy', () => {
  expect(nativeContentSecurityPolicy(true)).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  expect(nativeContentSecurityPolicy(false)).toContain("script-src 'self' 'unsafe-inline'");
  expect(nativeContentSecurityPolicy(false)).toContain("img-src 'self' data: blob:");
});
it('applies the stricter native policy last, preserving ordinary web configuration', async () => {
  const rules=await config.headers!();
  const native=rules.find(rule=>rule.has?.some(item=>item.type==='header'&&item.key==='user-agent'));
  expect(native).toBeDefined();
  expect(native?.source).toBe('/:path*');
  expect(native?.headers).toContainEqual({key:'Content-Security-Policy',value:nativeContentSecurityPolicy(process.env.NODE_ENV==='development')});
  expect(native?.headers).toContainEqual({key:'Cache-Control',value:'no-store, private'});
  expect(rules.at(-1)).toBe(native);
  expect(rules.filter(rule=>rule!==native).every(rule=>!rule.has)).toBe(true);
});
it('matches exactly the versioned native presentation context, never a partial/foreign marker', async () => {
  const rules=await config.headers!();
  const condition=rules.flatMap(rule=>rule.has??[]).find(item=>item.type==='header'&&item.key==='user-agent');
  expect(condition?.value).toBeTypeOf('string');
  const matcher=new RegExp('^(?:'+condition!.value+')$');
  for(const marker of ['NEVORA-Native/iOS/1','Mozilla/5.0 NEVORA-Native/Android/1','Browser NEVORA-Native/iOS/1 extra',
    '', 'Mozilla/5.0', 'fakeNEVORA-Native/iOS/1', 'NEVORA-Native/iOS/10','NEVORA-Native/iOS/1evil','NEVORA-Native/Other/1'])
    expect(matcher.test(marker),marker).toBe(nativeContext(marker));
});
