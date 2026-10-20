"""Employee Home v5 mockups. Run: python3 -I home5.py"""
from pathlib import Path

HERE = Path(__file__).parent


def ln(d, s=24, w=1.6):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{d}</svg>'


HOME = ln('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z"/>')
CAL = ln('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/>')
REQ = ln('<path d="M8 4.5h8M7 4.5H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5h-1M9 11h6M9 15h4"/><rect x="8" y="3" width="8" height="3" rx="1"/>')
PAY = ln('<rect x="3.5" y="6" width="17" height="12.5" rx="2.5"/><path d="M3.5 10h17M7 14.5h3"/>')
MORE = ln('<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>')
BELL = ln('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0"/>', 20, 1.7)
PLUS = ln('<path d="M12 5v14M5 12h14"/>', 20, 1.8)
REFRESH = ln('<path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5"/>', 20, 1.7)
CHEV = '<svg class="c" width="8" height="14" viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHEV_W = CHEV.replace('class="c"', 'class="cw"')
TICK = ln('<path d="m7.5 12.5 3 3 6-6.5"/>', 16, 2.2)
SB = ('<div class="sb"><span>9:41</span><span class="ic"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
      '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/></svg></span></div>')

TOP = (f'<div class="top"><span class="rb av">AR</span><span class="r"><span class="rb">{PLUS}</span>'
       f'<span class="rb">{BELL}<i class="dot"></i></span></span></div>')
HI = '<div class="hi"><p>Tuesday, October 20</p><h1>Hi, Alexandra</h1></div>'
TABS = ('<div class="tabs">' + f'<span class="on">{HOME}Home</span><span>{CAL}Schedule</span><span>{REQ}Requests</span><span>{PAY}Pay</span><span>{MORE}More</span>' + '</div>')


def hero(light=False):
    cls = "hero light" if light else "hero"
    return (f'<section class="{cls}"><span class="k"><i></i>Scheduled now</span>'
            '<b class="t">8:00 AM – 4:00 PM</b><span class="w">Main Office · Customer Support</span>'
            '<div class="track"><b></b></div><div class="ends"><span></span><span>1h 20m left</span></div>'
            f'<div class="foot"><span class="clk"><i></i>Off clock</span><span class="act"><span class="ib">{REFRESH}</span>'
            f'<span class="lk">My time{CHEV_W if not light else CHEV}</span></span></div></section>')


HERO_FREE = ('<section class="hero"><b class="calm">No shift today</b>'
             '<span class="w">Enjoy your day off.</span>'
             f'<div class="foot"><span class="clk"><i></i>Off clock</span><span class="act"><span class="ib">{REFRESH}</span>'
             f'<span class="lk">My time{CHEV_W}</span></span></div></section>')


def row(lead, title, sub, right=CHEV, cls=""):
    s = f'<span>{sub}</span>' if sub else ""
    return f'<div class="row{cls}">{lead}<span class="tx"><b>{title}</b>{s}</span>{right}</div>'


RING = '<span class="ring"></span>'
TODO = ('<div class="sec"><h2>To do<em>3</em></h2></div><div class="grp">'
        + row(RING, "Review your schedule", "Week of Oct 19 – 25")
        + row(RING, "Review your schedule", "Week of Oct 26 – Nov 1")
        + row(RING, "Read the team update", "This week’s team schedule")
        + '</div>')
TODO_DONE = ('<div class="sec"><h2>To do</h2></div><div class="grp">'
             f'<div class="done"><span class="ok">{TICK}</span><span class="tx"><b>You’re all set.</b><span>Nothing needs your review.</span></span></div></div>')


def dt(d, n):
    return f'<span class="dt"><small>{d}</small><strong>{n}</strong></span>'


NEXT = ('<div class="sec"><h2>Coming up</h2><a>View schedule</a></div><div class="grp">'
        + row(dt("Wed", 21), "8:00 AM – 4:00 PM", "Main Office · Customer Support", CHEV, " d")
        + '</div><p class="quiet">West Office hasn’t published this week yet.</p>')
NEXT_FREE = ('<div class="sec"><h2>Coming up</h2><a>View schedule</a></div><div class="grp">'
             + row(dt("Wed", 21), "8:00 AM – 4:00 PM", "Main Office · Customer Support", CHEV, " d")
             + row(dt("Thu", 22), "8:00 AM – 4:00 PM", "Main Office · Customer Support", CHEV, " d")
             + '</div>')
REQS = ('<div class="sec"><h2>Requests</h2><a>All requests</a></div><div class="grp">'
        + row(dt("Oct", "29"), "Time off", "Oct 29 – 30 · 2 full days", '<span class="st wait">Waiting</span>', " d")
        + '</div>')


def phone(body, long=False):
    return f'<div class="ios{" long" if long else ""}">{SB}{TOP}{HI}{body}{TABS}</div>'


def page(name, inner):
    (HERE / f"{name}.html").write_text(
        f'<!doctype html><html><head><meta charset="utf-8"><title>{name}</title><link rel="stylesheet" href="home5.css">'
        '<style>.cw{flex:none;color:rgba(255,255,255,.55)}</style></head>'
        f'<body>{inner}</body></html>')


ready = hero() + TODO + NEXT + REQS
page("h5-a-teal", phone(ready))
page("h5-a-teal-long", phone(ready, long=True))
page("h5-b-white", phone(hero(light=True) + TODO + NEXT + REQS))
page("h5-c-dayoff", phone(HERO_FREE + TODO_DONE + NEXT_FREE))
page("h5-board",
     '<div class="board">'
     f'<div class="f"><span>A · Teal shift card <em>(recommended)</em></span>{phone(ready)}</div>'
     f'<div class="f"><span>B · White shift card</span>{phone(hero(light=True) + TODO + NEXT + REQS)}</div>'
     f'<div class="f"><span>A · Day off, nothing to review</span>{phone(HERO_FREE + TODO_DONE + NEXT_FREE)}</div>'
     '</div>')
print("ok")
