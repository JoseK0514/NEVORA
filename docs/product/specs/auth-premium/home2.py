"""Employee Home in the E4 style (mockup): phone and desktop. Run: python3 -I home2.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p2", HERE / "profile2.py")
p2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p2)
ic, P, CHEV, MARK, SB, row = p2.ic, p2.P, p2.CHEV, p2.MARK, p2.SB, p2.row

SWAP = "M213.7 82.3l-32-32a8 8 0 0 0-11.4 11.4L188.7 80H40a8 8 0 0 0 0 16h148.7l-18.4 18.3a8 8 0 0 0 11.4 11.4l32-32a8 8 0 0 0 0-11.4Zm-128 48a8 8 0 0 0-11.4 0l-32 32a8 8 0 0 0 0 11.4l32 32a8 8 0 0 0 11.4-11.4L67.3 176H216a8 8 0 0 0 0-16H67.3l18.4-18.3a8 8 0 0 0 0-11.4Z"
SUN = "M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0Zm72 88a64 64 0 1 1-64-64 64.1 64.1 0 0 1 64 64Zm-16 0a48 48 0 1 0-48 48 48 48 0 0 0 48-48Z"
CLOCK = "M128 24a104 104 0 1 0 104 104A104.1 104.1 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8Z"
CHECK = "M229.7 77.7l-128 128a8 8 0 0 1-11.4 0l-56-56a8 8 0 0 1 11.4-11.4L96 188.7 218.3 66.3a8 8 0 0 1 11.4 11.4Z"


def hero():
    return ('<div class="hero"><div class="top"><span class="lab">On shift now</span><span class="pill">Off clock</span></div>'
            '<div class="time">8:00 AM – 4:00 PM</div><div class="where">Main Office · Customer Support</div>'
            '<div class="bar"><i></i></div><div class="bar-l"><span>Started 8:00 AM</span><span>1h 37m left</span></div>'
            '<div class="next"><span class="tx"><b>Tomorrow · 8:00 AM – 4:00 PM</b><span>Main Office · Customer Support</span></span><span class="in">in 17h</span></div>'
            '<p class="note">West Office hasn’t published this week yet.</p></div>')


def needs():
    return ('<div class="sec"><div class="sec-h"><h2>Needs you</h2><span class="n">3</span></div><div class="list">'
            + row(ic(P["cal"]), "Schedule updated", "Week of Oct 19", '<span class="pill-r">Review</span>' + CHEV)
            + row(ic(P["cal"]), "Schedule updated", "Week of Oct 26", '<span class="pill-r">Review</span>' + CHEV)
            + row(ic(P["doc"]), "Team update to read", "This week’s team schedule", '<span class="pill-r">Review</span>' + CHEV)
            + '</div></div>')


AVAIL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 14.5 2 2 4-4"/></svg>'


def shortcuts():
    items = [(P["cal"], "Time off"), (SWAP, "Swap shift"), (SUN, "Availability"), (CLOCK, "My time")]
    return '<div class="sec"><div class="sec-h"><h2>Shortcuts</h2></div><div class="shortcuts">' + "".join(
        f'<a><span class="i">{(AVAIL if d == SUN else ic(d, 20))}</span>{t}</a>' for d, t in items) + '</div></div>'


def recent():
    return ('<div class="sec"><div class="sec-h"><h2>Recent</h2><a>See all</a></div><div class="list">'
            + row(ic(CHECK), "Time off approved", "Fri, Nov 13", '<span class="date st-ok">Approved</span>')
            + row(ic(P["cal"]), "Time off requested", "Oct 29 – 30", '<span class="date st-wait">Waiting</span>')
            + row(ic(P["cal"]), "Time off declined", "Nov 18 – 19", '<span class="date st-no">Declined</span>')
            + '</div></div>')


GREET = ('<div class="greet"><span class="d">Tuesday, October 20</span><b>Good afternoon, Alexandra</b>'
         '<span class="s">On shift until 4:00 PM · <a>3 things need you</a></span></div>')
UPD = '<p class="updated">Times in Puerto Rico time · Updated 2:23 PM</p>'

phone = (f'<div class="ios home"><div class="band">{MARK}<div class="grain"></div></div>{SB}'
         '<div class="topbar"><span class="wm">NEVORA</span>' + ic(P["bell"], 22) + f'</div>{GREET}{hero()}'
         f'<div class="sheet">{needs()}{shortcuts()}{recent()}{UPD}</div>'
         '<div class="tabbar"><span class="on"><i></i>Home</span><span><i></i>Schedule</span><span><i></i>Requests</span><span><i></i>Pay</span><span><i></i>More</span></div></div>')

NEEDS0 = needs().replace('<div class="sec">', '<div class="sec" style="margin-top:0">', 1)
desk = ('<div class="desk home"><div class="side"><span class="wm">NEVORA</span><ul>'
        '<li class="on"><i></i>Home</li><li><i></i>My schedule</li><li><i></i>My time</li><li><i></i>Requests</li><li><i></i>Updates</li><li><i></i>My pay</li><li><i></i>Profile</li></ul></div>'
        f'<div class="band">{MARK}<div class="grain"></div>{GREET}</div>'
        f'<div class="grid"><div>{hero()}{shortcuts()}</div><div>{NEEDS0}{recent()}{UPD}</div></div></div>')


def page(b, t):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{t}</title><link rel="stylesheet" href="../home2.css"></head><body>{b}</body></html>'


(HERE / "html" / "h2-phone-390.html").write_text(page(phone, "Home"))
(HERE / "html" / "h2-desk-1440.html").write_text(page(desk, "Home"))
print("ok")
