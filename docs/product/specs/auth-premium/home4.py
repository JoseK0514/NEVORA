"""Home in the Withings style (Jose's pick, reference 8). Run: python3 -I home4.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("h3", HERE / "home3.py")
h3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h3)
ln, HOME, CAL, REQ, PAY, MORE, BELL, SB = h3.ln, h3.HOME, h3.CAL, h3.REQ, h3.PAY, h3.MORE, h3.BELL, h3.SB

PLUS = ln('<path d="M12 5v14M5 12h14"/>', 20)
TICK = ln('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 15, 2.4)
DOC = ln('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5"/>', 22)
CALI = ln('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/>', 22)
CLOCKI = ln('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>', 22)

TOP = (f'<div class="top"><span class="rb av">AR</span><span class="r"><span class="rb">{PLUS}</span>'
       f'<span class="rb">{BELL}<i class="dot"></i></span></span></div>')
HI = '<p class="hi">Hi, Alexandra<span>Tuesday, October 20</span></p>'
BIG = ('<div class="frame"><div class="big"><div class="art" style="background-image:url(../home-illo.jpg)"></div>'
       '<div class="tx"><span class="k">Your shift today · Main Office</span><b>8:00 AM – 4:00 PM</b>'
       '<span class="s">Customer Support. You’re not clocked in yet.</span></div></div>'
       '<div class="chip"><span><i>3</i>3 things to review</span></div></div>')


def it(th, cls, title, sub, done=False):
    ck = f'<span class="ck done">{TICK}</span>' if done else '<span class="ck"></span>'
    return f'<div class="it"><span class="th {cls}">{th}</span><span class="tx"><b>{title}</b><span>{sub}</span></span>{ck}</div>'


LIST = ('<h2 class="t">Today</h2><div class="items">'
        + it(CLOCKI, "", "Clock in at the front desk", "Your shift starts at 8:00 AM")
        + it(CALI, "t2", "Review next week’s schedule", "Week of Oct 26")
        + it(DOC, "t3", "Read the team update", "This week’s team schedule")
        + it(CALI, "t2", "Review this week’s changes", "Week of Oct 19", done=True)
        + '</div>')
TABS = ('<div class="tabs">' + f'<span class="on">{HOME}Home</span><span>{CAL}Schedule</span><span>{REQ}Requests</span><span>{PAY}Pay</span><span>{MORE}More</span>' + '</div>')

phone = f'<div class="ios">{SB}{TOP}{HI}{BIG}{LIST}{TABS}</div>'
desk = ('<div class="desk"><div class="side"><span class="wm">NEVORA</span><ul>'
        + ''.join(f'<li{" class=on" if i == 0 else ""}>{t}</li>' for i, t in enumerate(["Home", "My schedule", "My time", "Requests", "Updates", "My pay", "Profile"]))
        + f'</ul></div><div class="main">{TOP}{HI}<div class="cols"><div>{BIG}</div><div>{LIST}</div></div></div></div>')


def page(b, t):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{t}</title><link rel="stylesheet" href="../home4.css"></head><body>{b}</body></html>'


(HERE / "html" / "h4-phone-390.html").write_text(page(phone, "Home"))
(HERE / "html" / "h4-desk-1440.html").write_text(page(desk, "Home"))
print("ok")
