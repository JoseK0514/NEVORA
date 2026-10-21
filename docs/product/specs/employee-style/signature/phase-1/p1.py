"""Phase 1 mockups: My pay, My time, Timecards in Signature (soft white). Run: python3 -I p1.py"""
import importlib.util
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("sig", HERE / "sig.py")
sig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sig)
up = sig.up
ln, SB, CHEV, ARR, REFRESH, li, d, sec, tabs, top, mark = up.ln, up.SB, up.CHEV, up.ARR, up.REFRESH, up.li, up.d, up.sec, up.tabs, up.top, up.mark
DOWN, LOCK, DOC = sig.DOWN, sig.LOCK, sig.DOC
PREV = ln('<path d="m14.5 6-6 6 6 6"/>', 20, 1.6)
NEXT = ln('<path d="m9.5 6 6 6-6 6"/>', 20, 1.6)


def page(active, eyebrow, title, sub, body, band=334):
    names = ["My pay", "My time", "Timecards"]
    tabsrow = '<div class="tabsrow">' + "".join(f'<span{" class=on" if n == active else ""}>{n}</span>' for n in names) + '</div>'
    return (f'<div class="ph u1"><div class="band" style="height:{band}px">{mark("width:300px;right:-86px;top:" + str(band - 250) + "px")}</div>'
            f'{SB}{top()}{tabsrow}<div class="head tight"><span class="eyebrow">{eyebrow}</span><h1>{title}</h1><p class="num">{sub}</p></div>'
            f'<div class="sheet">{body}</div>{tabs("Pay")}</div>')


# My pay
pay = page("My pay", "Next payday Tue, Oct 27", "My pay", "2 published statements",
           '<section class="card" style="margin-top:0"><span class="eyebrow">Latest statement</span><b class="big num">Tue, Oct 6</b>'
           '<span class="cap">Payday · for Sep 28 – Oct 4</span>'
           f'<div class="file">{DOC}<span>PDF statement</span><a class="btn">{DOWN}&nbsp;Download</a></div></section>'
           + sec("Earlier") + '<div class="list">'
           + li(d("Sep", 29), "For Sep 21 – 27", "Paid Tue, Sep 29 · PDF", f'<span class="dl">{DOWN}</span>')
           + li(d("Sep", 22), "For Sep 14 – 20", "Paid Tue, Sep 22 · PDF", f'<span class="dl">{DOWN}</span>')
           + '</div>'
           + f'<div class="footrow"><p class="lock">{LOCK}<span>Only your own statements. Files can include personal pay details.</span></p></div>'
           + '<div class="choose" style="justify-content:flex-start;margin-left:20px"><span class="ulink">Refresh statements</span></div>')

# My time
mytime = page("My time", "Oct 19 – 25 · paid Tue, Oct 27", "My time", "Your punches, breaks and corrections.",
              '<section class="card" style="margin-top:0"><span class="eyebrow"><i class="idle"></i>Today · Tue, Oct 20</span><b class="big">Off clock</b>'
              '<span class="cap">Clock in at your location’s Clocker.</span>'
              '<div class="figs"><div><small>Recorded</small><strong class="num">0h</strong></div><div><small>Breaks</small><strong class="num">0h</strong></div></div>'
              f'<div class="foot"><span>Updated 3:59 PM</span><span style="display:flex;align-items:center"><span class="cb" style="background:none;color:inherit;box-shadow:none">{REFRESH}</span><span class="lk">Record details {ARR}</span></span></div></section>'
              + sec("This week") + '<div class="list"><p class="empty">No time recorded yet this week.</p></div>'
              + sec("Corrections") + '<div class="list">'
              + li("", "Request a correction", "Your manager reviews it. Your original times are kept.")
              + '</div><p class="fine">No correction requests yet.</p>')

# Timecards
timecards = page("Timecards", "1 timecard in this period", "Timecards", "Each day’s clock-ins and clock-outs.",
                 f'<div class="period"><div><b>Oct 14 – 20</b><small>This pay period · open</small></div><span class="arrows"><i>{PREV}</i><i class="dim">{NEXT}</i></span></div>'
                 '<div class="choose"><span class="ulink">Choose dates</span></div>'
                 '<section class="card" style="margin-top:6px"><span class="eyebrow">Your timecard</span><b class="big num">0h</b>'
                 '<span class="cap">Recorded · Breaks 0h</span>'
                 '<div class="statusline"><i></i>Period is still open. Totals can change until it closes.</div>'
                 f'<div class="rowlink">Review timecard{CHEV}</div></section>'
                 + sec("Something wrong?") + '<div class="list">'
                 + li("", "Request a correction", "Your manager reviews it. Your original times are kept.")
                 + '</div>'
                 + '<div class="choose" style="justify-content:flex-start;margin-left:20px"><span class="ulink">Refresh timecards</span></div>')

hd = '<!doctype html><html><head><meta charset="utf-8"><title>{n}</title><link rel="stylesheet" href="p1.css"></head><body>{b}</body></html>'
pages = {"p1-pay": pay, "p1-mytime": mytime, "p1-timecards": timecards}
for k, v in pages.items():
    (HERE / f"{k}.html").write_text(hd.format(n=k, b=v))
(HERE / "p1-board.html").write_text(hd.format(n="board", b='<div class="board">' + "".join(
    f'<div class="f"><span>{lab}</span>{pages[k]}</div>' for k, lab in [("p1-pay", "My pay"), ("p1-mytime", "My time"), ("p1-timecards", "Timecards")]) + '</div>'))
print("p1 ok")
