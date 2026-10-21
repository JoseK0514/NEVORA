"""Phase 2 mockups: Notifications, Profile, More sheet. Run: python3 -I p2.py"""
import importlib.util
from pathlib import Path
HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p1c", HERE / "p1c.py"); p1c = importlib.util.module_from_spec(spec); spec.loader.exec_module(p1c)
up = p1c.up
ln, SB, CHEV, li, d, sec, tabs, top, mark = up.ln, up.SB, up.CHEV, up.li, up.d, up.sec, up.tabs, up.top, up.mark
SEARCH = ln('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', 18, 1.6)

def page(hero, body, band, active="More"):
    return (f'<div class="ph u1"><div class="band" style="height:{band}px">{mark("width:280px;right:-90px;top:" + str(band - 236) + "px")}</div>'
            f'{SB}{top()}<div class="hero2">{hero}</div><div class="sheet">{body}</div>{tabs(active)}</div>')

def nt(kind, todo, title, when, act):
    k = f'{kind}{" · <b>To do</b>" if todo else ""}'
    return f'<div class="nt2"><span class="dot"></span><span><span class="k">{k}</span><strong>{title}</strong><span class="act">{act}</span></span><time>{when}</time></div>'

notifs = page('<span class="eyebrow">Notifications</span><b class="fig"><span class="n2">3</span><em class="word2">unread</em></b><div class="sub2"><span>Schedule, requests and team updates</span></div>',
    '<div class="seg3"><span class="on">All <em>3</em></span><span>Unread <em>3</em></span><span>To do <em>3</em></span></div>'
    + f'<div class="search2">{SEARCH}Search notifications</div>'
    + '<div class="warn2"><span>Some updates couldn’t be checked.</span><span class="ulink" style="color:var(--ink)">Try again</span></div>'
    + sec("Today · Tuesday, Oct 20") + '<div class="list">'
    + nt("Team update", True, "Read the current team update", "7:00 AM", "Read update")
    + nt("Schedule", True, "Review your schedule for Oct 26 – Nov 1", "7:00 AM", "Review schedule")
    + nt("Schedule", True, "Review your schedule for Oct 19–25", "7:00 AM", "Review schedule")
    + '</div><p class="fine">Opening one doesn’t complete it. You still review the update or schedule.</p>',
    band=300)

profile = page('<span class="eyebrow">Profile</span><div class="prof2"><span class="ava2">AR</span><span><b>Alexandra Rivera</b><span>Employee · Northside QA Workforce</span></span></div>',
    sec("Sign-in").replace('class="sec"', 'class="sec" style="margin-top:0"') + '<div class="list">'
    + li("", "Face ID", "Sign in with a glance on this iPhone", '<span class="pill2">Set up</span>')
    + '</div>' + sec("Preferences") + '<div class="list">'
    + li("", "Language", "Sign-in pages for now", '<span class="mini2"><span class="on">EN</span><span>ES</span></span>')
    + li("", "Notifications", "Not on for your workplace yet", '<span class="val">Off</span>')
    + li("", "Add shifts to your calendar", "Apple, Google or Outlook", CHEV)
    + '</div>' + sec("Work details") + '<div class="list">'
    + '<div class="kv"><span>Company</span><b>Northside QA Workforce</b></div>'
    + '<div class="kv"><span>Locations</span><b>Main Office, West Office</b></div>'
    + '<div class="kv"><span>Access</span><b>Employee</b></div>'
    + '<div class="kv"><span>Time zone</span><b>Puerto Rico</b></div>'
    + '</div><div class="quietbar"><span>Something wrong? Ask your manager.</span><span class="ulink" style="color:var(--ink)">Refresh</span></div>'
    + '<div class="out2">Sign out</div>',
    band=330)

home_under = p1c.page  # unused
more = ('<div class="ph u1 sheetv">' + up.u1_home[len('<div class="ph u1">'):-len('</div>')]
        + '<div class="scrim"></div><div class="msh2"><div class="grab"></div>'
        + '<div class="top3"><span class="eyebrow">More</span><span class="ulink">Close</span></div>'
        + f'<div class="me2"><span class="ava2">AR</span><span class="tx"><b>Alexandra Rivera</b><small>Profile and settings</small></span>{CHEV}</div>'
        + '<div class="list">'
        + li("", "Notifications", "Schedule, requests and updates", '<span class="cnt"><i></i>3</span>' + CHEV)
        + li("", "Team updates", "News from your workplace", CHEV)
        + '</div><div class="list"><div class="li single red"><span class="tx"><b>Sign out</b><span></span></span></div></div></div></div>')

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p2.css"></head><body>{b}</body></html>'
pages = {"p2-notifications": notifs, "p2-profile": profile, "p2-more": more}
for k, v in pages.items(): (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p2-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p2-notifications","Notifications"),("p2-profile","Profile"),("p2-more","More (sheet)")]) + '</div>'))
print("p2 ok")
