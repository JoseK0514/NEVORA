'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
export default function Control(){
 const router=useRouter();
 useEffect(()=>{window.refreshFictionalRouter=()=>router.refresh();document.documentElement.dataset.fixtureReady='yes';return()=>{delete window.refreshFictionalRouter;};},[router]);
 return <><h1>Fictional source</h1><Link href="/destination" prefetch={false}>Insights</Link></>;
}
