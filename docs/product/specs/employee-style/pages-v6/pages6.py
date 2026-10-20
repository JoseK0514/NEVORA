"""Employee pages v6: page-specific decisions instead of one template. Run: python3 -I pages6.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p5", HERE / "pages5.py")
p5 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p5)
h5 = p5.h5
ln, SB, TOP, CHEV, CHEV_W, REFRESH, row, dt = h5.ln, h5.SB, h5.TOP, h5.CHEV, h5.CHEV_W, h5.REFRESH, h5.row, h5.dt
tabs, title, seg, plain, DOWN, LOCK, SEARCH, PREV, NEXT = p5.tabs, p5.title, p5.seg, p5.plain, p5.DOWN, p5.LOCK, p5.SEARCH, p5.PREV, p5.NEXT
DOC = ln('<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M13.5 3.5V8h4.5M9 12.5h6M9 16h4"/>', 22, 1.6)
PLUS = ln('<path d="M12 6v12M6 12h12"/>', 18, 2)


def phone(body, on, cls="long"):
    return f'<div class="ios {cls}">{SB}{TOP}{body}{tabs(on)}</div>'


def lab(t, action=""):
    return f'<div class="lab"><h2>{t}</h2>{f"<a>{action}</a>" if action else ""}</div>'


# ---------- Schedule ----------
days = [("M", 19, " class=off"), ("T", 20, " class=on"), ("W", 21, ""), ("T", 22, ""), ("F", 23, ""), ("S", 24, ""), ("S", 25, "")]
strip = '<div class="strip">' + "".join(f'<span{c}>{d}<b>{n}</b><i></i></span>' for d, n, c in days) + '</div>'
names = [("Tue", 20), ("Wed", 21), ("Thu", 22), ("Fri", 23), ("Sat", 24), ("Sun", 25)]
shifts = "".join(row(dt(d, n).replace('class="dt"', 'class="dt today"') if n == 20 else dt(d, n), "8:00 AM – 4:00 PM",
                     "Main Office · Customer Support", CHEV, " d") for d, n in names)
schedule = phone(
    title("My schedule", "6 shifts · 48 hours this week")
    + seg("My shifts", "Open shifts")
    + f'<div class="range"><b>Oct 19 – 25</b><span class="arrows"><i>{PREV}</i><i>{NEXT}</i></span></div>' + strip
    + '<div class="askrow"><p><b>Confirm this week</b>Your manager asked you to check it.</p><span class="pill">Confirm</span></div>'
    + lab("Shifts") + f'<div class="grp">{shifts}</div>'
    + '<p class="quiet">West Office hasn’t published this week yet. Shifts shown are published.</p>'
    + lab("Planning ahead") + '<div class="grp">'
    + plain("What changed", "Changes your manager made")
    + plain("Swap or give away a shift")
    + plain("Update availability")
    + plain("Add shifts to your calendar")
    + '</div>', "Schedule")

# ---------- Requests ----------
requests = phone(
    title("Requests", "1 waiting for approval")
    + seg("Time off", "Shift swaps", "Availability")
    + f'<div class="cta">{PLUS}Request time off</div>'
    + lab("Waiting") + '<div class="grp">'
    + row(dt("Oct", 29), "Oct 29 – 30", "2 full days · Sent Oct 19", '<span class="stat wait">Waiting</span>', " d")
    + '</div>' + lab("Decided") + '<div class="grp">'
    + row(dt("Nov", 13), "Fri, Nov 13", "Full day", '<span class="stat good">Approved</span>', " d")
    + row(dt("Nov", 18), "Nov 18 – 19", "2 full days", '<span class="stat no">Declined</span>', " d")
    + f'<div class="more-row" style="border-top:1px solid var(--rule)">All 5 requests{CHEV}</div>'
    + '</div>', "Requests")

# ---------- Pay ----------
pay = phone(
    title("My pay", "Next payday Tue, Oct 27")
    + seg("Statements", "My time", "Timecards")
    + '<div class="doc"><span class="k2">Latest statement</span><b class="pd">Payday Tue, Oct 6</b>'
      '<span class="per">For Sep 28 – Oct 4</span>'
      f'<div class="file">{DOC}<span>Pay statement · PDF</span><a>{DOWN}Download</a></div></div>'
    + lab("Earlier") + '<div class="grp">'
    + row("", "Payday Tue, Sep 29", "For Sep 21 – 27", f'<span class="dlx">{DOWN}</span>', " plain")
    + row("", "Payday Tue, Sep 22", "For Sep 14 – 20", f'<span class="dlx">{DOWN}</span>', " plain")
    + '</div>'
    + f'<p class="lock">{LOCK}<span>Only your own statements. Downloaded files can include personal pay details.</span></p>', "Pay")

# ---------- My time ----------
mytime = phone(
    title("My time", "Oct 19 – 25 · paid Tue, Oct 27")
    + seg("Statements", "My time", "Timecards").replace('<span class=on>Statements</span><span>My time</span>', '<span>Statements</span><span class=on>My time</span>')
    + '<section class="hero"><span class="k"><i></i>Today, Tue Oct 20</span><b class="big">Off clock</b>'
      '<span class="w">Clock in at your location’s Clocker.</span>'
      '<div class="split"><div><small>Recorded</small><strong>0h</strong></div><div><small>Breaks</small><strong>0h</strong></div></div>'
      f'<div class="foot"><span class="note2">Updated 3:59 PM</span><span class="act"><span class="ib">{REFRESH}</span><span class="lk">Details{CHEV_W}</span></span></div></section>'
    + lab("This week") + '<div class="grp"><p class="calm">No time recorded yet this week.</p></div>'
    + lab("Corrections") + '<div class="grp">'
    + plain("Request a correction", "Your manager reviews it. Your original times are kept.")
    + '</div>', "Pay")

# ---------- Notifications ----------
def n(title_, ctx, when, go):
    return f'<div class="nrow"><span class="dotcol"><i></i></span><span class="tx2"><span class="top2"><b>{title_}</b><time>{when}</time></span><p>{ctx}</p><span class="go">{go}</span></span></div>'


notifs = phone(
    title("Notifications", "3 unread")
    + seg("All <em>3</em>", "Unread <em>3</em>", "To do <em>3</em>")
    + f'<div class="search">{SEARCH}Search</div>'
    + lab("Today") + '<div class="grp">'
    + n("Team update", "This week’s team schedule", "7:00 AM", "Read update")
    + n("Schedule updated", "Week of Oct 26 – Nov 1", "7:00 AM", "Review schedule")
    + n("Schedule updated", "Week of Oct 19 – 25", "7:00 AM", "Review schedule")
    + '</div><p class="quiet">Opening a notification doesn’t complete it.</p>', "More")

# ---------- Profile ----------
profile = phone(
    '<div class="prof"><span class="ava">AR</span><b>Alexandra Rivera</b><span>Employee · Northside QA Workforce</span></div>'
    + lab("Sign-in") + '<div class="grp">'
    + plain("Face ID", "Sign in with a glance", '<span class="val">Set up</span>' + CHEV)
    + '</div>' + lab("Preferences") + '<div class="grp">'
    + plain("Language", None, '<span class="mini"><span class="on">English</span><span>Español</span></span>')
    + plain("Notifications", None, '<span class="val">Off</span>' + CHEV)
    + plain("Calendar", None, '<span class="val">Not set up</span>' + CHEV)
    + '</div>' + lab("Workplace") + '<div class="grp">'
    + '<div class="kv"><span>Company</span><b>Northside QA Workforce</b></div>'
    + '<div class="kv"><span>Locations</span><b>Main Office, West Office</b></div>'
    + '<div class="kv"><span>Access</span><b>Employee</b></div>'
    + '<div class="kv"><span>Time zone</span><b>Puerto Rico</b></div>'
    + '</div><p class="helpline">Something wrong? Ask your manager to update it.</p>'
    + '<div class="signout">Sign out</div>', "More")

more = p5.more

pages = {"p6-schedule": schedule, "p6-requests": requests, "p6-pay": pay, "p6-mytime": mytime,
         "p6-notifications": notifs, "p6-profile": profile, "p6-more": more}
head = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="pages6.css"><style>.cw{{flex:none;color:rgba(255,255,255,.55)}}</style></head><body>{b}</body></html>'
for name, body in pages.items():
    (HERE / f"{name}.html").write_text(head.format(n=name, b=body))
labels = [("p6-schedule", "Schedule"), ("p6-requests", "Requests"), ("p6-pay", "Pay"), ("p6-mytime", "My time"),
          ("p6-notifications", "Notifications"), ("p6-profile", "Profile"), ("p6-more", "More (sheet)")]
(HERE / "p6-board.html").write_text(head.format(n="board", b='<div class="board">' + "".join(f'<div class="f"><span>{lab_}</span>{pages[k]}</div>' for k, lab_ in labels) + '</div>'))
print("ok6")
