"""Phase 1: figures and words refined. Run: python3 -I p1c.py"""
import importlib.util
from pathlib import Path
HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p1b", HERE / "p1b.py"); p1b = importlib.util.module_from_spec(spec); spec.loader.exec_module(p1b)
up, sig = p1b.up, p1b.sig
li, d, sec, CHEV = up.li, up.d, up.sec, up.CHEV
DOWN, LOCK, PREV, NEXT, page = sig.DOWN, sig.LOCK, p1b.PREV, p1b.NEXT, p1b.page

def dur(h, m, cls="fig"):
    return f'<b class="{cls}"><span class="n">{h}</span><em class="u">h</em> <span class="n">{m:02d}</span><em class="u">m</em></b>'
def durs(h, m):
    return f'<strong>{h}<em class="u">h</em> {m:02d}<em class="u">m</em></strong>'

pay = page("My pay",
    '<span class="eyebrow">Next payday</span><b class="fig date">Oct 27</b><div class="sub2"><span>Tuesday</span><b>in 7 days</b></div>',
    f'<div class="stmt"><span class="tx"><span class="eyebrow">Latest statement</span><b class="big3">October 6</b><span>Sep 28 – Oct 4 · PDF</span></span><span class="pill2">{DOWN}Download</span></div>'
    + sec("Earlier statements") + '<div class="list">'
    + li("", "September 29", "Sep 21–27 · PDF", f'<span class="ring2">{DOWN}</span>')
    + li("", "September 22", "Sep 14–20 · PDF", f'<span class="ring2">{DOWN}</span>')
    + '</div>'
    + f'<div class="quietbar"><span style="display:flex;gap:8px">{LOCK}Only your statements appear here.</span><span class="ulink">Refresh</span></div>',
    band=372)

mytime = page("My time",
    '<span class="eyebrow"><i></i>Today · Tuesday, Oct 20</span><b class="fig word">Off clock</b>'
    f'<div class="pair"><div><small>Worked today</small>{durs(0,0)}</div><div><small>On break</small>{durs(0,0)}</div></div>',
    '<div class="quietbar" style="margin-top:0"><span>Updated 3:59 PM</span><span style="display:flex;gap:16px"><span class="ulink">Refresh</span><span class="ulink">Details</span></span></div>'
    + '<p class="note2" style="margin-top:2px"><span>Your punches come from your location’s Clocker.</span></p>'
    + sec("This week · Oct 19–25") + '<div class="list"><p class="empty">Nothing recorded this week yet.</p></div>'
    + sec("Something wrong?") + '<div class="list">'
    + li("", "Request a correction", "Your manager reviews it. Your original punches are kept.")
    + '</div>',
    band=430)

timecards = page("Timecards",
    '<span class="eyebrow">This pay period · Oct 14–20</span>' + dur(0, 0) + '<div class="sub2"><span>Worked</span><span>·</span><span>0h 00m on break</span></div>',
    f'<div class="navrow"><span><b>Oct 14–20</b> <span class="s">· open</span></span><span class="arrows"><i>{PREV}</i><i class="dim">{NEXT}</i></span></div>'
    + '<p class="note2"><i></i>Open period. Totals can still change until it closes.</p>'
    + sec("Your timecard") + '<div class="list">'
    + li("", "Daily punches", "Each day’s clock-ins and breaks")
    + li("", "Request a correction", "Your manager reviews it. Your original punches are kept.")
    + '</div>'
    + '<div class="quietbar" style="justify-content:flex-start;gap:18px"><span class="ulink">Choose dates</span><span class="ulink">Refresh</span></div>',
    band=372)

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p1c.css"></head><body>{b}</body></html>'
pages = {"p1c-pay": pay, "p1c-mytime": mytime, "p1c-timecards": timecards}
for k, v in pages.items(): (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p1c-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p1c-pay","My pay"),("p1c-mytime","My time"),("p1c-timecards","Timecards")]) + '</div>'))
print("p1c ok")
