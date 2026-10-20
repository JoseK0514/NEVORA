"""Every employee page in the Withings-style Home language (phone mockups). Run: python3 -I allpages.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("h4", HERE / "home4.py")
h4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h4)
ln, SB, BELL, PLUS, TICK = h4.ln, h4.SB, h4.BELL, h4.PLUS, h4.TICK
HOME, CAL, REQ, PAY, MORE = h4.HOME, h4.CAL, h4.REQ, h4.PAY, h4.MORE
DOC, CALI, CLOCKI = h4.DOC, h4.CALI, h4.CLOCKI

CHEV = '<svg class="chev" width="8" height="14" viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
DOWN = ln('<path d="M12 4.5v11M7.5 11 12 15.5 16.5 11M5 19.5h14"/>', 18)
SWAP = ln('<path d="M16 4.5 19.5 8 16 11.5M19.5 8H7M8 12.5 4.5 16 8 19.5M4.5 16H17"/>', 22)
SUNI = ln('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>', 22)
PEN = ln('<path d="M5 19.5h3.5L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5Z"/><path d="m14.5 7.5 3 3"/>', 22)
FACE = ln('<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5c0 .4-.3.7-.7.7H11M9.6 16a3.4 3.4 0 0 0 4.8 0"/>', 22)
GLOBE = ln('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z"/>', 22)
HELP = ln('<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1.1.9-1.1 1.6v.4M12 16.8v.2"/>', 22)
OUT = ln('<path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5M10 8l-4 4 4 4M6 12h9.5"/>', 22)
NEWS = ln('<path d="M5 5.5h11v13H6.5A1.5 1.5 0 0 1 5 17Z"/><path d="M16 9h3v8.5a1 1 0 0 1-2 0V9M8 9h5M8 12.5h5M8 16h3"/>', 22)
LOCK = ln('<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 15)


def tabs(on):
    names = [("Home", HOME), ("Schedule", CAL), ("Requests", REQ), ("Pay", PAY), ("More", MORE)]
    return '<div class="tabs">' + "".join(f'<span{" class=on" if n == on else ""}>{i}{n}</span>' for n, i in names) + '</div>'


def top():
    return (f'<div class="top"><span class="rb av">AR</span><span class="r"><span class="rb">{PLUS}</span>'
            f'<span class="rb">{BELL}<i class="dot"></i></span></span></div>')


def it(th, cls, title, sub, right="", extra=""):
    s = f'<span>{sub}</span>' if sub else ""
    return f'<div class="it{extra}"><span class="th {cls}">{th}</span><span class="tx"><b>{title}</b>{s}</span>{right}</div>'


def day(d, n):
    return f'<small>{d}</small><strong>{n}</strong>'


def phone(body, on, cls=""):
    return f'<div class="ios pg {cls}">{SB}{top()}{body}{tabs(on)}</div>'


# Schedule
week = ('<div class="week">' + "".join(f'<span{" class=on" if d == "Tue" else ""}>{d}<b>{n}</b><i></i></span>' for d, n in
        [("Mon", 19), ("Tue", 20), ("Wed", 21), ("Thu", 22), ("Fri", 23), ("Sat", 24), ("Sun", 25)]) + '</div>')
days = [("Mon", 19), ("Tue", 20), ("Wed", 21), ("Thu", 22), ("Fri", 23)]
schedule = phone(
    '<p class="hi sm">My schedule<span>Oct 19 – 25 · 7 shifts · 56h</span></p>'
    '<div class="seg"><span class="on">My shifts</span><span>Open shifts</span></div>' + week
    + '<div class="cardx"><div class="in"><span class="k">Your manager asks</span><b class="t">Confirm this week’s schedule</b>'
      '<span class="s">Check your shifts, then let your manager know you’ve seen them.</span><div class="btn">Confirm schedule</div></div></div>'
    + '<h2 class="t">This week</h2><div class="items">'
    + "".join(it(day(d, n), "day", "8:00 AM – 4:00 PM", "Main Office · Customer Support", CHEV, " today" if d == "Tue" else "") for d, n in days)
    + '</div><p class="note">West Office hasn’t published this week yet. Times in Puerto Rico time.</p>', "Schedule")

# My time
mytime = phone(
    '<p class="hi sm">My time<span>Payday Tue, Oct 27 · for Oct 19 – 25</span></p>'
    '<div class="cardx"><div class="in"><div class="top2"><span class="k">Today · Oct 20</span><span class="pill">Off clock</span></div>'
    '<div class="stats"><div><small>Recorded</small><strong>0h</strong></div><div><small>Breaks</small><strong>0h</strong></div></div>'
    '<span class="s">Clock in and out on your location’s Clocker. Your time shows here.</span></div></div>'
    '<h2 class="t">Recent entries</h2><div class="empty">No entries yet this week.</div>'
    '<h2 class="t">Corrections</h2><div class="items">'
    + it(PEN, "", "Request a correction", "Your manager reviews it. Your original times are kept.", CHEV)
    + '</div>', "More")

# Requests
requests = phone(
    '<p class="hi sm">Requests<span>1 waiting for approval</span></p>'
    '<div class="seg"><span class="on">Time off</span><span>Shift swaps</span><span>Availability</span></div>'
    '<div class="cardx"><div class="in"><b class="t">Need time away?</b>'
    '<span class="s">Ask for a full day, a few days or part of a day. Your manager reviews it.</span><div class="btn">Request time off</div></div></div>'
    '<h2 class="t">My requests</h2><div class="items">'
    + it(CALI, "t2", "Oct 29 – 30", "Full days · Sent Oct 19", '<span class="st wait">Waiting</span>')
    + it(CALI, "t3", "Fri, Nov 13", "Full day", '<span class="st ok">Approved</span>')
    + it(CALI, "", "Nov 18 – 19", "Full days", '<span class="st no">Declined</span>')
    + '</div>', "Requests")

# Pay
pay = phone(
    '<p class="hi sm">My pay<span>Your published pay statements</span></p>'
    '<div class="seg"><span class="on">Statements</span><span>My time</span><span>Timecards</span></div>'
    '<div class="cardx"><div class="in"><span class="k">Latest · Payday Tue, Oct 6</span><b class="t">Sep 28 – Oct 4</b>'
    '<span class="s">From your payroll provider · PDF</span><div class="btn">' + DOWN + 'Download statement</div></div></div>'
    '<h2 class="t">Earlier</h2><div class="items">'
    + it(DOC, "", "Sep 21 – 27", "Payday Tue, Sep 29", f'<span class="dl">{DOWN}</span>')
    + it(DOC, "", "Sep 14 – 20", "Payday Tue, Sep 22", f'<span class="dl">{DOWN}</span>')
    + '</div>'
    f'<p class="privacy">{LOCK}<span>Only your own statements are here. Downloaded files may contain personal pay details.</span></p>', "Pay")

# Notifications
notifs = phone(
    '<p class="hi sm">Notifications<span>Schedule, requests and team updates</span></p>'
    '<div class="seg"><span class="on">All <em>3</em></span><span>Unread <em>3</em></span><span>To do <em>3</em></span></div>'
    '<h2 class="t">Today</h2><div class="items">'
    + it(NEWS, "t3", "Read the team update", "Team update · 7:00 AM", '<span class="unread"></span>')
    + it(CALI, "t2", "Review your schedule", "Week of Oct 26 · 7:00 AM", '<span class="unread"></span>')
    + it(CALI, "t2", "Review your schedule", "Week of Oct 19 · 7:00 AM", '<span class="unread"></span>')
    + '</div><p class="note">Opening a notification doesn’t complete it. You’ll still review the update or schedule.</p>', "More")

# Profile
profile = phone(
    '<div class="prof"><span class="ava">AR</span><b>Alexandra Rivera</b><span>Employee · Northside QA Workforce</span></div>'
    '<h2 class="t">Sign-in and security</h2><div class="items">'
    + it(FACE, "", "Face ID", "This iPhone · Sign in with a glance", '<span class="st ok">On</span>' + CHEV)
    + '</div><h2 class="t">Preferences</h2><div class="items">'
    + it(GLOBE, "t2", "Language", None, '<span class="val">English</span>' + CHEV)
    + it(h4.BELL.replace('width="22" height="22"', 'width="22" height="22"'), "t2", "Notifications", None, '<span class="val">Off</span>' + CHEV)
    + it(CALI, "t2", "Calendar", "Add your shifts to your phone", '<span class="val">Not set up</span>' + CHEV)
    + '</div><h2 class="t">Your workplace</h2><div class="items">'
    + it(CLOCKI, "t3", "Main Office · West Office", "Times in Puerto Rico time", "")
    + '</div><h2 class="t">Help</h2><div class="items">'
    + it(HELP, "", "Help and support", None, CHEV)
    + '</div><div class="signout">Sign out</div>', "More")

# More sheet over Home
home_body = (f'<p class="hi">Hi, Alexandra<span>Tuesday, October 20</span></p>{h4.BIG}')
more = (f'<div class="ios sheetv">{SB}{top()}{home_body}{tabs("More")}<div class="scrim"></div>'
        '<div class="msh"><div class="grab"></div><div class="who"><span class="ava">AR</span><span><b>Alexandra Rivera</b><span>Employee · Northside QA Workforce</span></span></div><div class="items">'
        + it(CLOCKI, "", "My time", "Punches, breaks and corrections", CHEV)
        + it(NEWS, "t3", "Team updates", "News from your workplace", CHEV)
        + it(BELL, "t2", "Notifications", "3 unread", CHEV)
        + it(FACE, "", "Profile and settings", "Face ID, language, calendar", CHEV)
        + it(OUT, "", "Sign out", None, "", " red")
        + '</div></div></div>')

pages = {"ap-schedule": schedule, "ap-mytime": mytime, "ap-requests": requests, "ap-pay": pay,
         "ap-notifications": notifs, "ap-profile": profile, "ap-more": more}
for name, body in pages.items():
    (HERE / "html" / f"{name}.html").write_text(f'<!doctype html><html><head><meta charset="utf-8"><title>{name}</title><link rel="stylesheet" href="../allpages.css"></head><body>{body}</body></html>')
print("ok", len(pages))
