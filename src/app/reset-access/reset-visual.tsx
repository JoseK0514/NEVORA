import Image from 'next/image';
import {NUVORA_BRAND} from '@/lib/brand';

export function ResetVisual(){
 return <aside className="login-visual reset-visual" aria-label="A fresh start with NEVORA">
  <div className="login-visual-copy"><h2>{NUVORA_BRAND.slogan}</h2></div>
  <div className="auth-still-stage"><Image className="login-visual-art" src="/assets/illustrations/reset-key-still-v2.png" alt="" width={1536} height={1024}
   sizes="(max-width: 799px) 140px, (max-width: 1100px) 38vw, 460px" priority/></div>
 </aside>;
}
