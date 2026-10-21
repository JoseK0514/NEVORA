"""Phase 2 organized and cleaner. Run: python3 -I p2c.py"""
import importlib.util
from pathlib import Path
HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p2b", HERE / "p2b.py"); p2b = importlib.util.module_from_spec(spec); spec.loader.exec_module(p2b)
up, page, SEARCH, CHEVW = p2b.up, p2b.page, p2b.SEARCH, p2b.CHEVW
ln, CHEV, li = up.ln, up.CHEV, up.li
X = ln('<path d="M7 7l10 10M17 7 7 17"/>', 16, 1.8)

def secx(title, count=None):
    return f'<div class="secx"><span class="eyebrow">{title}{f" <em>· {count}</em>" if count else ""}</span></div>'
def nt(title, ctx, when):
    return f'<div class="nt4"><span class="dot"></span><span class="tx"><b>{title}</b><span>{ctx}</span></span><time>{when}</time></div>'
def st(title, value, go=False, red=False, chev=True):
    v = f'<span class="v{" go" if go else ""}">{value}{CHEV if chev else ""}</span>' if value is not None else ""
    return f'<div class="set{" red" if red else ""}"><b>{title}</b>{v}</div>'

notifs = page('<span class="eyebrow">Notifications</span><b class="head2"><em>Three</em> things<br>to review</b><div class="sub2"><span>2 schedule reviews · 1 team update</span></div>',
    f'<div class="segrow"><div class="seg3"><span class="on">All <em>3</em></span><span>Unread <em>3</em></span><span>To do <em>3</em></span></div><span class="rnd">{SEARCH}</span></div>'
    + secx("To do", 3) + '<div class="list">'
    + nt("Read the team update", "This week’s team schedule", "7:00 AM")
    + nt("Review your schedule", "Week of Oct 26 – Nov 1", "7:00 AM")
    + nt("Review your schedule", "Week of Oct 19–25", "7:00 AM")
    + '</div><div class="finebar"><span>Some updates couldn’t be checked.</span><span class="ulink">Try again</span></div>',
    band=318)

card = ('<div class="mcard"><div class="row1"><span class="mono">AR</span><span class="tag">Employee</span></div>'
        '<b class="nm">Alexandra Rivera</b><span class="co">Northside QA Workforce</span>'
        '<div class="meta"><div><small>Locations</small><span>Main Office, West Office</span></div><div><small>Time zone</small><span>Puerto Rico</span></div></div></div>'
        '<div class="cardnote"><span>Details wrong? Ask your manager.</span><span class="ulink">Refresh</span></div>')
profile = page('<span class="eyebrow">Profile</span>' + card,
    secx("Settings").replace('class="secx"', 'class="secx" style="margin-top:0"') + '<div class="list">'
    + st("Face ID", "Set up", go=True)
    + st("Language", '<span class="mini2"><span class="on">EN</span><span>ES</span></span>', chev=False)
    + st("Notifications", "Off")
    + st("Calendar", "Not set up")
    + '</div><div class="list" style="margin-top:14px">' + st("Sign out", None, red=True) + '</div>',
    band=510).replace('<svg class="mk"', '<svg class="mk" style="display:none"', 1)

more = ('<div class="ph u1 sheetv">' + up.u1_home[len('<div class="ph u1">'):-len('</div>')]
        + '<div class="scrim"></div><div class="msh2"><div class="grab"></div>'
        + f'<div class="top3"><span class="eyebrow">More</span><span class="xbtn">{X}</span></div>'
        + f'<div class="mini3"><span class="mono">AR</span><span class="tx"><b>Alexandra Rivera</b><small>Profile and settings</small></span>{CHEVW}</div>'
        + '<div class="list">'
        + st("Notifications", '<span class="cnt"><i></i>3</span>', chev=True)
        + st("Team updates", "")
        + '</div><div class="list" style="margin-top:12px">' + st("Sign out", None, red=True) + '</div></div></div>')

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p2c.css"></head><body>{b}</body></html>'
pages = {"p2c-notifications": notifs, "p2c-profile": profile, "p2c-more": more}
for k, v in pages.items(): (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p2c-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p2c-notifications","Notifications"),("p2c-profile","Profile"),("p2c-more","More (sheet)")]) + '</div>'))
print("p2c ok")
