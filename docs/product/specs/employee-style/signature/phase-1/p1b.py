"""Phase 1 refined: the key fact in the band. Run: python3 -I p1b.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("p1", HERE / "p1.py")
p1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p1)
sig, up = p1.sig, p1.up
ln, SB, CHEV, ARR, REFRESH, li, d, sec, tabs, top, mark = up.ln, up.SB, up.CHEV, up.ARR, up.REFRESH, up.li, up.d, up.sec, up.tabs, up.top, up.mark
DOWN, LOCK, PREV, NEXT = sig.DOWN, sig.LOCK, p1.PREV, p1.NEXT


def page(active, hero, body, band):
    names = ["My pay", "My time", "Timecards"]
    tabsrow = '<div class="tabsrow">' + "".join(f'<span{" class=on" if n == active else ""}>{n}</span>' for n in names) + '</div>'
    return (f'<div class="ph u1"><div class="band" style="height:{band}px">{mark("width:280px;right:-90px;top:" + str(band - 236) + "px")}</div>'
            f'{SB}{top()}{tabsrow}<div class="hero2">{hero}</div><div class="sheet">{body}</div>{tabs("Pay")}</div>')


pay = page("My pay",
           '<span class="eyebrow">Next payday</span><b class="fig word">Tue, Oct 27</b><p>For Oct 19 – 25 · from your payroll provider</p>',
           sec("Latest statement").replace('class="sec"', 'class="sec" style="margin-top:0"')
           + f'<div class="stmt"><span class="tx"><b>Sep 28 – Oct 4</b><span>Paid Tue, Oct 6 · PDF</span></span><span class="pill2">{DOWN}Download</span></div>'
           + sec("Earlier") + '<div class="list">'
           + li(d("Sep", 29), "Sep 21 – 27", "Paid Tue, Sep 29", f'<span class="ring2">{DOWN}</span>')
           + li(d("Sep", 22), "Sep 14 – 20", "Paid Tue, Sep 22", f'<span class="ring2">{DOWN}</span>')
           + '</div>'
           + f'<div class="quietbar"><span style="display:flex;gap:8px">{LOCK}Only your own statements.</span><span class="ulink">Refresh</span></div>',
           band=356)

mytime = page("My time",
              '<span class="eyebrow"><i></i>Today · Tue, Oct 20</span><b class="fig word">Off clock</b>'
              '<div class="pair"><div><small>Recorded</small><strong>0<em class="u">h</em></strong></div><div><small>Breaks</small><strong>0<em class="u">h</em></strong></div></div>',
              '<div class="quietbar" style="margin-top:0"><span>Updated 3:59 PM</span><span style="display:flex;gap:16px"><span class="ulink">Refresh</span><span class="ulink">Details</span></span></div>'
              + '<p class="note2" style="margin-top:2px"><span>Clock in and out at your location’s Clocker. Your time shows here.</span></p>'
              + sec("This week") + '<div class="list"><p class="empty">No time recorded yet this week.</p></div>'
              + sec("Corrections") + '<div class="list">'
              + li("", "Request a correction", "Your manager reviews it. Your original times are kept.")
              + '</div>',
              band=430)

timecards = page("Timecards",
                 '<span class="eyebrow">Oct 14 – 20 · this pay period</span><b class="fig">0<em class="u">h</em></b><p>Recorded · Breaks 0h</p>',
                 f'<div class="navrow"><span><b>Oct 14 – 20</b> <span class="s">· open</span></span><span class="arrows"><i>{PREV}</i><i class="dim">{NEXT}</i></span></div>'
                 + '<p class="note2"><i></i>The period is still open. Totals can change until it closes.</p>'
                 + sec("Your timecard") + '<div class="list">'
                 + li("", "Review timecard", "Each day’s clock-ins and clock-outs")
                 + li("", "Request a correction", "Your manager reviews it. Your original times are kept.")
                 + '</div>'
                 + '<div class="quietbar" style="justify-content:flex-start;gap:18px"><span class="ulink">Choose dates</span><span class="ulink">Refresh</span></div>',
                 band=356)

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p1b.css"></head><body>{b}</body></html>'
pages = {"p1b-pay": pay, "p1b-mytime": mytime, "p1b-timecards": timecards}
for k, v in pages.items():
    (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p1b-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p1b-pay", "My pay"), ("p1b-mytime", "My time"), ("p1b-timecards", "Timecards")]) + '</div>'))
print("p1b ok")
