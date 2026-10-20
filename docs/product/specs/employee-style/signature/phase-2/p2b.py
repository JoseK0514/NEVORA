"""Phase 2 upscaled. Run: python3 -I p2b.py"""
import importlib.util
from pathlib import Path
HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p2", HERE / "p2.py"); p2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(p2)
up, page = p2.up, p2.page
ln, CHEV, li, sec = up.ln, up.CHEV, up.li, up.sec
SEARCH = ln('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', 19, 1.6)
CHEVW = CHEV.replace('class="chev"', 'class="chev" style="color:rgba(255,255,255,.55)"')

def nt(title, kind, when, todo=True, unread=True):
    return (f'<div class="nt3{"" if unread else " read"}"><span><strong><i></i>{title}</strong>'
            f'<span class="m">{"<b>To do</b> · " if todo else ""}{kind}</span></span><span class="r">{when}{CHEV}</span></div>')

notifs = page('<span class="eyebrow">Notifications</span><b class="fig"><span class="n2">3</span><em class="word2">to review</em></b><div class="sub2"><span>3 unread</span><span>·</span><span>Schedule and team updates</span></div>',
    f'<div class="segrow"><div class="seg3"><span class="on">All <em>3</em></span><span>Unread <em>3</em></span><span>To do <em>3</em></span></div><span class="rnd">{SEARCH}</span></div>'
    + '<div class="warn2"><span>Some updates couldn’t be checked.</span><span class="ulink" style="color:var(--ink)">Try again</span></div>'
    + sec("Today") + '<div class="list">'
    + nt("Read the team update", "Team update", "7:00 AM")
    + nt("Review your schedule", "Week of Oct 26 – Nov 1", "7:00 AM")
    + nt("Review your schedule", "Week of Oct 19–25", "7:00 AM")
    + '</div><p class="fine">Opening one doesn’t complete it. You still review the update or schedule.</p>',
    band=300)

profile = page('<span class="eyebrow">Profile</span>'
    '<div class="mcard"><div class="row1"><span class="mono">AR</span><span class="tag">Employee</span></div>'
    '<b class="nm">Alexandra Rivera</b><span class="co">Northside QA Workforce</span>'
    '<div class="meta"><div><small>Locations</small><span>Main Office, West Office</span></div><div><small>Time zone</small><span>Puerto Rico</span></div></div></div>',
    sec("Sign-in and security").replace('class="sec"', 'class="sec" style="margin-top:0"') + '<div class="list">'
    + li("", "Face ID", "Sign in with a glance on this iPhone", '<span class="pill2">Set up</span>')
    + '</div>' + sec("Preferences") + '<div class="list">'
    + li("", "Language", "Sign-in pages for now", '<span class="mini2"><span class="on">EN</span><span>ES</span></span>')
    + li("", "Notifications", "Not on for your workplace yet", '<span class="val">Off</span>')
    + li("", "Calendar", "Add your shifts to Apple, Google or Outlook", CHEV)
    + '</div><div class="quietbar"><span>Details wrong? Ask your manager.</span><span class="ulink" style="color:var(--ink)">Refresh</span></div>'
    + '<div class="out2">Sign out</div>',
    band=470)

more = ('<div class="ph u1 sheetv">' + up.u1_home[len('<div class="ph u1">'):-len('</div>')]
        + '<div class="scrim"></div><div class="msh2"><div class="grab"></div>'
        + '<div class="top3"><span class="eyebrow">More</span><span class="ulink">Close</span></div>'
        + f'<div class="mini3"><span class="mono">AR</span><span class="tx"><b>Alexandra Rivera</b><small>Profile and settings</small></span>{CHEVW}</div>'
        + '<div class="list">'
        + li("", "Notifications", "3 to review", '<span class="cnt"><i></i>3</span>' + CHEV)
        + li("", "Team updates", "News from your workplace", CHEV)
        + '</div><div class="list"><div class="li single red"><span class="tx"><b>Sign out</b><span></span></span></div></div></div></div>')

profile = profile.replace('<svg class="mk"', '<svg class="mk" style="display:none"', 1)

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p2b.css"></head><body>{b}</body></html>'
pages = {"p2b-notifications": notifs, "p2b-profile": profile, "p2b-more": more}
for k, v in pages.items(): (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p2b-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p2b-notifications","Notifications"),("p2b-profile","Profile"),("p2b-more","More (sheet)")]) + '</div>'))
print("p2b ok")
