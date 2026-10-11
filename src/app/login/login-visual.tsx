"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { NUVORA_BRAND } from "../../lib/brand";
import { PauseIcon } from "@phosphor-icons/react/dist/ssr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { createLoginMotion } from "./login-motion";

gsap.registerPlugin(useGSAP);

export function LoginVisual() {
  const container = useRef<HTMLElement>(null);
  const motion = useRef<ReturnType<typeof createLoginMotion> | null>(null);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [paused, setPaused] = useState(false);
  useGSAP(() => {
    if (!container.current) return;
    const controller = createLoginMotion(container.current, setMotionAvailable);
    motion.current = controller;
    return () => { motion.current = null; controller.destroy(); };
  }, { scope: container });

  return (
    <aside className="login-visual" ref={container} aria-label="Your workday in NEVORA">
      <div className="login-visual-copy">
        <h2><span className="login-visual-line">{NUVORA_BRAND.slogan}</span></h2>
        <p>Your schedule, time and requests.<br />Together in NEVORA.</p>
      </div>
      <div className="login-visual-art-stage">
      <Image className="login-visual-art" src="/assets/illustrations/login-workday-blue.png"
        alt="" width={1536} height={1024}
        sizes="(max-width: 799px) 170px, (max-width: 1100px) 45vw, 500px" priority />
      </div>
      {motionAvailable && <button type="button" className="login-motion-toggle"
        aria-label={paused ? "Play illustration animation" : "Pause illustration animation"}
        onClick={() => { motion.current?.setPaused(!paused); setPaused(!paused); }}>
        {paused ? <PlayIcon size={18} weight="regular" aria-hidden="true" focusable="false" />
          : <PauseIcon size={18} weight="regular" aria-hidden="true" focusable="false" />}
      </button>}
    </aside>
  );
}
