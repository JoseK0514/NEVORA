"""Builds the sign-in and recovery mockups (HTML) for the v3 auth redesign. Run: python3 build.py"""
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "html"
OUT.mkdir(exist_ok=True)
PUB = "../../../../../public"
WS = "Northside QA Workforce"

SB = """<div class="sb"><span>9:41</span><span class="ic">
<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.1-1.1A10.1 10.1 0 0 0 8 1C5.3 1 2.8 2 .9 3.9L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.2c1.4 0 2.7.5 3.7 1.4l1.1-1.1A7 7 0 0 0 8 4.2a7 7 0 0 0-4.8 1.9l1.1 1.1A5.4 5.4 0 0 1 8 5.8Zm0 3.2c.6 0 1.1.2 1.5.6L8 11.1 6.5 9.6c.4-.4.9-.6 1.5-.6Z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".35"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4"/></svg>
</span></div>"""
HOME = '<div class="homebar"></div>'
BACK = '<svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHEV = '<svg class="chev" width="8" height="14" viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
EYE = '<svg class="eye" width="22" height="22" viewBox="0 0 256 256"><path fill="currentColor" d="M247.3 124.8c-.3-.8-8.8-19.6-27.6-38.5C194.6 61.3 162.9 48 128 48S61.4 61.3 36.3 86.3C17.5 105.2 9 124 8.7 124.8a8 8 0 0 0 0 6.5c.3.7 8.8 19.5 27.6 38.4C61.4 194.7 93.1 208 128 208s66.6-13.3 91.7-38.3c18.8-18.9 27.3-37.7 27.6-38.4a8 8 0 0 0 0-6.5ZM128 192c-30.8 0-57.7-11.2-79.9-33.3A130.3 130.3 0 0 1 25 128a130.3 130.3 0 0 1 23.1-30.8C70.3 75.2 97.2 64 128 64s57.7 11.2 79.9 33.2A130.3 130.3 0 0 1 231 128c-7.2 13.5-38.6 64-103 64Zm0-112a48 48 0 1 0 48 48 48 48 0 0 0-48-48Zm0 80a32 32 0 1 1 32-32 32 32 0 0 1-32 32Z"/></svg>'
LOCK = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16ZM96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160v112Zm-68-56a12 12 0 1 1-12-12 12 12 0 0 1 12 12Z"/></svg>'
BADGE = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M200 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V40a16 16 0 0 0-16-16Zm0 192H56V40h144v176ZM88 64a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16H96a8 8 0 0 1-8-8Zm84.4 117.2a52 52 0 0 0-23.6-26.8 36 36 0 1 0-41.6 0 52 52 0 0 0-23.6 26.8 8 8 0 1 0 14.8 6C102.5 175.8 114.6 168 128 168s25.5 7.8 29.6 19.2a8 8 0 1 0 14.8-6ZM108 136a20 20 0 1 1 20 20 20 20 0 0 1-20-20Z"/></svg>'
QUESTION = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M140 180a12 12 0 1 1-12-12 12 12 0 0 1 12 12ZM128 72c-22.1 0-40 16.1-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.8-20 24-20s24 9 24 20-10.8 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.7c18.2-3.3 32-17.3 32-34.3 0-19.9-17.9-36-40-36Zm104 56A104 104 0 1 1 128 24a104 104 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88 88 88 0 0 0 88-88Z"/></svg>'
LEGAL = '<div class="legal"><a>Privacy</a><span class="sep">·</span><a>Terms</a><span class="sep">·</span><a>Support</a><div style="margin-top:4px">NEVORA by VELANI LLC</div></div>'
DLEGAL = '<div class="dlegal"><span>© 2026 VELANI LLC</span><a>Privacy</a><a>Terms</a><a>Support</a></div>'


def page(body, title):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="../auth.css"></head><body>{body}</body></html>'


def fld(label, ph=None, val=None, eye=False, focus=False):
    inner = f'<span class="val">{val}<span class="caret"></span></span>' if focus else (f'<span class="val">{val}</span>' if val else f'<span class="val ph">{ph}</span>')
    return f'<div class="fld{" focus" if focus else ""}"><div class="in"><label>{label}</label>{inner}</div>{EYE if eye else ""}</div>'


def dfld(label, ph, eye=False, hint=None, focus=False, aside=""):
    return (f'<div class="dfld"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}"><span class="ph">{ph}</span>{EYE if eye else ""}</div>'
            + (f'<div class="hint">{hint}</div>' if hint else "") + '</div>')


def cell(icon, title, sub=None, gray=False):
    s = f'<span class="s">{sub}</span>' if sub else ""
    return f'<div class="cell"><span class="sq{" gray" if gray else ""}">{icon}</span><span class="t">{title}{s}</span>{CHEV}</div>'


# ---------------- Phones ----------------
phone_signin = f"""<div class="ios">{SB}
<div class="brand"><img src="{PUB}/images/nevora-wordmark.png" alt="NEVORA"><span class="ws">{WS}</span></div>
<div class="lt center"><h1>Sign in</h1></div>
<div class="grp">{fld("Employee ID", "Enter your employee ID", focus=True, val="NQ-1042")}{fld("Password", "Enter your password", eye=True)}</div>
<div class="btn">Sign in</div>
<a class="link">Forgot access?</a>
<div class="grp" style="margin-top:34px">{cell(BADGE, "Activate your account", "New employee?")}</div>
{LEGAL}{HOME}</div>"""

phone_forgot = f"""<div class="ios">{SB}
<div class="nav"><span class="back">{BACK}<span>Sign in</span></span></div>
<div class="lt"><h1>Forgot access</h1></div>
<div class="grp">{fld("Employee ID", "Enter your employee ID")}{fld("Recovery email", "you@example.com")}</div>
<p class="foot">Use the email registered with your account.</p>
<div class="btn">Request recovery</div>
<a class="link">I already have a recovery code</a>
<div class="grp" style="margin-top:34px">{cell(QUESTION, "Can’t use your recovery email?", None, gray=True)}</div>
{LEGAL}{HOME}</div>"""

phone_reset = f"""<div class="ios">{SB}
<div class="nav"><span class="back">{BACK}<span>Back</span></span></div>
<div class="lt"><h1>Set a new password</h1></div>
<div class="grp">{fld("Recovery code", val="7KQ4-M2PX-9TRD")}</div>
<p class="foot">Filled from your recovery link, or paste the code you received.</p>
<div class="grp">{fld("New password", "Create a new password", eye=True)}{fld("Confirm new password", "Enter it again")}</div>
<p class="foot">At least 8 characters.</p>
<div class="btn">Reset password</div>
<div class="grp" style="margin-top:30px">{cell(QUESTION, "Need a recovery code?", None, gray=True)}</div>
{LEGAL}{HOME}</div>"""

phone_activate = f"""<div class="ios">{SB}
<div class="nav"><span class="back">{BACK}<span>Sign in</span></span></div>
<div class="lt"><h1>Activate account</h1></div>
<div class="grp">{fld("Employee ID", "Enter your employee ID")}{fld("Phone number", "787-555-1234")}</div>
<p class="foot">Use the number your workplace has on file.</p>
<div class="grp">{fld("Create password", "Choose your password", eye=True)}{fld("Confirm password", "Re-enter your password")}</div>
<p class="foot">At least 8 characters.</p>
<div class="btn">Activate account</div>
<div class="grp" style="margin-top:30px">{cell(QUESTION, "Need your employee details?", None, gray=True)}</div>
{HOME}</div>"""

# ---------------- Desktop ----------------
d_signin_form = f"""<div class="col"><h1>Sign in</h1><p class="sub">{WS}</p>
{dfld("Employee ID", "Enter your employee ID", focus=True)}
{dfld("Password", "Enter your password", eye=True, aside='<a>Forgot access?</a>')}
<div class="dbtn">Sign in</div>
<div class="drow"><span class="ico">{BADGE}</span><span>New employee? <a>Activate your account</a></span></div></div>"""

d_reset_form = f"""<div class="col"><h1>Set a new password</h1><p class="sub">{WS}</p>
{dfld("Recovery code", "Paste your recovery code", hint="Filled from your recovery link, or paste the code you received.")}
{dfld("New password", "Create a new password", eye=True, hint="At least 8 characters.")}
{dfld("Confirm new password", "Enter it again")}
<div class="dbtn">Reset password</div>
<div class="drow"><span class="ico">{QUESTION}</span><span>Need a recovery code? <a>Request recovery</a></span></div>
<a class="dlink">‹ Back to sign in</a></div>"""

top_a = f'<div class="top"><img src="{PUB}/images/nevora-wordmark.png" alt="NEVORA"><span class="ws"></span></div>'
photo = f"""<div class="photo"><img src="{PUB}/assets/illustrations/login-daylight-blue-v2.png" alt="">
<div class="cap"><img class="mark" src="../wordmark-white.png" alt="NEVORA"><p>Brighter work ahead</p><span>Schedules, time and pay for your whole team.</span></div></div>"""

desk_a = f'<div class="desk">{top_a}{d_signin_form}{DLEGAL}</div>'
desk_b = f'<div class="desk b">{photo}{d_signin_form}{DLEGAL}</div>'
desk_b_reset = f'<div class="desk b">{photo}{d_reset_form}{DLEGAL}</div>'
desk_a_reset = f'<div class="desk">{top_a}{d_reset_form}{DLEGAL}</div>'

for name, body in {
    "phone-signin-390": phone_signin, "phone-forgot-390": phone_forgot, "phone-reset-390": phone_reset,
    "phone-activate-390": phone_activate, "desk-signin-A-1440": desk_a, "desk-signin-B-1440": desk_b,
    "desk-reset-A-1440": desk_a_reset, "desk-reset-B-1440": desk_b_reset,
}.items():
    (OUT / f"{name}.html").write_text(page(body, name))

# ---------------- Direction C ----------------
ARROW = '<svg width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="m221.7 133.7-72 72a8 8 0 0 1-11.4-11.4L196.7 136H40a8 8 0 0 1 0-16h156.7l-58.4-58.3a8 8 0 0 1 11.4-11.4l72 72a8 8 0 0 1 0 11.4Z"/></svg>'
WSROW = f'<div class="wsrow"><span class="tile">N</span><div><b>{WS}</b><span>Powered by NEVORA</span></div></div>'

def cfld(label, ph=None, val=None, eye=False, focus=False, aside=""):
    inner = f'<span class="val">{val}</span>' if val else f'<span class="ph">{ph}</span>'
    return f'<div class="cfld"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}">{inner}{EYE if eye else ""}</div></div>'

c_form = (f'{WSROW}<div class="chead"><h1>Welcome back</h1><p>Sign in to see your schedule, time and pay.</p></div>'
          + cfld("Employee ID", val="NQ-1042", focus=True) + cfld("Password", "Enter your password", eye=True, aside="<a>Forgot access?</a>")
          + '<div class="cbtn">Sign in</div>'
          + f'<div class="crow"><span>New employee? <a>Activate your account</a></span><span class="arrow">{ARROW}</span></div>')
desk_c = (f'<div class="desk c"><div class="c-photo"><img src="{PUB}/assets/illustrations/login-daylight-blue-v2.png" alt=""></div>'
          f'<img class="c-mark" src="../wordmark-white.png" alt="NEVORA">'
          f'<div class="c-cap"><p>Brighter work ahead</p><span>Schedules, time and pay for your whole team.</span>'
          f'<div class="legal-w"><span>© 2026 VELANI LLC</span><span>Privacy</span><span>Terms</span><span>Support</span></div></div>'
          f'<div class="panel">{c_form}</div></div>')
phone_c = (f'<div class="ios c"><div class="c-photo"><img src="{PUB}/assets/illustrations/login-daylight-blue-v2.png" alt=""></div>{SB}'
           f'<img class="c-mark" src="../wordmark-white.png" alt="NEVORA"><p class="c-tag">Brighter work ahead</p>'
           f'<div class="sheet">{WSROW}<div class="chead"><h1>Welcome back</h1></div>'
           + cfld("Employee ID", val="NQ-1042", focus=True) + cfld("Password", "Enter your password", eye=True)
           + '<div class="cbtn">Sign in</div><a class="clink">Forgot access?</a>'
           + f'<div class="crow"><span>New employee? <a>Activate your account</a></span><span class="arrow">{ARROW}</span></div>'
           + '<div class="clegal">Privacy<span class="sep">·</span>Terms<span class="sep">·</span>Support</div></div>' + HOME + '</div>')
(OUT / "desk-signin-C-1440.html").write_text(page(desk_c, "desk-signin-C-1440"))
(OUT / "phone-signin-C-390.html").write_text(page(phone_c, "phone-signin-C-390"))

# ---------------- C with the team photo, all four pages ----------------
TEAM = "../hero-team.jpg"
SMALLBACK = BACK.replace('width="12" height="20"', 'width="9" height="15"')
BACKW = f'<span class="back-w">{SMALLBACK}<span>Sign in</span></span>'
PLEGAL = '<div class="plegal"><span>© 2026 VELANI LLC</span><span>Privacy</span><span>Terms</span><span>Support</span></div>'

def cfld2(label, ph=None, val=None, eye=False, focus=False, aside="", hint=None):
    h = f'<div class="hint-s">{hint}</div>' if hint else ""
    inner = f'<span class="val">{val}</span>' if val else f'<span class="ph">{ph}</span>'
    return f'<div class="cfld"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}">{inner}{EYE if eye else ""}</div>{h}</div>'

def help_row(q, link=""):
    return f'<div class="crow"><span>{q}{(" <a>" + link + "</a>") if link else ""}</span><span class="arrow">{ARROW}</span></div>'

PAGES = {
  "signin": dict(title="Welcome back", sub="Sign in to see your schedule, time and pay.", ws=True, back=False,
    fields=[("Employee ID", None, "NQ-1042", False, True, "", None), ("Password", "Enter your password", None, True, False, "<a>Forgot access?</a>", None)],
    btn="Sign in", after="", help=("New employee?", "Activate your account")),
  "forgot": dict(title="Forgot access", sub=None, ws=False, back=True,
    fields=[("Employee ID", "Enter your employee ID", None, False, False, "", None), ("Recovery email", "you@example.com", None, False, False, "", "Use the email registered with your account.")],
    btn="Request recovery", after='<a class="clink">I already have a recovery code</a>', help=("Can’t use your recovery email?", "")),
  "reset": dict(title="Set a new password", sub=None, ws=False, back=True,
    fields=[("Recovery code", None, "7KQ4-M2PX-9TRD", False, False, "", "Filled from your recovery link, or paste the code you received."), ("New password", "Create a new password", None, True, False, "", "At least 8 characters."), ("Confirm new password", "Enter it again", None, False, False, "", None)],
    btn="Reset password", after="", help=("Need a recovery code?", "")),
  "activate": dict(title="Activate account", sub=None, ws=False, back=True,
    fields=[("Employee ID", "Enter your employee ID", None, False, False, "", None), ("Phone number", "787-555-1234", None, False, False, "", "Use the number your workplace has on file."), ("Create password", "Choose your password", None, True, False, "", "At least 8 characters."), ("Confirm password", "Re-enter your password", None, False, False, "", None)],
    btn="Activate account", after="", help=("Need your employee details?", "")),
}

def form(pg, phone):
    head = (WSROW if pg["ws"] else "") + f'<div class="chead"><h1>{pg["title"]}</h1>' + (f'<p>{pg["sub"]}</p>' if pg["sub"] and not phone else "") + '</div>'
    fl = "".join(cfld2(l, ph, v, e, f, (a if not phone else ""), h) for (l, ph, v, e, f, a, h) in pg["fields"])
    after = pg["after"] or ('<a class="clink">Forgot access?</a>' if phone and pg["ws"] else "")
    if not phone and pg["after"]:
        after = pg["after"].replace('class="clink"', 'class="dlink"')
    return head + fl + f'<div class="cbtn">{pg["btn"]}</div>' + after + help_row(*pg["help"])

for key, pg in PAGES.items():
    dback = f'<a class="dback">‹ Back to sign in</a>' if pg["back"] else ""
    desk = (f'<div class="desk c team"><div class="c-photo"><img src="{TEAM}" alt=""></div><img class="c-mark" src="../wordmark-white.png" alt="NEVORA">'
            f'<div class="panel">{dback}{form(pg, False)}{PLEGAL}</div></div>')
    top = BACKW if pg["back"] else '<img class="c-mark" src="../wordmark-white.png" alt="NEVORA">'
    cls = "ios c team sub" if pg["back"] else "ios c team"
    phone = (f'<div class="{cls}"><div class="c-photo"><img src="{TEAM}" alt=""></div>{SB}{top}'
             f'<div class="sheet">{form(pg, True)}</div>{HOME}</div>')
    (OUT / f"team-desk-{key}-1440.html").write_text(page(desk, key))
    (OUT / f"team-phone-{key}-390.html").write_text(page(phone, key))

# ---------------- Direction D: brand-led, dark, no photo ----------------
MARK = ('<svg class="mark-big" viewBox="0 0 200 177" aria-hidden="true"><path class="l" d="M14 170 L100 16 L186 170" stroke-width="26"/>'
        '<path class="t" d="M80 170 L100 134 L120 170 Z"/></svg>')
WM_W = '<img class="wm" src="../wordmark-white.png" alt="NEVORA">'
WS2 = f'<div class="ws2"><span class="tile2">N</span><div><b>{WS}</b><span class="s">Powered by NEVORA</span></div></div>'
ARW = ARROW
def dfl(label, ph=None, val=None, eye=False, focus=False, aside="", hint=None):
    inner = f'<span>{val}</span>' if val else f'<span class="ph">{ph}</span>'
    return (f'<div class="dfl"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}">{inner}{EYE if eye else ""}</div>'
            + (f'<div class="hint-d">{hint}</div>' if hint else "") + '</div>')
LEG_D = '<div class="legal-d"><span>© 2026 VELANI LLC</span><span>Privacy</span><span>Terms</span><span>Support</span></div>'

def d_form(key, phone):
    pg = PAGES[key]
    head = (WS2 if pg["ws"] else '<span class="backd">‹ Back to sign in</span>') + f'<h1 class="dt">{pg["title"]}</h1>'
    if pg["sub"] and not phone: head += f'<p class="dsub">{pg["sub"]}</p>'
    fl = "".join(dfl(l, ph, v, e, f, (a.replace("<a>", "<a>") if not phone else ""), h) for (l, ph, v, e, f, a, h) in pg["fields"])
    after = pg["after"].replace('class="clink"', 'class="dl"') if pg["after"] else ('<a class="dl">Forgot access?</a>' if phone and pg["ws"] else "")
    q, link = pg["help"]
    row = f'<div class="drow2"><span>{q}{(" <a>" + link + "</a>") if link else ""}</span><span class="ar">{ARW}</span></div>'
    return head + fl + f'<div class="wbtn">{pg["btn"]}</div>' + after + row

for key in ["signin", "reset", "forgot", "activate"]:
    pg = PAGES[key]
    desk = (f'<div class="desk dk">{MARK}{WM_W}<div class="line1"><b>Brighter work ahead</b>Schedules, time and pay for your whole team, in one place.</div>'
            f'{LEG_D}<div class="formcol">{d_form(key, False)}</div></div>')
    cls = "ios dk sub" if pg["back"] else "ios dk"
    top = '' if pg["back"] else WM_W
    phone = f'<div class="{cls}">{SB}{MARK}<div class="inner">{top}{d_form(key, True)}</div>{"" if pg["back"] else LEG_D}{HOME}</div>'
    (OUT / f"dark-desk-{key}-1440.html").write_text(page(desk, key))
    (OUT / f"dark-phone-{key}-390.html").write_text(page(phone, key))

# ---------------- Direction E: cream page, calm form, deep teal stage with an extruded Λ ----------------
def extruded_mark(depth=22):
    face = "M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"
    tri = "M146 330 L180 266 L214 330 Z"
    # Side faces: the face stepped down-right in a mid teal (the chevron) and a deeper sky (the triangle); a separate
    # hard floor shadow sits further out. Triangle depth is drawn before the chevron face so the face covers it cleanly.
    layers = "".join(f'<path d="{face}" transform="translate({i*0.8:.1f},{i:.0f})" fill="#0A6B66"/>' for i in range(depth, 0, -1))
    tlayers = "".join(f'<path d="{tri}" transform="translate({i*0.8:.1f},{i:.0f})" fill="#1B86B5"/>' for i in range(depth, 0, -1))
    shadow = f'<path d="{face}" transform="translate({depth*0.8+18:.0f},{depth+22})" fill="rgba(2,22,21,.42)"/>'
    return (f'<svg class="obj" viewBox="0 0 400 400" aria-hidden="true">{shadow}{layers}{tlayers}<path d="{face}" fill="#14A79F"/>'
            f'<path d="{tri}" fill="#35B6EC"/></svg>')
CAL = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16ZM72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160v112Z"/></svg>'
CLOCK = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M128 24a104 104 0 1 0 104 104A104.1 104.1 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8Z"/></svg>'
WALLET = '<svg width="18" height="18" viewBox="0 0 256 256"><path fill="currentColor" d="M216 64H56a8 8 0 0 1 0-16h136a8 8 0 0 0 0-16H56a24 24 0 0 0-24 24v128a24 24 0 0 0 24 24h160a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16Zm0 128H56a8 8 0 0 1-8-8V78.6A23.8 23.8 0 0 0 56 80h160Zm-48-60a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z"/></svg>'
TICK = '<svg width="10" height="10" viewBox="0 0 256 256"><path fill="currentColor" d="m232.5 77-128 128a12 12 0 0 1-17 0l-56-56a12 12 0 0 1 17-17l47.5 47.5L215.5 60a12 12 0 0 1 17 17Z"/></svg>'
CHIP1 = f'<div class="chip c1"><span class="ic">{CAL}</span><span><b>Morning shift</b>8:00 AM – 4:00 PM</span></div>'
CHIP2 = f'<div class="chip c2"><span class="ic sky">{CLOCK}</span><span><b>Clocked in<span class="ok">{TICK}</span></b>7:58 AM · Main Office</span></div>'
CHIP3 = f'<div class="chip c3"><span class="ic">{WALLET}</span><span><b>Payday Friday</b>Hours approved</span></div>'
WS_E = f'<div class="ws-e"><span class="tile-e">N</span><div><b>{WS}</b><span class="s">Powered by NEVORA</span></div></div>'
LEG_E = '<div class="legal-e"><span>© 2026 VELANI LLC</span><span>Privacy</span><span>Terms</span><span>Support</span></div>'
def efl(label, ph=None, val=None, eye=False, focus=False, aside="", hint=None):
    inner = f'<span>{val}</span>' if val else f'<span class="ph">{ph}</span>'
    return (f'<div class="efl"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}">{inner}{EYE if eye else ""}</div>'
            + (f'<div class="hint-e">{hint}</div>' if hint else "") + '</div>')
def e_form(key, phone):
    pg = PAGES[key]
    head = (WS_E if pg["ws"] else ('' if phone else '<span class="backe">‹ Back to sign in</span>')) + f'<h1 class="et">{pg["title"]}</h1>'
    if pg["sub"] and not phone: head += f'<p class="esub">{pg["sub"]}</p>'
    fl = "".join(efl(l, ph, v, e, f, (a if not phone else ""), h) for (l, ph, v, e, f, a, h) in pg["fields"])
    after = pg["after"].replace('class="clink"', 'class="elink"') if pg["after"] else ('<a class="elink">Forgot access?</a>' if phone and pg["ws"] else "")
    q, link = pg["help"]
    row = f'<div class="erow"><span>{q}{(" <a>" + link + "</a>") if link else ""}</span><span class="ar">{ARROW}</span></div>'
    return head + fl + f'<div class="ebtn">{pg["btn"]}</div>' + after + row

for key in ["signin", "reset", "forgot", "activate"]:
    pg = PAGES[key]
    stage_d = f'<div class="stage"><div class="grid"></div>{extruded_mark()}{CHIP1}{CHIP2}{CHIP3}</div>'
    desk = (f'<div class="desk ew"><img class="wm-e" src="{PUB}/images/nevora-wordmark.png" alt="NEVORA">'
            f'<div class="eform">{e_form(key, False)}</div>{LEG_E}{stage_d}</div>')
    sub = pg["back"]
    stage_p = f'<div class="stage"><div class="grid"></div>{extruded_mark(14)}{"" if sub else CHIP1 + CHIP2}</div>'
    phone = (f'<div class="ios ew{" sub" if sub else ""}">{stage_p}{SB}{"<span class=backe>‹ Sign in</span>" if sub else ""}'
             f'<div class="einner">{e_form(key, True)}{"" if sub else LEG_E}</div>{HOME}</div>')
    (OUT / f"warm-desk-{key}-1440.html").write_text(page(desk, key))
    (OUT / f"warm-phone-{key}-390.html").write_text(page(phone, key))

# ---------------- E2: refined warm direction ----------------
def flat_mark(tone="#164B48"):
    face = "M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"
    tri = "M146 330 L180 266 L214 330 Z"
    return f'<svg class="bigmark" viewBox="0 0 360 340" aria-hidden="true"><path d="{face}" fill="{tone}"/><path d="{tri}" fill="#35B6EC"/></svg>'
TODAY = ('<div class="device"><div class="scr"><div class="sbm"><span>9:41</span><span class="ic">' + SB.split('<span class="ic">')[1].split('</span></div>')[0] + '</span></div>'
         '<div class="hdr"><small>Tuesday, October 20</small><b>Today</b></div>'
         '<div class="card"><div class="k">Next shift</div><div class="tm">8:00 AM – 4:00 PM</div><div class="pl">Front desk · Main Office</div><div class="cta">Clock in</div></div>'
         '<div class="lab">This week</div><div class="rows"><div>Scheduled<span>32h</span></div><div>Worked<span>16h 05m</span></div><div>Time off<span>Fri</span></div></div>'
         '</div></div>')
EYEBROW = f'<div class="eyebrow"><i>N</i>{WS}</div>'
LEG2 = '<div class="legal2"><span>© 2026 VELANI LLC</span><span>Privacy</span><span>Terms</span><span>Support</span></div>'
def f2(label, ph=None, val=None, eye=False, focus=False, aside="", hint=None):
    inner = f'<span>{val}</span>' if val else f'<span class="ph">{ph}</span>'
    return (f'<div class="f2"><label><span>{label}</span>{aside}</label><div class="box{" focus" if focus else ""}">{inner}{EYE if eye else ""}</div>'
            + (f'<div class="h2x">{hint}</div>' if hint else "") + '</div>')
def e2_form(phone):
    out = EYEBROW + '<h1 class="t2">Good morning</h1>'
    if not phone: out += '<p class="s2">Sign in to see your schedule, time and pay.</p>'
    out += f2("Employee ID", val="NQ-1042", focus=True) + f2("Password", "Enter your password", eye=True, aside=("" if phone else "<a>Forgot access?</a>"))
    out += '<div class="b2">Sign in</div>'
    if phone: out += '<p class="alt"><a>Forgot access?</a></p>'
    out += '<p class="alt">New employee? <a>Activate your account</a></p>'
    return out
desk_e2 = (f'<div class="desk e2"><img class="wm2" src="{PUB}/images/nevora-wordmark.png" alt="NEVORA"><div class="col2">{e2_form(False)}</div>{LEG2}'
           f'<div class="panel2">{flat_mark()}<div class="cap2">NEVORA Workforce<b>Your week,<br>in one place.</b></div>{TODAY}</div></div>')
phone_e2 = (f'<div class="ios e2"><div class="band">{flat_mark()}<img class="wmw" src="../wordmark-white.png" alt="NEVORA"></div>{SB}'
            f'<div class="col2">{e2_form(True)}</div>{LEG2}{HOME}</div>')
(OUT / "e2-desk-signin-1440.html").write_text(page(desk_e2, "e2"))
(OUT / "e2-phone-signin-390.html").write_text(page(phone_e2, "e2"))

# ---------------- E3 ----------------
FACEID = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0"/></svg>'
SBI = SB.split('<span class="ic">')[1].split('</span></div>')[0]
TODAY3 = ('<div class="device"><span class="btn-side"></span><div class="island"></div><div class="scr"><div class="sbm"><span>9:41</span><span class="ic">' + SBI + '</span></div>'
          '<div class="greet"><small>Tuesday, October 20</small><b>Good morning, Alex</b></div>'
          '<div class="card"><div class="row2"><span class="k">Next shift</span><span class="pill">In 22 min</span></div><div class="tm">8:00 AM – 4:00 PM</div><div class="pl">Front desk · Main Office</div><div class="cta">Clock in</div></div>'
          '<div class="lab">This week</div><div class="rows"><div>Scheduled<span>32h</span></div><div>Worked<span>16h 05m</span></div><div>Next payday<span>Fri, Oct 23</span></div></div>'
          '<div class="tabbar"><span class="on"><i></i>Home</span><span><i></i>Schedule</span><span><i></i>Requests</span><span><i></i>More</span></div>'
          '</div></div>')
def e3_form(phone):
    out = EYEBROW + '<h1 class="t2">Good morning</h1>'
    if not phone: out += '<p class="s2">Sign in to see your schedule, time and pay.</p>'
    out += f2("Employee ID", val="NQ-1042", focus=True) + f2("Password", "Enter your password", eye=True, aside=("" if phone else "<a>Forgot access?</a>"))
    out += '<div class="b2">Sign in</div>'
    out += (f'<div class="b3">{FACEID}Sign in with Face ID</div>' if phone else f'<div class="or">or</div><div class="b3">{FACEID}Sign in with a passkey</div>')
    if phone: out += '<p class="alt"><a>Forgot access?</a></p>'
    out += '<p class="alt">New employee? <a>Activate your account</a></p>'
    return out
desk_e3 = (f'<div class="desk e2 e3"><img class="wm2" src="{PUB}/images/nevora-wordmark.png" alt="NEVORA"><div class="col2">{e3_form(False)}</div>{LEG2}'
           f'<div class="panel2">{flat_mark()}<div class="cap2">NEVORA Workforce<b>Your week,<br>in one place.</b></div>{TODAY3}</div></div>')
phone_e3 = (f'<div class="ios e2 e3"><div class="band">{flat_mark()}<img class="wmw" src="../wordmark-white.png" alt="NEVORA"><p class="bandline">Your week,<br>in one place.</p></div>{SB}'
            f'<div class="sheet3"></div><div class="col2">{e3_form(True)}</div>{LEG2}{HOME}</div>')
(OUT / "e3-desk-signin-1440.html").write_text(page(desk_e3, "e3"))
(OUT / "e3-phone-signin-390.html").write_text(page(phone_e3, "e3"))

# ---------------- E4 ----------------
LANG = '<div class="lang"><span class="on">English</span><span>Español</span></div>'
LANG_S = '<div class="lang"><span class="on">EN</span><span>ES</span></div>'
CHECK = '<svg width="16" height="16" viewBox="0 0 256 256"><path fill="currentColor" d="M173.7 98.3a8 8 0 0 1 0 11.4l-56 56a8 8 0 0 1-11.4 0l-24-24a8 8 0 0 1 11.4-11.4l18.3 18.4 50.3-50.4a8 8 0 0 1 11.4 0Z"/></svg>'
REQ = f'<div class="req"><span class="dot">{CHECK}</span><span><b>Time off · Mon, Oct 26</b><span class="s">Approved by Morgan</span></span><span class="st">Approved</span></div>'
TODAY4 = TODAY3.replace('<div class="tabbar">', REQ + '<div class="tabbar">')
desk_e4 = (f'<div class="desk e2 e3 e4"><img class="wm2" src="{PUB}/images/nevora-wordmark.png" alt="NEVORA">{LANG}<div class="col2">{e3_form(False)}</div>{LEG2}'
           f'<div class="panel2">{flat_mark()}<div class="grain"></div><div class="cap2">NEVORA Workforce<b>Your week,<br>in one place.</b>'
           f'<span class="cap-s">Shifts, hours, time off and pay, ready the moment you sign in.</span></div>{TODAY4}</div></div>')
phone_e4 = (f'<div class="ios e2 e3 e4"><div class="band">{flat_mark()}<div class="grain"></div><img class="wmw" src="../wordmark-white.png" alt="NEVORA"><p class="bandline">Your week,<br>in one place.</p></div>{SB}{LANG_S}'
            f'<div class="sheet3"></div><div class="col2">{e3_form(True)}</div>{LEG2}{HOME}</div>')
(OUT / "e4-desk-signin-1440.html").write_text(page(desk_e4, "e4"))
(OUT / "e4-phone-signin-390.html").write_text(page(phone_e4, "e4"))

# ---------------- E4: the other three pages ----------------
def e4_sub_form(key, phone):
    pg = PAGES[key]
    out = ('' if phone else '<a class="back2">‹ Back to sign in</a>') + f'<h1 class="t2">{pg["title"]}</h1>'
    out += "".join(f2(l, ph, v, e, f, "", h) for (l, ph, v, e, f, a, h) in pg["fields"])
    out += f'<div class="b2">{pg["btn"]}</div>'
    if pg["after"]: out += '<p class="alt"><a>I already have a recovery code</a></p>'
    out += f'<p class="alt"><a>{pg["help"][0]}</a></p>'
    return out
SMALLBACK_W = SMALLBACK.replace('<path ', '<path stroke="#fff" ')
for key in ["forgot", "reset", "activate"]:
    desk = (f'<div class="desk e2 e3 e4"><img class="wm2" src="{PUB}/images/nevora-wordmark.png" alt="NEVORA">{LANG}<div class="col2">{e4_sub_form(key, False)}</div>{LEG2}'
            f'<div class="panel2">{flat_mark()}<div class="grain"></div><div class="cap2">NEVORA Workforce<b>Your week,<br>in one place.</b>'
            f'<span class="cap-s">Shifts, hours, time off and pay, ready the moment you sign in.</span></div>{TODAY4}</div></div>')
    phone = (f'<div class="ios e2 e3 e4 sub"><div class="band">{flat_mark()}<div class="grain"></div></div>{SB}<span class="back4">{SMALLBACK_W}<span>Sign in</span></span>'
             f'<div class="sheet3"></div><div class="col2">{e4_sub_form(key, True)}</div>{HOME}</div>')
    (OUT / f"e4-desk-{key}-1440.html").write_text(page(desk, key))
    (OUT / f"e4-phone-{key}-390.html").write_text(page(phone, key))

print("built", len(list(OUT.glob("*.html"))))
