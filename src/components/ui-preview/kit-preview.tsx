import { AirplaneIcon } from "@phosphor-icons/react/dist/ssr/Airplane";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import {
  ActionBar, Avatar, Button, Card, CardBody, Duration, FilterPills, Freshness, IconButton,
  KitContent, KitLink, KitPage, Masthead, Money, NextUp, Progress, Row, Rows, StatGrid, Status, Tile, Toast,
} from "@/components/kit/kit";

/* Fictional sample for the kit. Every person, time and amount is made up.
 * Links point at the preview itself so nothing here reaches a live record. */

const sample = "#sample";

function BandActions() {
  return (
    <>
      <IconButton label="Search" href={sample}><MagnifyingGlassIcon size={22} aria-hidden="true" /></IconButton>
      <IconButton label="Notifications, 2 unread" href={sample} dot><BellIcon size={22} aria-hidden="true" /></IconButton>
    </>
  );
}

export function KitHomeSample() {
  return (
    <KitPage className="kit-preview-screen">
      <Masthead
        product="Manager"
        actions={<BandActions />}
        eyebrow="Saturday, October 18"
        title="Good morning, Morgan"
        summary="2 things need you today. The week is 3 of 4 published."
      />
      <KitContent label="Home">
        <NextUp
          icon={<AirplaneIcon size={22} weight="bold" />}
          title={<>Alexandra Rivera asked for <span className="kit-preview-nowrap">Oct 28–29</span> off</>}
          body="Full day, both days. Sent yesterday at 4:12 PM."
          action={{ href: sample, label: "Review time off" }}
        />
        <Card title="Right now" meta={<Freshness>As of 6:14 AM</Freshness>}>
          <StatGrid stats={[
            { label: "On shift", value: 4 },
            { label: "Starting soon", value: 2 },
            { label: "Late", value: 1, tone: "urgent", href: sample, ariaLabel: "1 person late" },
          ]} />
        </Card>
        <Card title="This week" meta="Oct 12–18">
          <Progress label="Schedules published" value={3} max={4} valueText="3 of 4 locations" note="Harbor Kitchen is still a draft." tone="review" />
          <Progress label="Availability" value={0} max={5} valueText="0 of 5 sent" note="Employees and leads only." />
        </Card>
        <Card title="Needs you" meta="2">
          <Rows label="Needs you">
            <Row
              leading={<Avatar initials="AR" waiting />}
              title="Alexandra Rivera"
              meta="Time off · Oct 28–29"
              status={<Status tone="review">Waiting</Status>}
              href={sample}
              label="Alexandra Rivera, time off Oct 28 to 29, waiting"
            />
            <Row
              leading={<Tile tone="urgent"><TimerIcon size={20} weight="bold" /></Tile>}
              title="Jordan Pérez has no clock-out"
              meta="Thursday · Main Office"
              status={<Status tone="urgent">Fix</Status>}
              href={sample}
              label="Jordan Pérez has no clock-out on Thursday, fix"
            />
          </Rows>
        </Card>
      </KitContent>
    </KitPage>
  );
}

export function KitReviewSample() {
  return (
    <KitPage className="kit-preview-screen">
      <Masthead
        back={{ href: sample, label: "Inbox" }}
        eyebrow="Time off request"
        title="Alexandra Rivera"
        summary="Server · Main Office"
      />
      <KitContent label="Request">
        <Card title="Dates" meta={<Status tone="review">Waiting</Status>}>
          <Rows label="Request details">
            <Row title="Tue, Oct 28 – Wed, Oct 29" meta="Full day, both days" />
            <Row title="Note" meta="Fictional family appointment out of town." />
            <Row title="Sent" meta="Fri, Oct 17 at 4:12 PM" />
          </Rows>
        </Card>
        <Card title="Shifts that week" meta="Oct 26 – Nov 1">
          <Rows label="Scheduled shifts">
            <Row leading={<Tile><CalendarCheckIcon size={20} weight="bold" /></Tile>} title="Tue · 9:00 AM – 5:00 PM" meta="Main Office" trailing={<Duration minutes={480} />} />
            <Row leading={<Tile><ArrowsLeftRightIcon size={20} weight="bold" /></Tile>} title="Thu · 4:00 PM – midnight" meta="Main Office" trailing={<Duration minutes={480} />} />
          </Rows>
        </Card>
        <ActionBar label="Decision">
          <Button kind="secondary">Decline</Button>
          <Button>Approve</Button>
        </ActionBar>
      </KitContent>
    </KitPage>
  );
}

export function KitParts() {
  return (
    <KitPage className="kit-preview-screen">
      <Masthead
        eyebrow="Reference"
        title="Parts"
        summary="Each piece once, in each state."
        extra={<FilterPills label="Sample filters" items={[
          { href: "#all", label: "All", current: true },
          { href: "#requests", label: "Requests" },
          { href: "#time", label: "Time" },
          { href: "#planning", label: "Planning" },
        ]} />}
      />
      <KitContent label="Parts">
        <Card title="Status" meta="A condition, never an action">
          <CardBody>
            <div className="kit-preview-wrap">
              <Status tone="neutral">Draft</Status>
              <Status tone="review">Waiting</Status>
              <Status tone="done">Published</Status>
              <Status tone="urgent">Fix</Status>
            </div>
          </CardBody>
        </Card>
        <Card title="Actions" meta="One action colour">
          <CardBody>
            <div className="kit-preview-stack">
              <Button block>Publish Main Office</Button>
              <Button kind="secondary" block>Copy last week</Button>
              <Button block blockedReason="Approve after Oct 18">Approve timecard</Button>
              <KitLink href={sample}>Review time off</KitLink>
            </div>
          </CardBody>
        </Card>
        <Card title="Figures" meta="Exact, never animated">
          <Rows label="Figures">
            <Row title="Gross pay" meta="Oct 5–18" trailing={<span className="kit-preview-figure"><Money amount={1284.5} /></span>} />
            <Row title="Hours" meta="This week so far" trailing={<span className="kit-preview-figure"><Duration minutes={2310} /></span>} />
          </Rows>
        </Card>
        <Card title="Freshness">
          <CardBody>
            <div className="kit-preview-stack">
              <Freshness>As of 6:14 PM</Freshness>
              <Freshness state="stale">Updated 20 minutes ago</Freshness>
              <Freshness state="offline">Offline. Actions are paused.</Freshness>
            </div>
          </CardBody>
        </Card>
        <Toast icon={<CheckIcon size={16} weight="bold" />} title="Time off approved" meta="Alexandra will be told." />
      </KitContent>
    </KitPage>
  );
}

export function KitPreview() {
  return (
    <div className="kit-preview">
      <div className="kit-preview-tools">
        <strong>Kit · fictional sample</strong>
        <p>Phase 1 parts. Not connected to any data; every link stays on this page.</p>
      </div>
      <div className="kit-preview-grid">
        <KitHomeSample />
        <KitReviewSample />
        <KitParts />
      </div>
    </div>
  );
}
