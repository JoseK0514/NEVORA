/** The combined runner owns one cluster, while the unchanged factories require
 * distinct disposable namespaces. Never turn a remote or unmarked input into a
 * local-looking target; each factory still checks absence, OID and its own marker. */
export function communicationFixtureUrl(value:string,prefix:string):string{
 const target=new URL(value),name=decodeURIComponent(target.pathname.slice(1));
 if(!['postgres:','postgresql:'].includes(target.protocol)||!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||!target.port||target.search||target.hash||!/^nevora_exchange_test_c1_[a-f0-9]{12}$/.test(name)||!['nevora_exchange_test_','nevora_foundation_test_','fuel_phase3_test_'].includes(prefix))throw Error('Refusing an unmarked or non-loopback combined fixture');
 target.pathname='/'+prefix+name.slice('nevora_exchange_test_'.length);
 return target.href;
}
