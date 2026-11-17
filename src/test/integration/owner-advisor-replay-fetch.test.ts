import {expect,it,vi} from 'vitest';
import {createOwnedReplayFetch} from './owner-advisor-replay-fetch';
it('allows only this owned loopback port and prevents automatic redirect escape',async()=>{
 const call=vi.fn(async()=>new Response('owned')),guard=createOwnedReplayFetch(call,'http://127.0.0.1:43127');
 await guard('http://localhost:43127/api/owner/advisor',{method:'POST',redirect:'follow'});expect(call).toHaveBeenCalledExactlyOnceWith('http://localhost:43127/api/owner/advisor',{method:'POST',redirect:'error'});
});
it.each(['https://api.openai.com/v1/responses','https://api.anthropic.com/v1/messages','http://127.0.0.1:43128/api','http://localhost.evil.invalid:43127/api','http://user:secret@localhost:43127/api','file:///private/source'])('blocks %s before any transport call without echoing its URL',async url=>{
 const call=vi.fn(async()=>new Response('never')),deny=vi.fn(),guard=createOwnedReplayFetch(call,'http://127.0.0.1:43127',deny);await expect(guard(url)).rejects.toThrow(/^Owned replay external fetch denied$/);expect(call).not.toHaveBeenCalled();expect(deny).toHaveBeenCalledExactlyOnceWith('external');
});
it.each(['https://outside.invalid','http://localhost','http://user:secret@localhost:43127','http://localhost:43127/path'])('rejects an unowned fixture origin %s',origin=>{expect(()=>createOwnedReplayFetch(fetch,origin)).toThrow();});

it('blocks and identifies the exact framework version check without allowing transport',async()=>{
 const call=vi.fn(async()=>new Response('never')),deny=vi.fn(),guard=createOwnedReplayFetch(call,'http://127.0.0.1:43127',deny);
 await expect(guard('https://registry.npmjs.org/-/package/next/dist-tags')).rejects.toThrow(/^Owned replay external fetch denied$/);
 expect(call).not.toHaveBeenCalled();expect(deny).toHaveBeenCalledExactlyOnceWith('next-version-check');
 await expect(guard('https://registry.npmjs.org/-/package/next/dist-tags?token=secret')).rejects.toThrow();
 expect(call).not.toHaveBeenCalled();expect(deny).toHaveBeenLastCalledWith('external');
});
