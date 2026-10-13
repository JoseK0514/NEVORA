import Image from "next/image";
import { NUVORA_BRAND } from "../../lib/brand";

export function LoginVisual() {
  return (
    <aside className="login-visual" aria-label="Your workday in NEVORA">
      <Image
        className="login-visual-art"
        src="/assets/illustrations/login-daylight-blue-v2.png"
        alt=""
        width={1024}
        height={1536}
        sizes="(max-width: 799px) 480px, (max-width: 1200px) 48vw, 540px"
        priority
      />
      <div className="login-visual-copy">
        <h2>{NUVORA_BRAND.slogan}</h2>
      </div>
    </aside>
  );
}
