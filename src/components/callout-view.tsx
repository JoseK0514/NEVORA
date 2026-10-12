"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { NavIcon } from "./nav-icon";
import { ShiftSlot } from "./shift-slot";
import { ReviewedCalloutForm } from "./reviewed-callout-form";
import { formatDayLabel, formatTime } from "../lib/date-utils";
import type { ExchangeShift } from "../lib/data/exchanges";
import styles from "./callout-view.module.css";

gsap.registerPlugin(useGSAP);

export function CalloutView({
  shift,
  fields,
  error,
}: {
  shift: ExchangeShift;
  fields: Readonly<Record<string, string>> | null;
  error?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const date = formatDayLabel(shift.date);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-callout-intro]", {
        y: 8,
        opacity: 0.65,
        duration: 0.45,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    });
    return () => media.revert();
  }, { scope: container });

  return (
    <div ref={container} className={`employee-view ${styles.page}`}>
      <Link className={styles.back} href="/app/exchange?tab=my">
        <ArrowLeftIcon size={18} aria-hidden="true" focusable="false" />
        Shift requests
      </Link>

      <header className={styles.heading} data-callout-intro>
        <h1>Unable to work</h1>
        <p>Let management know you can&apos;t work this shift.</p>
      </header>

      {error ? (
        <p className={styles.error} role="alert">
          {error === "details"
            ? "Please explain the reason when selecting Other."
            : "Choose a reason before submitting the callout."}
        </p>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.summary} aria-labelledby="callout-shift-heading">
          <div className={styles.summaryTitle}>
            <NavIcon name="schedule" size={21} />
            <h2 id="callout-shift-heading">Your shift</h2>
          </div>
          <div className={styles.shiftDate} data-callout-intro>
            <span className={styles.dateTile} aria-hidden="true">
              <span>{date.weekday}</span>
              <strong>{Number(shift.date.slice(-2))}</strong>
            </span>
            <div>
              <time dateTime={shift.date}>{date.weekday}, {date.day}</time>
              <p>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
              {shift.endTime <= shift.startTime ? <small>Ends the next day</small> : null}
            </div>
          </div>
          <div className={styles.shiftContext}>
            <NavIcon name="location" size={19} />
            <ShiftSlot shift={shift} contextOnly />
          </div>

          <div className={styles.assignmentNotice}>
            <NavIcon name="alert" size={21} />
            <div>
              <strong>This shift is still assigned to you</strong>
              <p>You remain responsible for it until management approves your callout.</p>
            </div>
          </div>

          <div className={styles.nextSteps}>
            <h3>After you submit</h3>
            <ol>
              <li>
                <span className={styles.stepIcon}><NavIcon name="requests" size={19} /></span>
                <div><strong>Management reviews your report</strong><p>Follow its status in Shift requests.</p></div>
              </li>
              <li>
                <span className={styles.stepIcon}><NavIcon name="coverage" size={19} /></span>
                <div><strong>If approved, coverage opens</strong><p>The shift moves to the coverage board for an eligible replacement.</p></div>
              </li>
            </ol>
            <Link className={styles.statusLink} href="/app/exchange?tab=requests">
              View my requests <NavIcon name="arrowRight" size={17} />
            </Link>
          </div>
        </section>

        <section className={styles.formPanel} aria-labelledby="callout-reason-heading">
          <div className={styles.formHeading}>
            <h2 id="callout-reason-heading">Why can&apos;t you work?</h2>
            <p>Choose a reason and add any details management needs.</p>
          </div>
          <ReviewedCalloutForm fields={fields} />
        </section>
      </div>
    </div>
  );
}
