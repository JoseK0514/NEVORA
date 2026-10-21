"""The other employee pages in the Home v5 language (phone mockups). Run: python3 -I pages5.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("h5", HERE / "home5.py")
h5 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h5)
ln, SB, TOP, CHEV, CHEV_W, REFRESH, RING, row, dt = h5.ln, h5.SB, h5.TOP, h5.CHEV, h5.CHEV_W, h5.REFRESH, h5.RING, h5.row, h5.dt
HOME, CAL, REQ, PAY, MORE = h5.HOME, h5.CAL, h5.REQ, h5.PAY, h5.MORE

DOWN = ln('<path d="M12 4.5v11M7.5 11 12 15.5 16.5 11M5 19.5h14"/>', 18, 1.8)
LOCK = ln('<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 16, 1.7)
SEARCH = ln('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', 20, 1.7)
PREV = ln('<path d="m14.5 6-6 6 6 6"/>', 22, 1.8)
NEXT = ln('<path d="m9.5 6 6 6-6 6"/>', 22, 1.8)


def tabs(on):
    names = [("Home", HOME), ("Schedule", CAL), ("Requests", REQ), ("Pay", PAY), ("More", MORE)]
    return '<div class="tabs">' + "".join(f'<span{" class=on" if n == on else ""}>{i}{n}</span>' for n, i in names) + '</div>'


def phone(body, on, cls="long"):
    return f'<div class="ios {cls}">{SB}{TOP}{body}{tabs(on)}</div>'


def title(t, sub):
    return f'<div class="pt"><h1>{t}</h1><p>{sub}</p></div>'


def seg(*items):
    return '<div class="seg">' + "".join(f'<span{" class=on" if i == 0 else ""}>{x}</span>' for i, x in enumerate(items)) + '</div>'


def sec(t, action=""):
    a = f'<a>{action}</a>' if action else ""
    return f'<div class="sec"><h2>{t}</h2>{a}</div>'


def plain(t, sub=None, right=CHEV, extra=""):
    return row("", t, sub, right, " plain" + extra)


# ---------- Schedule ----------
days = [("Mon", 19, " class=off"), ("Tue", 20, " class=on"), ("Wed", 21, ""), ("Thu", 22, ""), ("Fri", 23, ""), ("Sat", 24, ""), ("Sun", 25, "")]
week = '<div class="wk">' + "".join(f'<span{c}>{d}<b>{n}</b><i></i></span>' for d, n, c in days) + '</div>'
shifts = "".join(
    row(dt(d, n).replace('class="dt"', 'class="dt today"') if n == 20 else dt(d, n), "8:00 AM – 4:00 PM",
        "Main Office · Customer Support", CHEV, " d")
    for d, n, _ in days[1:])
schedule = phone(
    title("My schedule", "Oct 19 – 25 · 6 shifts · 48h")
    + seg("My shifts", "Open shifts")
    + f'<section class="hero"><div class="nav"><i>{PREV}</i><b>This week</b><i>{NEXT}</i></div>{week}'
      '<div class="ask"><p><b>Confirm this week’s schedule</b>Your manager asks you to check your shifts.</p>'
      '<div class="wbtn">Confirm schedule</div></div></section>'
    + '<p class="quiet">Main Office is published. West Office hasn’t published this week yet.</p>'
    + sec("This week") + f'<div class="grp">{shifts}</div>'
    + sec("Planning ahead") + '<div class="grp">'
    + plain("What changed in your schedule", "Changes your manager made")
    + plain("Shift requests", "Swap or give away a shift")
    + plain("Update availability", "When you can work")
    + plain("Add shifts to your calendar", "Apple, Google or Outlook")
    + '</div>', "Schedule")

# ---------- Requests ----------
requests = phone(
    title("Requests", "1 waiting for approval")
    + seg("Time off", "Shift swaps", "Availability")
    + '<section class="hero"><span class="k">Time off</span><b class="big">Need time away?</b>'
      '<span class="w">Ask for a full day, a few days or part of a day. Your manager reviews it.</span>'
      '<div class="wbtn" style="margin-bottom:20px">Request time off</div></section>'
    + sec("My requests", "See all 5") + '<div class="grp">'
    + row(dt("Oct", 29), "Oct 29 – 30", "2 full days · Sent Oct 19", '<span class="st wait">Waiting</span>', " d")
    + row(dt("Nov", 13), "Fri, Nov 13", "Full day", '<span class="st good">Approved</span>', " d")
    + row(dt("Nov", 18), "Nov 18 – 19", "2 full days", '<span class="st no">Declined</span>', " d")
    + '</div>', "Requests")

# ---------- Pay ----------
pay = phone(
    title("My pay", "Your published pay statements")
    + seg("Statements", "My time", "Timecards")
    + '<section class="hero"><span class="k">Latest statement</span><b class="big">Payday Tue, Oct 6</b>'
      '<span class="w">Sep 28 – Oct 4 · From your payroll provider</span>'
      f'<div class="wbtn" style="margin-bottom:20px">{DOWN}Download PDF</div></section>'
    + sec("Earlier") + '<div class="grp">'
    + row("", "Sep 21 – 27", "Payday Tue, Sep 29", f'<span class="dl">{DOWN}</span>', " plain")
    + row("", "Sep 14 – 20", "Payday Tue, Sep 22", f'<span class="dl">{DOWN}</span>', " plain")
    + '</div>'
    + f'<p class="lock">{LOCK}<span>Only your own statements are here. Downloaded files may contain personal pay details.</span></p>', "Pay")

# ---------- My time ----------
mytime = phone(
    title("My time", "Payday Tue, Oct 27 · for Oct 19 – 25")
    + seg("Statements", "My time", "Timecards").replace('<span class=on>Statements</span><span>My time</span>', '<span>Statements</span><span class=on>My time</span>')
    + '<section class="hero"><span class="k"><i></i>Today · Oct 20</span><b class="big">Off clock</b>'
      '<span class="w">Use your location’s Clocker to record punches.</span>'
      '<div class="stats"><div><small>Recorded</small><strong>0h</strong></div><div><small>Breaks</small><strong>0h</strong></div></div>'
      f'<div class="foot"><span class="note2">Updated 3:59 PM</span><span class="act"><span class="ib">{REFRESH}</span><span class="lk">Details{CHEV_W}</span></span></div></section>'
    + sec("Recent entries") + '<div class="grp"><p class="empty">No entries yet this week.</p></div>'
    + sec("Corrections") + '<div class="grp">'
    + plain("Request a correction", "Your manager reviews it. Your original times are kept.")
    + '</div><p class="quiet">No correction requests yet.</p>', "Pay")

# ---------- Notifications ----------
notifs = phone(
    title("Notifications", "Schedule, requests and team updates")
    + seg("All <em>3</em>", "Unread <em>3</em>", "To do <em>3</em>")
    + f'<div class="search">{SEARCH}Search notifications</div>'
    + sec("Today") + '<div class="grp">'
    + row('<span class="unread"></span>', "Read the team update", "Team update · 7:00 AM", CHEV)
    + row('<span class="unread"></span>', "Review your schedule", "Week of Oct 26 · 7:00 AM", CHEV)
    + row('<span class="unread"></span>', "Review your schedule", "Week of Oct 19 · 7:00 AM", CHEV)
    + '</div><p class="quiet">Opening a notification doesn’t complete it. You still review the update or schedule.</p>', "More")

# ---------- Profile ----------
profile = phone(
    '<div class="prof"><span class="ava">AR</span><b>Alexandra Rivera</b><span>Employee · Northside QA Workforce</span></div>'
    + sec("Sign-in and security") + '<div class="grp">'
    + plain("Face ID", "Sign in with a glance on this iPhone", '<span class="val">Set up</span>' + CHEV)
    + '</div>' + sec("Preferences") + '<div class="grp">'
    + plain("Language", None, '<span class="mini"><span class="on">English</span><span>Español</span></span>')
    + plain("Notifications", "Alerts on this device", '<span class="val">Off</span>' + CHEV)
    + plain("Add shifts to your calendar", None, '<span class="val">Not set up</span>' + CHEV)
    + '</div>' + sec("Your details") + '<div class="grp">'
    + '<div class="kv"><span>Company</span><b>Northside QA Workforce</b></div>'
    + '<div class="kv"><span>Work locations</span><b>Main Office · West Office</b></div>'
    + '<div class="kv"><span>App access</span><b>Employee</b></div>'
    + '<div class="kv"><span>Time zone</span><b>Puerto Rico time</b></div>'
    + '</div><p class="helpline">Something wrong here? Ask your manager to update it.</p>'
    + '<div class="signout">Sign out</div>', "More")

# ---------- More sheet over Home ----------
home_top = '<div class="hi"><p>Tuesday, October 20</p><h1>Hi, Alexandra</h1></div>' + h5.hero()
more = (f'<div class="ios sheetv">{SB}{TOP}{home_top}{tabs("More")}<div class="scrim"></div>'
        '<div class="msh"><div class="grab"></div><div class="who"><span class="ava">AR</span><span><b>Alexandra Rivera</b><small>Employee · Northside QA Workforce</small></span></div>'
        '<div class="grp">'
        + plain("My time", "Punches, breaks and corrections")
        + plain("Team updates", "News from your workplace")
        + plain("Notifications", "3 unread", '<span class="unread"></span>' + CHEV)
        + plain("Profile and settings", "Face ID, language, calendar")
        + '</div><div class="grp">' + plain("Sign out", None, "", " red") + '</div></div></div>')

pages = {"p5-schedule": schedule, "p5-requests": requests, "p5-pay": pay, "p5-mytime": mytime,
         "p5-notifications": notifs, "p5-profile": profile, "p5-more": more}
head = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="pages5.css"><style>.cw{{flex:none;color:rgba(255,255,255,.55)}}</style></head><body>{b}</body></html>'
for name, body in pages.items():
    (HERE / f"{name}.html").write_text(head.format(n=name, b=body))
labels = [("p5-schedule", "Schedule"), ("p5-requests", "Requests"), ("p5-pay", "Pay"), ("p5-mytime", "My time"),
          ("p5-notifications", "Notifications"), ("p5-profile", "Profile"), ("p5-more", "More (sheet)")]
board = '<div class="board">' + "".join(f'<div class="f"><span>{lab}</span>{pages[n]}</div>' for n, lab in labels) + '</div>'
(HERE / "p5-board.html").write_text(head.format(n="board", b=board))
print("ok")
