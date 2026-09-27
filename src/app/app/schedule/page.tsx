import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

const people = [
  { name: "Maria Rivera", mon: "6–2", tue: "6–2", wed: "Off", thu: "6–2", fri: "6–2", hours: "32h" },
  { name: "Carlos Cruz", mon: "7–3", tue: "7–3", wed: "7–3", thu: "Off", fri: "7–3", hours: "32h" },
  { name: "Ana López", mon: "10–6", tue: "Off", wed: "10–6", thu: "10–6", fri: "10–6", hours: "32h" },
];

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        eyebrow="Sep 28 – Oct 4"
        title="Weekly Schedule"
        description="Build the week, check conflicts, and publish when everything is ready."
        actions={
          <>
            <button className="button secondary">Copy Previous Week</button>
            <button className="button primary">Publish Schedule</button>
          </>
        }
      />

      <div className="toolbar">
        <div className="segmented">
          <button className="selected">All Locations</button>
          <button>Location 1</button>
          <button>Location 2</button>
        </div>
        <StatusPill tone="warning">Draft</StatusPill>
      </div>

      <section className="schedule-desktop panel flush">
        <div className="schedule-row schedule-head">
          <span>Employee</span><span>Mon 28</span><span>Tue 29</span><span>Wed 30</span><span>Thu 1</span><span>Fri 2</span><span>Hours</span>
        </div>
        {people.map((person) => (
          <div className="schedule-row" key={person.name}>
            <strong>{person.name}</strong>
            {[person.mon, person.tue, person.wed, person.thu, person.fri].map((shift, index) => (
              <button key={index} className={shift === "Off" ? "shift-cell off" : "shift-cell"}>
                {shift}
              </button>
            ))}
            <strong className="hours">{person.hours}</strong>
          </div>
        ))}
      </section>

      <section className="schedule-mobile">
        <article className="day-card">
          <div className="day-heading"><div><span>Monday</span><strong>Sep 28</strong></div><button className="text-link">+ Add shift</button></div>
          <div className="mobile-shift"><div><strong>Maria Rivera</strong><span>Location 1</span></div><b>6:00 AM – 2:00 PM</b></div>
          <div className="mobile-shift"><div><strong>Carlos Cruz</strong><span>Location 1</span></div><b>7:00 AM – 3:00 PM</b></div>
          <div className="mobile-shift"><div><strong>Ana López</strong><span>Location 2</span></div><b>10:00 AM – 6:00 PM</b></div>
        </article>
        <article className="day-card">
          <div className="day-heading"><div><span>Tuesday</span><strong>Sep 29</strong></div><button className="text-link">+ Add shift</button></div>
          <div className="mobile-shift"><div><strong>Maria Rivera</strong><span>Location 1</span></div><b>6:00 AM – 2:00 PM</b></div>
          <div className="mobile-shift"><div><strong>Carlos Cruz</strong><span>Location 1</span></div><b>7:00 AM – 3:00 PM</b></div>
        </article>
      </section>
    </>
  );
}
