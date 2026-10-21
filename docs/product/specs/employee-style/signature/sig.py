"""Signature: all eight employee pages (phone mockups). Run: python3 -I sig.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("up", HERE / "up.py")
up = importlib.util.module_from_spec(spec)
spec.loader.exec_module(up)
ln, SB, CHEV, ARR, REFRESH, li, d, sec, u1, tabs, top, mark = up.ln, up.SB, up.CHEV, up.ARR, up.REFRESH, up.li, up.d, up.sec, up.u1, up.tabs, up.top, up.mark
DOWN = ln('<path d="M12 4.5v11M7.5 11 12 15.5 16.5 11M5 19.5h14"/>', 17, 1.6)
PLUS = ln('<path d="M12 6v12M6 12h12"/>', 17, 1.7)
LOCK = ln('<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 15, 1.6)
SEARCH = ln('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', 18, 1.6)
DOC = ln('<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M13.5 3.5V8h4.5"/>', 20, 1.5)


def head(eyebrow, title, sub=""):
    return f'<div class="head"><span class="eyebrow">{eyebrow}</span><h1>{title}</h1>{f"<p>{sub}</p>" if sub else ""}</div>'


def seg(*items, on=0):
    return '<div class="seg">' + "".join(f'<span{" class=on" if i == on else ""}>{x}</span>' for i, x in enumerate(items)) + '</div>'


def single(t, right=CHEV, cls=""):
    return f'<div class="li single{cls}"><span class="tx"><b>{t}</b><span></span></span>{right}</div>'


# Requests
requests = u1(head("1 waiting for approval", "Requests"),
              seg("Time off", "Shift swaps", "Availability")
              + f'<div class="full">{PLUS}Request time off</div>'
              + sec("Waiting") + '<div class="list">'
              + li(d("Oct", 29), "Oct 29 – 30", "2 full days · Sent Oct 19", '<span class="state wait">Waiting</span>')
              + '</div>' + sec("Decided") + '<div class="list">'
              + li(d("Nov", 13), "Fri, Nov 13", "Full day", '<span class="state good">Approved</span>')
              + li(d("Nov", 18), "Nov 18 – 19", "2 full days", '<span class="state no">Declined</span>')
              + f'<div class="li link"><span class="u">All 5 requests</span>{CHEV}</div></div>', "Requests", band=262)

# Pay
pay = u1(head("Next payday Tue, Oct 27", "My pay"),
         seg("Statements", "My time", "Timecards")
         + '<section class="card"><span class="eyebrow">Latest statement</span><b class="big num">Tue, Oct 6</b>'
           '<span class="cap">Payday · for Sep 28 – Oct 4</span>'
           f'<div class="file">{DOC}<span>PDF statement</span><a class="btn">{DOWN}&nbsp;Download</a></div></section>'
         + sec("Earlier") + '<div class="list">'
         + li(d("Sep", 29), "For Sep 21 – 27", "PDF statement", f'<span class="dl">{DOWN}</span>')
         + li(d("Sep", 22), "For Sep 14 – 20", "PDF statement", f'<span class="dl">{DOWN}</span>')
         + '</div>'
         + f'<p class="lock">{LOCK}<span>Only your own statements. Downloaded files can include personal pay details.</span></p>', "Pay", band=262)

# My time
mytime = u1(head("Oct 19 – 25 · paid Tue, Oct 27", "My time"),
            seg("Statements", "My time", "Timecards", on=1)
            + '<section class="card"><span class="eyebrow"><i class="idle"></i>Today · Tue, Oct 20</span><b class="big">Off clock</b>'
              '<span class="cap">Clock in at your location’s Clocker.</span>'
              '<div class="figs"><div><small>Recorded</small><strong class="num">0h</strong></div><div><small>Breaks</small><strong class="num">0h</strong></div></div>'
              f'<div class="foot"><span>Updated 3:59 PM</span><span style="display:flex;align-items:center"><span class="cb" style="background:none;color:inherit">{REFRESH}</span><span class="lk">Details {ARR}</span></span></div></section>'
            + sec("This week") + '<div class="list"><p class="empty">No time recorded yet this week.</p></div>'
            + sec("Corrections") + '<div class="list">'
            + li("", "Request a correction", "Your manager reviews it. Your original times are kept.")
            + '</div>', "Pay", band=262)


# Notifications
def nt(title, ctx, when, act):
    return f'<div class="nt"><span class="dot"></span><span class="tx"><span class="row1"><b>{title}</b><time>{when}</time></span><p>{ctx}</p><a>{act}</a></span></div>'


notifs = u1(head("3 unread", "Notifications"),
            seg("All<em>3</em>", "Unread<em>3</em>", "To do<em>3</em>")
            + f'<div class="search">{SEARCH}Search</div>'
            + sec("Today") + '<div class="list">'
            + nt("Team update", "This week’s team schedule", "7:00 AM", "Read update")
            + nt("Schedule updated", "Week of Oct 26 – Nov 1", "7:00 AM", "Review schedule")
            + nt("Schedule updated", "Week of Oct 19 – 25", "7:00 AM", "Review schedule")
            + '</div><p class="fine">Opening a notification doesn’t complete it.</p>', "More", band=262)

# Profile
profile = u1('<div class="who"><span class="ava">AR</span><h1>Alexandra Rivera</h1><p>Employee · Northside QA Workforce</p></div>',
             sec("Sign-in") + '<div class="list">'
             + li("", "Face ID", "Sign in with a glance", '<span class="val">Set up</span>' + CHEV)
             + '</div>' + sec("Preferences") + '<div class="list">'
             + single("Language", '<span class="mini"><span class="on">English</span><span>Español</span></span>')
             + single("Notifications", '<span class="val">Off</span>' + CHEV)
             + single("Calendar", '<span class="val">Not set up</span>' + CHEV)
             + '</div>' + sec("Workplace") + '<div class="list">'
             + '<div class="kv"><span>Company</span><b>Northside QA Workforce</b></div>'
             + '<div class="kv"><span>Locations</span><b>Main Office, West Office</b></div>'
             + '<div class="kv"><span>Access</span><b>Employee</b></div>'
             + '<div class="kv"><span>Time zone</span><b>Puerto Rico</b></div>'
             + '</div><p class="fine">Something wrong? Ask your manager to update it.</p><div class="out">Sign out</div>', "More", band=330)

# More sheet over Home
home_under = up.u1_home.replace('<div class="ph u1">', '<div class="ph u1 sheetv">', 1)
more = home_under[:-len('</div>')] + (
    '<div class="scrim"></div><div class="msh"><div class="grab"></div>'
    '<div class="me"><span class="ava">AR</span><span><b>Alexandra Rivera</b><small>Employee · Northside QA Workforce</small></span></div>'
    '<div class="list">'
    + li("", "My time", "Punches, breaks and corrections")
    + li("", "Team updates", "News from your workplace")
    + li("", "Notifications", "3 unread", '<span class="dot" style="position:static;display:inline-block;width:8px;height:8px;border-radius:50%;background:#35B6EC"></span>' + CHEV)
    + li("", "Profile and settings", "Face ID, language, calendar")
    + '</div><div class="list">' + single("Sign out", "", " red") + '</div></div></div>')

pages = {"sig-home": up.u1_home, "sig-schedule": up.u1_sched, "sig-requests": requests, "sig-pay": pay, "sig-mytime": mytime,
         "sig-notifications": notifs, "sig-profile": profile, "sig-more": more}
hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="sig.css"></head><body>{b}</body></html>'
for k, v in pages.items():
    (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
labels = ["Home", "Schedule", "Requests", "Pay", "My time", "Notifications", "Profile", "More (sheet)"]
(HERE / "sig-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in zip(pages, labels)) + '</div>'))
print("sig ok")
