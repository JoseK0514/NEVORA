/* Clean Manager and Owner app: v3 proposal mockups (native-grade restraint). Fictional data only:
 * Monday, October 19, 10:15 AM. One count everywhere: Needs you = 6 no clock-in + 3 open shifts today + 1 request = 10.
 * Styles: mockups/v3.css. Run: npx tsx --tsconfig tsconfig.json docs/product/specs/clean-manager/mockups/build.tsx */
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BellIcon, CalendarBlankIcon, CalendarXIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, ChartBarIcon, ClockIcon,
  ClockCounterClockwiseIcon, CopyIcon, CurrencyCircleDollarIcon, DotsThreeCircleIcon, ExportIcon, GearSixIcon, HouseIcon,
  KeyIcon, LockKeyIcon, MagnifyingGlassIcon, MegaphoneIcon, PlusIcon, SlidersHorizontalIcon, TargetIcon, TrayIcon, UserIcon,
  UsersIcon, UsersThreeIcon, HourglassIcon, ArrowsLeftRightIcon, UserMinusIcon, AirplaneTiltIcon, SquaresFourIcon,
} from "@phosphor-icons/react/dist/ssr";

const root = process.cwd();
const dir = join(root, "docs/product/specs/clean-manager/mockups");
const out = join(dir, "html");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const css = readFileSync(join(dir, "v3.css"), "utf8");

type Icon = typeof HouseIcon;
const I = (C: Icon, size = 20, weight: "regular" | "bold" | "fill" = "regular") => <C size={size} weight={weight} aria-hidden="true" />;
const chev = <CaretRightIcon className="chev" size={14} weight="bold" aria-hidden="true" />;
const ini = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("");
const Mono = ({ name, lg }: { name: string; lg?: boolean }) => <span className={`mono${lg ? " lg" : ""}`}>{ini(name)}</span>;

const NEEDS = 10;
const late = [
  ["Taylor Rivera", "7:00 AM – 3:00 PM", "3h 15m"], ["Alexandra Rivera", "8:00 AM – 4:00 PM", "2h 15m"], ["Riley Rivera", "8:00 AM – 4:00 PM", "2h 15m"],
  ["Sam Rivera", "9:00 AM – 5:00 PM", "1h 15m"], ["Quinn Rivera", "9:00 AM – 5:00 PM", "1h 15m"], ["María José Rivera Santiago", "10:00 AM – 6:00 PM", "15m"],
] as const;

/* ============================== iPhone ============================== */
const Status = () => (
  <div className="sb">
    <span>10:15</span>
    <span className="ic">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .4 10.4 10.4 0 0 0 .8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.6c-.5 0-1 .2-1.3.5L8 11.6l1.3-1.7c-.3-.3-.8-.5-1.3-.5Z" /></svg>
      <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.8" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="9" rx="2.5" fill="currentColor" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45" /></svg>
    </span>
  </div>
);
const tabList = [["Home", HouseIcon], ["Schedule", CalendarBlankIcon], ["Inbox", TrayIcon], ["Team", UsersThreeIcon], ["More", DotsThreeCircleIcon]] as const;
const Tabs = ({ on }: { on: string }) => (
  <>
    <nav className="tabs">{tabList.map(([l, C]) => (
      <span key={l} data-on={l === on ? "" : undefined}><C size={27} weight="fill" aria-hidden="true" />{l}{l === "Inbox" ? <span className="badge">{NEEDS}</span> : null}</span>
    ))}</nav>
    <span className="homebar" />
  </>
);
const Nav = ({ left, children }: { left?: ReactNode; children?: ReactNode }) => (
  <div className="nav">{left ? <span className="left txt">{left}</span> : null}{children}</div>
);
const Bell = () => <span style={{ position: "relative", display: "inline-flex" }}>{I(BellIcon, 23)}<span style={{ position: "absolute", top: 1, right: 2, width: 8, height: 8, borderRadius: 4, background: "#FF3B30", boxShadow: "0 0 0 1.5px #F2F2F7" }} /></span>;
const Title = ({ cap, title, sub }: { cap?: string; title: string; sub?: ReactNode }) => (
  <div className="lt">{cap ? <p className="cap">{cap}</p> : null}<h1>{title}</h1>{sub ? <p className="sub">{sub}</p> : null}</div>
);
function Phone({ on, children, clip, overlay }: { on: string; children: ReactNode; clip?: boolean; overlay?: ReactNode }) {
  return <div className={`ios${clip ? " clip" : ""}`}><Status />{children}{overlay}{overlay ? null : <Tabs on={on} />}</div>;
}
function Cell({ lead, t, s, v, vt, chevron = true, cls = "", bold }: { lead?: ReactNode; t: ReactNode; s?: ReactNode; v?: ReactNode; vt?: "red" | "amber"; chevron?: boolean; cls?: string; bold?: boolean }) {
  return (
    <div className={`cell ${cls}`}>
      {lead}
      <span className="tx"><span className={`t${bold ? " b" : ""}`}>{t}</span>{s ? <span className="s">{s}</span> : null}</span>
      {v !== undefined ? <span className={`v${vt ? " " + vt : ""}`}>{v}</span> : null}
      {chevron ? chev : null}
    </div>
  );
}
const Sec = ({ title, n, a, small, foot, children }: { title: string; n?: ReactNode; a?: string; small?: boolean; foot?: ReactNode; children: ReactNode }) => (
  <section className="sec">
    <div className={`sec-h${small ? " small" : ""}`}><h2>{title}{n !== undefined ? <span className="n">{n}</span> : null}</h2>{a ? <span className="a">{a}</span> : null}</div>
    {children}
    {foot ? <p className="sec-f">{foot}</p> : null}
  </section>
);
const sq = (C: Icon, color: string) => <span className={`sq ${color}`}>{I(C, 18, "fill")}</span>;

/* Home: what needs me, who is working, what's next. No greeting, no hero. */
function homePhone(owner: boolean) {
  return (
    <Phone on="Home">
      <Nav>{I(MagnifyingGlassIcon, 23)}<Bell /></Nav>
      <Title cap="Monday, October 19" title="Today" />
      {owner ? (
        <section className="sec" style={{ marginTop: 14 }}>
          <div className="list"><Cell cls="ii" lead={sq(SquaresFourIcon, "teal")} t="Finish setting up" s="Next: weekly hour targets" v="1 of 2" /></div>
        </section>
      ) : null}
      <Sec title="Needs you" n={NEEDS} a="Inbox">
        <div className="list">
          <Cell cls="ii" lead={sq(UserMinusIcon, "red")} t="Not clocked in" v="6" />
          <Cell cls="ii" lead={sq(CalendarXIcon, "orange")} t="Open shifts today" v="3" />
          <Cell cls="ii" lead={sq(AirplaneTiltIcon, "teal")} t="Time-off request" v="1" />
        </div>
      </Sec>
      <Sec title="Working now" n={2}>
        <div className="list">
          <Cell cls="ia" lead={<Mono name="Jordan Rivera" />} t="Jordan Rivera" s="Main Office · in at 5:55 AM" v="until 2 PM" chevron={false} />
          <Cell cls="ia" lead={<Mono name="Casey Rivera" />} t="Casey Rivera" s="Main Office · in at 8:58 AM" v="until 5 PM" chevron={false} />
        </div>
      </Sec>
      <Sec title="Later today" n={1}>
        <div className="list">
          <Cell cls="ia" lead={<Mono name="Avery Rivera" />} t="Avery Rivera" s="West Office" v="5 PM – 12 AM" chevron={false} />
        </div>
      </Sec>
    </Phone>
  );
}

const inboxBody = (
  <>
    <Nav>{I(MagnifyingGlassIcon, 23)}<Bell /></Nav>
    <Title title="Inbox" />
    <div className="seg"><span data-on="">All</span><span>Act now</span><span>Requests</span><span>Plan ahead</span></div>
    <Sec title="Not clocked in" n={6} small>
      <div className="list">
        {late.slice(0, 3).map(([n, sh, ago]) => <Cell key={n} cls="ia" lead={<Mono name={n} />} t={n} s={sh} v={ago} vt="red" />)}
        <Cell cls="act" t="Show 3 more" chevron={false} />
      </div>
    </Sec>
    <Sec title="Open shifts today" n={3} small>
      <div className="list">
        <Cell t="Main Office" s="12 – 7 AM and 5 PM – 12 AM" v="2" />
        <Cell t="West Office" s="9 AM – 5 PM" v="1" />
      </div>
    </Sec>
    <Sec title="Requests" n={1} small>
      <div className="list">
        <Cell cls="ia" lead={<Mono name="Alexandra Rivera" />} t="Alexandra Rivera" s="Time off · Oct 29 – 30" v="Waiting" vt="amber" />
        <Cell cls="act" t="All requests" />
      </div>
    </Sec>
    <Sec title="Plan ahead" small foot="Planning items don’t count toward the 10 that need you today.">
      <div className="list">
        <Cell t="Open shifts later this week" v="18" />
        <Cell t="People without hour targets" v="13" />
        <Cell t="Availability deadline" v="Not set" />
        <Cell t="Earlier this week" v="2" />
      </div>
    </Sec>
  </>
);
const inboxPhone = <Phone on="Inbox">{inboxBody}</Phone>;

const inboxItemPhone = (
  <Phone on="Inbox" clip overlay={<>
    <div className="dim" />
    <div className="sheet" style={{ top: 236 }}>
      <span className="grab" />
      <div className="nav" style={{ marginTop: 4 }}><span className="txt" style={{ fontWeight: 600 }}>Done</span></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "0 16px 4px" }}>
        <Mono name="Alexandra Rivera" lg />
        <h1 style={{ font: "700 24px/30px var(--sys)", letterSpacing: .07 }}>Alexandra Rivera</h1>
        <p style={{ font: "400 15px/20px var(--sys)", color: "var(--red)" }}>Not clocked in · 2h 15m late</p>
      </div>
      <section className="sec" style={{ marginTop: 18 }}>
        <div className="list kv">
          <Cell t="Shift" v="8:00 AM – 4:00 PM" chevron={false} />
          <Cell t="Location" v="Main Office" chevron={false} />
          <Cell t="Role" v="Front desk" chevron={false} />
        </div>
      </section>
      <Sec title="Today" small>
        <div className="list">
          <Cell t="Shift reminder sent" v="7:40 AM" chevron={false} />
          <Cell t="Shift started" v="8:00 AM" chevron={false} />
        </div>
      </Sec>
      <div className="btn-row" style={{ marginTop: 24 }}><span className="btn gray">Edit Shift</span><span className="btn fill">Open Timecard</span></div>
    </div>
  </>}>
    {inboxBody}
  </Phone>
);

const days = [["M", 19], ["T", 20], ["W", 21], ["T", 22], ["F", 23], ["S", 24], ["S", 25]] as const;
const shifts = [["6:00 AM", "2:00 PM", "Jordan Rivera", "Opening"], ["7:00 AM", "3:00 PM", "Taylor Rivera", "Front desk"], ["8:00 AM", "4:00 PM", "Alexandra Rivera", "Front desk"], ["8:00 AM", "4:00 PM", "Riley Rivera", "Front desk"], ["9:00 AM", "5:00 PM", "Casey Rivera", "Support"]] as const;
const schedulePhone = (
  <Phone on="Schedule">
    <Nav left={<span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{I(CaretLeftIcon, 20, "bold")}Oct 12</span>}>{I(MagnifyingGlassIcon, 23)}{I(PlusIcon, 24)}</Nav>
    <Title title="Schedule" sub="Oct 19 – 25 · Main Office published" />
    <div className="week" style={{ marginTop: 10 }}>{days.map(([d, n], i) => <span key={i} className="wd" data-on={i === 0 ? "" : undefined}>{d}<b>{n}</b><i className={i < 6 ? "x" : ""} /></span>)}</div>
    <div className="seg" style={{ marginTop: 14 }}><span data-on="">All</span><span>Main Office</span><span>West Office</span></div>
    <section className="sec" style={{ marginTop: 18 }}>
      <div className="list"><Cell t="West Office isn’t planned" s="Nothing scheduled this week" chevron={false} v={<span className="pill-btn">Plan</span>} /></div>
    </section>
    <Sec title="Monday" n="9 shifts" small foot="Availability received from 0 of 8 people.">
      <div className="list">
        {shifts.map(([a, b, n, r]) => <Cell key={n} lead={<span className="time">{a}<span>{b}</span></span>} t={n} s={r} />)}
        <Cell cls="red" lead={<span className="time">5:00 PM<span>12:00 AM</span></span>} t="Open shift" s="No one assigned" v={<span className="pill-btn">Find Cover</span>} chevron={false} />
        <Cell cls="act" t="Show 4 more" chevron={false} />
      </div>
    </Sec>
  </Phone>
);

const timecardsPhone = (
  <Phone on="More">
    <Nav left={<span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{I(CaretLeftIcon, 20, "bold")}More</span>}><span className="txt">Select</span></Nav>
    <Title title="Timecards" sub="This week · Oct 19 – 25" />
    <div className="seg" style={{ marginTop: 8 }}><span>Last week</span><span data-on="">This week</span></div>
    <Sec title="Needs review" n={2} small>
      <div className="list">
        <Cell cls="ia" lead={<Mono name="Casey Rivera" />} t="Casey Rivera" s="Check breaks" v="3h 00m" />
        <Cell cls="ia" lead={<Mono name="Jordan Rivera" />} t="Jordan Rivera" s="Missing clock-out" v="2h 00m" />
      </div>
    </Sec>
    <Sec title="All timecards" n={13} small foot="Approvals open after Sunday, Oct 25. 0 of 13 approved.">
      <div className="list">
        {["Alexandra Rivera", "Taylor Rivera", "Riley Rivera", "Sam Rivera"].map(n => <Cell key={n} cls="ia" lead={<Mono name={n} />} t={n} s="Draft" v="0h 00m" />)}
        <Cell cls="act" t="Show 9 more" chevron={false} />
      </div>
    </Sec>
  </Phone>
);

const wk = [1.5, 1, 0.5, 2, 0, 0, 0];
const Plot = ({ h = 150 }: { h?: number }) => (
  <>
    <div className="plot" style={{ height: h }}>
      {[0, 1, 2].map(g => <span key={g} className={`gl${g === 2 ? "" : " dash"}`} style={{ top: `${(g / 2) * 100}%` }} />)}
      {["2h", "1h", "0"].map((l, g) => <span key={l} className="yl" style={{ top: `${(g / 2) * 100}%` }}>{l}</span>)}
      {wk.map((v, i) => <i key={i} style={{ height: `${(v / 2) * 100}%`, minHeight: v ? 0 : 0 }} />)}
      <span />
    </div>
    <div className="xl">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}<span /></div>
  </>
);
const insightsPhone = (
  <Phone on="More">
    <Nav left={<span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{I(CaretLeftIcon, 20, "bold")}More</span>}>{I(ExportIcon, 23)}</Nav>
    <Title title="Insights" />
    <div className="seg"><span data-on="">Week</span><span>Month</span><span>Custom</span></div>
    <section className="sec" style={{ marginTop: 18 }}>
      <div className="chart">
        <p className="cap">Recorded time</p>
        <p className="val tnum">5<small>h</small>1<small>min</small></p>
        <p className="rng">Oct 13 – 19, 2026</p>
        <Plot />
      </div>
    </section>
    <Sec title="Hours by person" small>
      <div className="list">
        <Cell cls="ia" lead={<Mono name="Casey Rivera" />} t="Casey Rivera" v="3h 1m" />
        <Cell cls="ia" lead={<Mono name="Jordan Rivera" />} t="Jordan Rivera" v="2h 0m" />
        <Cell t="11 people with no recorded time" v="0h" />
      </div>
    </Sec>
    <Sec title="Period" small>
      <div className="list">
        <Cell t="Timecards to finish" v="13" />
        <Cell t="Time off taken" v="0 days" chevron={false} />
      </div>
    </Sec>
  </Phone>
);

const morePhone = (
  <Phone on="More">
    <Nav />
    <Title title="More" />
    <section className="sec" style={{ marginTop: 10 }}>
      <div className="list"><Cell cls="ia" lead={<Mono name="Morgan Rivera" />} t="Morgan Rivera" bold s="Manager · Northside QA" /></div>
    </section>
    <Sec title="Time and pay" small>
      <div className="list">
        <Cell cls="ii" lead={sq(ClockIcon, "teal")} t="Timecards" v="2" />
        <Cell cls="ii" lead={sq(ExportIcon, "blue")} t="Time Exports" />
        <Cell cls="ii" lead={sq(ChartBarIcon, "indigo")} t="Insights" />
      </div>
    </Sec>
    <Sec title="Planning" small>
      <div className="list">
        <Cell cls="ii" lead={sq(CopyIcon, "orange")} t="Templates" />
        <Cell cls="ii" lead={sq(SlidersHorizontalIcon, "gray")} t="Scheduling Rules" />
        <Cell cls="ii" lead={sq(MegaphoneIcon, "red")} t="Updates" />
      </div>
    </Sec>
    <Sec title="Team tools" small>
      <div className="list">
        <Cell cls="ii" lead={sq(ClockCounterClockwiseIcon, "green")} t="Attendance" />
        <Cell cls="ii" lead={sq(UsersIcon, "blue")} t="Team Overview" />
        <Cell cls="ii" lead={sq(KeyIcon, "gray")} t="Clocker Recovery" />
        <Cell cls="ii" lead={sq(LockKeyIcon, "gray")} t="Account Recovery" />
      </div>
    </Sec>
  </Phone>
);

/* ============================== Desktop ============================== */
type NavItem = [string, Icon, ReactNode?];
function Web({ on, owner = false, crumb, tools, children }: { on: string; owner?: boolean; crumb: ReactNode; tools?: ReactNode; children: ReactNode }) {
  const groups: [string, NavItem[]][] = [
    ["", [["Home", HouseIcon], ["Inbox", TrayIcon, <span key="n" className="n hot">{NEEDS}</span>], ["Search", MagnifyingGlassIcon]]],
    ["Plan", [["Schedule", CalendarBlankIcon], ["Templates", CopyIcon], ["Scheduling rules", SlidersHorizontalIcon]]],
    ["People", [["Team", UsersThreeIcon], ["Updates", MegaphoneIcon]]],
    ["Time and pay", [["Timecards", ClockIcon, <span key="n" className="n">2</span>], ...(owner ? [["Payroll", CurrencyCircleDollarIcon] as NavItem] : []), ["Insights", ChartBarIcon]]],
    ...(owner ? [["Workspace", [["Settings", GearSixIcon]] as NavItem[]] as [string, NavItem[]]] : []),
  ];
  return (
    <div className="web">
      <aside className="side">
        <p className="wm">NEVORA</p>
        <div className="org"><span className="lg">N</span>Northside QA<CaretDownIcon className="car" size={12} weight="bold" /></div>
        {groups.map(([g, items]) => (
          <div key={g || "top"} style={{ display: "contents" }}>
            {g ? <p className="gh">{g}</p> : null}
            {items.map(([l, C, n]) => <span key={l} className="si" data-on={l === on ? "" : undefined}><C size={16} weight={l === on ? "fill" : "regular"} aria-hidden="true" />{l}{n}</span>)}
          </div>
        ))}
        <div className="foot"><Mono name="Morgan Rivera" />Morgan Rivera</div>
      </aside>
      <div className="main">
        <div className="bar">{crumb}<span className="sp" />{tools}<span className="kbtn icon" style={{ position: "relative" }}>{I(BellIcon, 15)}<span className="dot" style={{ position: "absolute", top: 6, right: 6 }} /></span></div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
const Head = ({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) => (
  <div className="ph"><div><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div>{right}</div>
);
const WR = ({ lead, n, mu, r, rt, first, sel }: { lead?: ReactNode; n: ReactNode; mu?: ReactNode; r?: ReactNode; rt?: "red" | "amber"; first?: boolean; sel?: boolean }) => (
  <div className={`wr${first ? " first" : ""}${sel ? " sel" : ""}`}>{lead}<span className="sp"><span className="nm">{n}</span>{mu ? <span className="mu"> · {mu}</span> : null}</span>{r !== undefined ? <span className={`r${rt ? " " + rt : ""}`}>{r}</span> : null}</div>
);

const tlRows: [string, number, number, "in" | "late" | "later"][] = [
  ["Jordan Rivera", 6, 14, "in"], ["Taylor Rivera", 7, 15, "late"], ["Alexandra Rivera", 8, 16, "late"], ["Riley Rivera", 8, 16, "late"],
  ["Casey Rivera", 9, 17, "in"], ["Sam Rivera", 9, 17, "late"], ["Quinn Rivera", 9, 17, "late"], ["María José Rivera Santiago", 10, 18, "late"], ["Avery Rivera", 17, 24, "later"],
];
function homeWeb(owner: boolean) {
  const x = (h: number) => `${((h - 6) / 18) * 100}%`;
  return (
    <Web on="Home" owner={owner} crumb={<b>Home</b>} tools={<span className="kbtn">{I(PlusIcon, 13, "bold")}Add shift</span>}>
      <Head title="Today" sub="Monday, October 19 · Main Office and West Office" />
      {owner ? <div className="box mt"><WR first lead={<span className="ico">{I(SquaresFourIcon, 15)}</span>} n="Finish setting up" mu="Next: set weekly hour targets" r="1 of 2 done" /></div> : null}
      <div className="grid2">
        <div className="box">
          <div className="box-h">Needs you <span>{NEEDS}</span></div>
          <WR lead={<span className="ico red">{I(UserMinusIcon, 15)}</span>} n="Not clocked in" mu="Main Office" r={<span className="big">6</span>} />
          <WR lead={<span className="ico red">{I(CalendarXIcon, 15)}</span>} n="Open shifts today" mu="Main Office 2, West Office 1" r={<span className="big">3</span>} />
          <WR lead={<span className="ico">{I(AirplaneTiltIcon, 15)}</span>} n="Time-off request" mu="Alexandra Rivera, Oct 29 – 30" r={<span className="big">1</span>} />
          <div className="wr" style={{ color: "#0B6B67", fontWeight: 500 }}>Open Inbox {I(CaretRightIcon, 12, "bold")}</div>
        </div>
        <div className="box">
          <div className="box-h">Working now <span>2 of 9 clocked in</span></div>
          <WR lead={<Mono name="Jordan Rivera" />} n="Jordan Rivera" mu="in at 5:55 AM" r="until 2:00 PM" />
          <WR lead={<Mono name="Casey Rivera" />} n="Casey Rivera" mu="in at 8:58 AM" r="until 5:00 PM" />
          <div className="box-h" style={{ borderTop: "1px solid #ECECEA" }}>Later today <span>1</span></div>
          <WR lead={<Mono name="Avery Rivera" />} n="Avery Rivera" mu="West Office" r="5:00 PM – 12:00 AM" />
        </div>
      </div>
      <div className="box mt">
        <div className="box-h">Shifts today <span>9</span></div>
        <div className="tl">
          <div className="ax"><span /><span className="tr">{["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"].map((t, i) => <span key={t} style={{ left: `${(i / 6) * 100}%`, transform: i === 0 ? "none" : i === 6 ? "translateX(-100%)" : undefined }}>{t}</span>)}</span></div>
          {tlRows.map(([n, s, e, k]) => (
            <div className="row" key={n}><span>{n}</span><span className="tr">{[0, 1, 2, 3, 4, 5, 6].map(g => <i key={g} className="g" style={{ left: `${(g / 6) * 100}%` }} />)}<i className={`b${k === "in" ? "" : " " + k}`} style={{ left: x(s), width: `calc(${x(e)} - ${x(s)})` }} /><i className="now" style={{ left: x(10.25) }} /></span></div>
          ))}
          <div className="key"><span><i style={{ background: "#0B6B67" }} />Clocked in</span><span><i style={{ border: "1px solid #E5958A" }} />Not clocked in</span><span><i style={{ background: "#E4E4E1" }} />Later</span><span><i style={{ width: 1, height: 12, background: "#D92D20" }} />Now, 10:15 AM</span></div>
        </div>
      </div>
    </Web>
  );
}

const inboxWeb = (
  <Web on="Inbox" crumb={<b>Inbox</b>}>
    <Head title="Inbox" sub={`${NEEDS} things need you today`} />
    <div className="utabs"><span data-on="">All<em>{NEEDS}</em></span><span>Act now<em>9</em></span><span>Requests<em>1</em></span><span>Plan ahead<em>4</em></span></div>
    <div className="split">
      <div className="lst">
        <p className="gh2">Not clocked in · 6</p>
        {late.slice(0, 4).map(([n, sh, ago], i) => <WR key={n} first={i === 0} sel={n === "Alexandra Rivera"} lead={<Mono name={n} />} n={n} mu={sh} r={ago} rt="red" />)}
        <div className="wr" style={{ color: "#0B6B67", fontWeight: 500 }}>Show 2 more</div>
        <p className="gh2">Open shifts today · 3</p>
        <WR first lead={<span className="ico red">{I(CalendarXIcon, 15)}</span>} n="Main Office" mu="12 – 7 AM, 5 PM – 12 AM" r="2" />
        <WR lead={<span className="ico red">{I(CalendarXIcon, 15)}</span>} n="West Office" mu="9 AM – 5 PM" r="1" />
        <p className="gh2">Requests · 1</p>
        <WR first lead={<Mono name="Alexandra Rivera" />} n="Alexandra Rivera" mu="Time off, Oct 29 – 30" r="Waiting" rt="amber" />
        <p className="gh2">Plan ahead</p>
        <WR first lead={<span className="ico">{I(CalendarBlankIcon, 15)}</span>} n="Open shifts later this week" r="18" />
        <WR lead={<span className="ico">{I(TargetIcon, 15)}</span>} n="People without hour targets" r="13" />
        <WR lead={<span className="ico">{I(HourglassIcon, 15)}</span>} n="Availability deadline" r="Not set" />
      </div>
      <div className="dt">
        <div className="hd"><Mono name="Alexandra Rivera" /><div><h2>Alexandra Rivera</h2><p className="meta" style={{ color: "#B42318" }}>Not clocked in · 2h 15m late</p></div></div>
        <dl className="kvs">
          <dt>Shift</dt><dd>Mon, Oct 19 · 8:00 AM – 4:00 PM</dd>
          <dt>Location</dt><dd>Main Office</dd>
          <dt>Role</dt><dd>Front desk</dd>
          <dt>Phone</dt><dd>(787) 555-0142</dd>
        </dl>
        <div className="acts"><span className="kbtn primary">Open timecard</span><span className="kbtn">Edit shift</span><span className="kbtn">View profile</span></div>
        <div className="hr" />
        <p style={{ font: "500 12px/16px var(--sys)", color: "#8A8A87", marginBottom: 6 }}>Activity</p>
        <div className="actv"><b>7:40 AM</b>Shift reminder sent</div>
        <div className="actv"><b>8:00 AM</b>Shift started with no clock-in</div>
      </div>
    </div>
  </Web>
);

const people: [string, string, (string | null)[]][] = [
  ["Jordan Rivera", "40h", ["6a – 2p", "6a – 2p", "6a – 2p", "6a – 2p", "6a – 2p", null, null]],
  ["Taylor Rivera", "40h", ["7a – 3p", "7a – 3p", null, "7a – 3p", "7a – 3p", "7a – 3p", null]],
  ["Alexandra Rivera", "24h", ["8a – 4p", "8a – 4p", "8a – 4p", "Time off", null, null, null]],
  ["Riley Rivera", "40h", ["8a – 4p", null, "8a – 4p", "8a – 4p", "8a – 4p", "8a – 4p", null]],
  ["Casey Rivera", "32h", ["9a – 5p", "9a – 5p", "9a – 5p", null, "9a – 5p", null, null]],
  ["Sam Rivera", "40h", ["9a – 5p", "9a – 5p", "9a – 5p", "9a – 5p", "9a – 5p", null, null]],
  ["Quinn Rivera", "32h", ["9a – 5p", null, "9a – 5p", "9a – 5p", null, "9a – 5p", null]],
  ["María José Rivera Santiago", "32h", ["10a – 6p", null, "10a – 6p", "10a – 6p", null, "10a – 6p", null]],
];
const scheduleWeb = (
  <Web on="Schedule" crumb={<><span>Schedule</span><span>/</span><b>Main Office</b></>} tools={<><span className="kbtn icon">{I(CaretLeftIcon, 13, "bold")}</span><span className="kbtn">Oct 19 – 25</span><span className="kbtn icon">{I(CaretRightIcon, 13, "bold")}</span><span className="kbtn">More{I(CaretDownIcon, 11, "bold")}</span><span className="kbtn primary">{I(PlusIcon, 13, "bold")}Add shift</span></>}>
    <Head title="Schedule" sub="Main Office published Oct 16 · West Office not planned · availability 0 of 8" />
    <div className="utabs"><span>All locations</span><span data-on="">Main Office</span><span>West Office</span></div>
    <div className="roster">
      <div className="r h"><div>8 people · 288h</div>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <div key={d} className={i === 0 ? "today" : ""}>{d} <b>{19 + i}</b></div>)}</div>
      <div className="r"><div><span className="ico red" style={{ width: 26, height: 26, borderRadius: 13, display: "grid", placeItems: "center", color: "#B42318", background: "#FEF0EE" }}>{I(CalendarXIcon, 14)}</span><span className="nm">Open shifts<small>9 this week</small></span></div>
        {[["12a – 7a", "5p – 12a"], ["5p – 12a"], ["12a – 7a", "5p – 12a"], ["5p – 12a"], ["12a – 7a"], ["5p – 12a"], []].map((c, i) => <div key={i}>{c.map(t => <span key={t} className="sh open">{t}</span>)}</div>)}
      </div>
      {people.map(([n, h, w]) => (
        <div className="r" key={n}><div><Mono name={n} /><span className="nm">{n}<small>{h}</small></span></div>
          {w.map((t, i) => <div key={i}>{t ? <span className={`sh${t === "Time off" ? " off" : ""}`}>{t}</span> : null}</div>)}</div>
      ))}
    </div>
  </Web>
);

const tc: [string, string, string, string, string][] = [
  ["Casey Rivera", "Support", "3h 00m", "10m", "Needs review"], ["Jordan Rivera", "Opening", "2h 00m", "—", "Missing clock-out"],
  ["Alexandra Rivera", "Front desk", "0h 00m", "—", "Draft"], ["Taylor Rivera", "Front desk", "0h 00m", "—", "Draft"], ["Riley Rivera", "Front desk", "0h 00m", "—", "Draft"],
  ["Sam Rivera", "Support", "0h 00m", "—", "Draft"], ["Quinn Rivera", "Support", "0h 00m", "—", "Draft"], ["María José Rivera Santiago", "Front desk", "0h 00m", "—", "Draft"],
];
const timecardsWeb = (
  <Web on="Timecards" crumb={<b>Timecards</b>} tools={<><span className="kbtn icon">{I(CaretLeftIcon, 13, "bold")}</span><span className="kbtn">This week · Oct 19 – 25</span><span className="kbtn icon">{I(CaretRightIcon, 13, "bold")}</span><span className="kbtn">{I(ExportIcon, 13)}Export</span></>}>
    <Head title="Timecards" sub="Approvals open after Sunday, Oct 25" />
    <div className="stat"><div><small>Timecards</small><b>13</b></div><div><small>Need review</small><b style={{ color: "#93500A" }}>2</b></div><div><small>Approved</small><b>0<em>of 13</em></b></div><div><small>Recorded</small><b>5h 00m</b></div></div>
    <div className="utabs"><span data-on="">All<em>13</em></span><span>Need review<em>2</em></span><span>Approved<em>0</em></span></div>
    <div className="box" style={{ marginTop: 16 }}>
      <table className="t">
        <thead><tr><th style={{ width: 28 }}><span className="ck" /></th><th>Person</th><th>Role</th><th className="r">Recorded</th><th className="r">Breaks</th><th>Status</th></tr></thead>
        <tbody>{tc.map(([n, r, h, b, s]) => (
          <tr key={n}><td><span className="ck" /></td><td><span className="p"><Mono name={n} />{n}</span></td><td style={{ color: "#6B6B68" }}>{r}</td><td className="r">{h}</td><td className="r" style={{ color: "#8A8A87" }}>{b}</td>
            <td style={{ color: s === "Draft" ? "#8A8A87" : "#93500A" }}>{s}</td></tr>
        ))}</tbody>
      </table>
    </div>
  </Web>
);

const insightsWeb = (
  <Web on="Insights" crumb={<b>Insights</b>} tools={<><span className="kbtn">Last week · Oct 13 – 19{I(CaretDownIcon, 11, "bold")}</span><span className="kbtn">{I(ExportIcon, 13)}Export</span></>}>
    <Head title="Insights" sub="Recorded hours, time off and approvals for the period" />
    <div className="stat"><div><small>Recorded time</small><b>5h 1m</b></div><div><small>People with time</small><b>2<em>of 13</em></b></div><div><small>Time off taken</small><b>0<em>days</em></b></div><div><small>Timecards to finish</small><b>13</b></div></div>
    <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
      <div className="box"><div className="box-h">Recorded time by day <span>hours</span></div><div className="wchart"><Plot h={200} /></div></div>
      <div className="box">
        <div className="box-h">Hours by person <a>All 13</a></div>
        <WR lead={<Mono name="Casey Rivera" />} n="Casey Rivera" mu="3 shifts" r="3h 1m" />
        <WR lead={<Mono name="Jordan Rivera" />} n="Jordan Rivera" mu="2 shifts" r="2h 0m" />
        <WR n="11 people with no recorded time" r="0h" />
      </div>
    </div>
  </Web>
);

/* ============================== Write ============================== */
const pages: Record<string, ReactNode> = {
  "home-390": homePhone(false), "home-owner-390": homePhone(true), "home-1440": homeWeb(false), "home-owner-1440": homeWeb(true),
  "inbox-390": inboxPhone, "inbox-item-390": inboxItemPhone, "inbox-1440": inboxWeb, "more-390": morePhone,
  "schedule-390": schedulePhone, "schedule-1440": scheduleWeb,
  "timecards-390": timecardsPhone, "timecards-1440": timecardsWeb,
  "insights-390": insightsPhone, "insights-1440": insightsWeb,
};
for (const [name, node] of Object.entries(pages)) {
  writeFileSync(join(out, `${name}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${name}</title><style>${css}</style></head><body>${renderToStaticMarkup(<>{node}</>)}</body></html>`);
}
console.log(`wrote ${Object.keys(pages).length} pages`);
