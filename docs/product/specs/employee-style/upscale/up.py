"""Upscale directions U1 Signature and U2 Midnight: Home and Schedule. Run: python3 -I up.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("h5", HERE / "home5.py")
h5 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h5)
ln, SB = h5.ln, h5.SB
HOME, CAL, REQ, PAY, MORE = h5.HOME, h5.CAL, h5.REQ, h5.PAY, h5.MORE
BELL = ln('<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0"/>', 19, 1.6)
PLUS = ln('<path d="M12 5.5v13M5.5 12h13"/>', 19, 1.6)
REFRESH = ln('<path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5"/>', 19, 1.6)
CHEV = '<svg class="chev" width="7" height="12" viewBox="0 0 7 12"><path d="m1 1 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ARR = ln('<path d="M5 12h14M13 6l6 6-6 6"/>', 16, 1.6)
PREV = ln('<path d="m14.5 6-6 6 6 6"/>', 20, 1.6)
NEXT = ln('<path d="m9.5 6 6 6-6 6"/>', 20, 1.6)


def mark(style):
    return f'<svg class="mk" style="{style}" viewBox="0 0 360 340" aria-hidden="true"><path class="l" d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path class="t" d="M146 330 L180 266 L214 330 Z"/></svg>'


def top():
    return f'<div class="top"><span class="cb av">AR</span><span class="r"><span class="cb">{PLUS}</span><span class="cb">{BELL}<i class="dot"></i></span></span></div>'


def tabs(on):
    names = [("Home", HOME), ("Schedule", CAL), ("Requests", REQ), ("Pay", PAY), ("More", MORE)]
    return '<div class="tabs">' + "".join(f'<span{" class=on" if n == on else ""}>{i}{n}</span>' for n, i in names) + '</div>'


def li(lead, title, sub, right=CHEV, cls=""):
    return f'<div class="li{cls}">{lead}<span class="tx"><b>{title}</b><span>{sub}</span></span>{right}</div>'


def d(day, n):
    return f'<span class="d"><small>{day}</small><strong class="num">{n}</strong></span>'


RING = '<span class="ring"></span>'
todo = [("Review your schedule", "Week of Oct 19 – 25"), ("Review your schedule", "Week of Oct 26 – Nov 1"), ("Read the team update", "This week’s team schedule")]
shift_card = ('<section class="shift"><span class="eyebrow"><i></i>Scheduled now</span>'
              '<b class="hrs num">8:00 AM – 4:00 PM</b><span class="where">Main Office · Customer Support</span>'
              '<div class="bar"><b></b></div><div class="ends num"><span>8:00 AM</span><span>1h 20m left</span></div>'
              f'<div class="foot"><span class="clk"><i></i>Off clock</span><span style="display:flex;align-items:center;gap:2px"><span class="cb" style="background:none;box-shadow:none;color:inherit;opacity:.7">{REFRESH}</span><span class="lk">My time {ARR}</span></span></div></section>')
week = [("M", 19, " class=off"), ("T", 20, " class=on"), ("W", 21, ""), ("T", 22, ""), ("F", 23, ""), ("S", 24, ""), ("S", 25, "")]
strip = '<div class="strip">' + "".join(f'<span{c}>{x}<b class="num">{n}</b><i></i></span>' for x, n, c in week) + '</div>'
shifts = "".join(li(d(dd, n), "8:00 AM – 4:00 PM", "Main Office · Customer Support", CHEV, " today" if n == 20 else "")
                 for dd, n in [("Tue", 20), ("Wed", 21), ("Thu", 22), ("Fri", 23), ("Sat", 24), ("Sun", 25)])


def sec(t, a=""):
    return f'<div class="sec"><span class="eyebrow">{t}</span>{f"<a>{a}</a>" if a else ""}</div>'


# ----- U1 Signature -----
def u1(body_head, body, on, band=290):
    return (f'<div class="ph u1"><div class="band" style="height:{band}px">{mark("width:330px;right:-86px;top:" + str(band - 250) + "px")}</div>'
            f'{SB}{top()}{body_head}<div class="sheet">{body}</div>{tabs(on)}</div>')


u1_home = u1('<div class="head"><span class="eyebrow">Tuesday, October 20</span><h1>Good afternoon,<br>Alexandra</h1></div>',
             shift_card
             + sec("To do · 3") + '<div class="list">' + "".join(li(RING, t, s) for t, s in todo) + '</div>'
             + sec("Coming up", "View schedule") + '<div class="list">' + li(d("Wed", 21), "8:00 AM – 4:00 PM", "Main Office · Customer Support") + '</div>'
             + '<p class="fine">West Office hasn’t published this week yet. Shifts shown are published.</p>', "Home", band=300)

u1_sched = u1('<div class="head"><span class="eyebrow">Week of October 19</span><h1>My schedule</h1><p class="num">6 shifts · 48 hours</p></div>',
              '<div class="seg"><span class="on">My shifts</span><span>Open shifts</span></div>'
              + f'<div style="display:flex;justify-content:space-between;align-items:center;margin:24px 24px 0"><span class="eyebrow" style="color:var(--ink2)">Oct 19 – 25</span><span style="display:flex;gap:4px;color:var(--ink)"><span class="cb">{PREV}</span><span class="cb">{NEXT}</span></span></div>'
              + strip
              + '<div class="notice"><p><b>Confirm this week</b>Your manager asked you to check it.</p><span class="btn">Confirm</span></div>'
              + sec("Shifts") + f'<div class="list">{shifts}</div>'
              + '<p class="fine">West Office hasn’t published this week yet. Shifts shown are published.</p>'
              + sec("Planning ahead") + '<div class="list">'
              + li("", "What changed", "Changes your manager made") + li("", "Swap or give away a shift", "Trade with a teammate")
              + li("", "Update availability", "When you can work") + '</div>', "Schedule", band=290)


# ----- U2 Midnight -----
def u2(head, body, on):
    return f'<div class="ph u2">{mark("width:400px;right:-170px;top:-150px;opacity:.6")}{SB}{top()}{head}{body}{tabs(on)}</div>'


u2_home = u2('<div class="head"><span class="eyebrow">Tuesday, October 20</span><h1>Good afternoon,<br><b>Alexandra</b></h1></div>',
             shift_card
             + sec("To do · 3") + '<div class="list">' + "".join(li(RING, t, s) for t, s in todo) + '</div>'
             + sec("Coming up", "View schedule") + '<div class="list">' + li(d("Wed", 21), "8:00 AM – 4:00 PM", "Main Office · Customer Support") + '</div>'
             + '<p class="fine">West Office hasn’t published this week yet. Shifts shown are published.</p>', "Home")

u2_sched = u2('<div class="head"><span class="eyebrow">Week of October 19</span><h1>My <b>schedule</b></h1><p class="num">6 shifts · 48 hours</p></div>',
              '<div class="seg"><span class="on">My shifts</span><span>Open shifts</span></div>'
              + f'<div style="display:flex;justify-content:space-between;align-items:center;margin:26px 24px 0"><span class="eyebrow" style="color:var(--ink3)">Oct 19 – 25</span><span style="display:flex;gap:8px"><span class="cb">{PREV}</span><span class="cb">{NEXT}</span></span></div>'
              + strip
              + '<div class="notice"><p><b>Confirm this week</b>Your manager asked you to check it.</p><span class="btn">Confirm</span></div>'
              + sec("Shifts") + f'<div class="list">{shifts}</div>'
              + '<p class="fine">West Office hasn’t published this week yet. Shifts shown are published.</p>'
              + sec("Planning ahead") + '<div class="list">'
              + li("", "What changed", "Changes your manager made") + li("", "Swap or give away a shift", "Trade with a teammate")
              + li("", "Update availability", "When you can work") + '</div>', "Schedule")

head = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="up.css"></head><body>{b}</body></html>'
pages = {"up-u1-home": u1_home, "up-u1-schedule": u1_sched, "up-u2-home": u2_home, "up-u2-schedule": u2_sched}
for k, v in pages.items():
    (HERE / f"{k}.html").write_text(head.format(n=k, b=v))
(HERE / "up-board.html").write_text(head.format(n="board", b='<div class="board">'
    f'<div class="f"><span>A · Signature <em>— the approved sign-in, carried into the app</em></span><div style="display:flex;gap:28px">{u1_home}{u1_sched}</div></div>'
    f'<div class="f"><span>B · Midnight <em>— private-bank night palette</em></span><div style="display:flex;gap:28px">{u2_home}{u2_sched}</div></div></div>'))
refs = [("Mercury", "Light-weight figures, quiet navy, nothing extra"), ("Starling", "Deep teal header, one big number, dark sheet"),
        ("Blackbird", "Members-club luxury: large light type, tracked caps, grain"), ("Open", "Editorial black, thin tracked labels"),
        ("Revolut Business", "Deep gradient hero, centred figure, glass controls"), ("Tolan", "Warm cream paper and a serif headline"),
        ("Equinox+", "Dark calendar: day strip, rules, refined rows")]
(HERE / "up-refs.html").write_text(head.format(n="refs", b='<div class="refs">' + "".join(
    f'<figure><img src="../refs-up/r{i + 1}.img"><figcaption>{i + 1}. {n}<span>{w}</span></figcaption></figure>' for i, (n, w) in enumerate(refs)) + '</div>'))
print("up ok")
