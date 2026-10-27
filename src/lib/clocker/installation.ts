import type {Metadata,MetadataRoute} from 'next';

const validKey=(key:string)=>key.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)&&!key.endsWith('\n');
export function clockerLaunchMetadata(key:string):Metadata{
 if(!validKey(key))return {};
 return {title:'Clocker | NEVORA',description:'Shared employee time clock',applicationName:'NEVORA Clocker',manifest:`/clocker/${key}/manifest.webmanifest`,
  appleWebApp:{capable:true,title:'Clocker',statusBarStyle:'default'},icons:{apple:'/icons/fuel-apple-180.png'}};
}
/** Public launch identity only. Enrollment, PIN and live time data stay on their guarded routes. */
export function clockerLaunchManifest(key:string):MetadataRoute.Manifest|null{
 if(!validKey(key))return null;
 const path=`/clocker/${key}`;
 return {id:path,name:'NEVORA Clocker',short_name:'Clocker',description:'Shared employee time clock',
  start_url:path,scope:'/clocker/',display:'standalone',orientation:'any',background_color:'#f4f7f6',theme_color:'#f4f7f6',
  icons:[{src:'/icons/fuel-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/icons/fuel-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/icons/fuel-maskable-192.png',sizes:'192x192',type:'image/png',purpose:'maskable'},
   {src:'/icons/fuel-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
   {src:'/icons/fuel-apple-180.png',sizes:'180x180',type:'image/png',purpose:'any'}]};
}
