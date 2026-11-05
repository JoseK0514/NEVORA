import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const fields=['origin','iosApplicationIdentifier','androidPackageName','androidCertificateSha256Fingerprints'];
const whole=(pattern,value)=>typeof value==='string'&&pattern.exec(value)?.[0]===value;
const invalid=()=>Error('Invalid public association configuration');

function validated(config){
    if(!config||Object.getPrototypeOf(config)!==Object.prototype||Object.keys(config).length!==fields.length||fields.some(key=>!Object.hasOwn(config,key)))throw invalid();
    if(typeof config.origin!=='string'||config.origin.length>2048)throw invalid();
    let url;
    try{url=new URL(config.origin);}catch{throw invalid();}
    const host=url.hostname;
    const privateAlias=['localhost','local','localdomain','internal','invalid'].some(suffix=>host===suffix||host.endsWith('.'+suffix));
    if(url.protocol!=='https:'||url.origin!==config.origin||url.port||url.username||url.password||isIP(host)||privateAlias||host.length>253||!host.includes('.')||!host.split('.').every(label=>whole(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u,label)))throw invalid();
    const ios=config.iosApplicationIdentifier,android=config.androidPackageName;
    if(typeof ios!=='string'||ios.length>211||!whole(/^[A-Z0-9]{10}\.[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*){1,9}$/u,ios))throw invalid();
    if(typeof android!=='string'||android.length>200||!whole(/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*){1,9}$/u,android))throw invalid();
    const fingerprints=config.androidCertificateSha256Fingerprints;
    if(!Array.isArray(fingerprints)||fingerprints.length<1||fingerprints.length>4||!fingerprints.every(value=>whole(/^(?:[a-fA-F0-9]{2}:){31}[a-fA-F0-9]{2}$/u,value)))throw invalid();
    const canonical=fingerprints.map(value=>value.toUpperCase());
    if(new Set(canonical).size!==canonical.length)throw invalid();
    return {...config,androidCertificateSha256Fingerprints:canonical};
}

/** Syntax validation/preparation only. Inputs must later match signed binaries. */
export function associationDocuments(config){
    const input=validated(config);
    return {
        origin:input.origin,
        apple:{applinks:{details:[{appIDs:[input.iosApplicationIdentifier],components:[{'/':'/app'},{'/':'/app/*'},{'/':'/activate'},{'/':'/reset-access'},{'/':'/forgot-access'},{'/':'/login'}]}]},webcredentials:{apps:[input.iosApplicationIdentifier]}},
        android:[{relation:['delegate_permission/common.handle_all_urls','delegate_permission/common.get_login_creds'],target:{namespace:'android_app',package_name:input.androidPackageName,sha256_cert_fingerprints:input.androidCertificateSha256Fingerprints}}],
    };
}

/** Never overwrites an existing destination or writes into application source. */
export function prepareAssociations(config,output){
    const documents=associationDocuments(config);
    if(typeof output!=='string'||!isAbsolute(output)||resolve(output)!==output)throw Error('Select a new absolute external output directory');
    const directory=join(realpathSync(dirname(output)),basename(output));
    const source=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
    const distance=relative(source,directory);
    if(!(distance==='..'||distance.startsWith('..'+sep)||isAbsolute(distance)))throw Error('Association output must be outside source');
    mkdirSync(directory,{mode:0o700});
    mkdirSync(join(directory,'.well-known'),{mode:0o700});
    const artifacts=[];
    for(const [path,document] of [['.well-known/apple-app-site-association',documents.apple],['.well-known/assetlinks.json',documents.android]]){
        const data=JSON.stringify(document,null,2)+'\n';
        writeFileSync(join(directory,path),data,{encoding:'utf8',flag:'wx',mode:0o600});
        artifacts.push({path,sha256:createHash('sha256').update(data).digest('hex')});
    }
    const manifest={schema:1,status:'prepared',origin:documents.origin,signed:false,hostedVerified:false,deviceVerified:false,artifacts};
    // Written last: incomplete IO must never produce a completed preparation receipt.
    writeFileSync(join(directory,'preparation.json'),JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
    return manifest;
}

function main(args){
    if(args.length!==4)throw Error('Explicit config and output required');
    const selected=new Map();
    for(let i=0;i<args.length;i+=2){
        const flag=args[i],value=args[i+1];
        if(!['--config','--output'].includes(flag)||selected.has(flag)||!value||value.startsWith('--'))throw Error('Invalid arguments');
        selected.set(flag,value);
    }
    if(selected.size!==2)throw Error('Missing arguments');
    const config=selected.get('--config'),stat=lstatSync(config);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw invalid();
    return prepareAssociations(JSON.parse(readFileSync(config,'utf8')),selected.get('--output'));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
    try{console.log(JSON.stringify(main(process.argv.slice(2))));}
    catch{console.error('Association preparation failed; check public configuration and select a new external output directory.');process.exitCode=1;}
}
