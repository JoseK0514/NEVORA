"""Employee Profile, complete version: phone page, phone Face ID sheet, desktop. Run: python3 -I profile2.py"""
from pathlib import Path

OUT = Path(__file__).parent / "html"


def ic(d, s=18):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 256 256"><path fill="currentColor" d="{d}"/></svg>'


P = {
    "face": None,
    "devices": "M208 40H48a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h160a24 24 0 0 0 24-24V64a24 24 0 0 0-24-24Zm8 136a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8Zm-48 48a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Z",
    "globe": "M128 24a104 104 0 1 0 104 104A104.2 104.2 0 0 0 128 24Zm87.6 96h-39.8c-1.4-28.5-10.3-55.4-25.4-76.3A88.2 88.2 0 0 1 215.6 120ZM128 215.4c-18.7-20.2-30-48.2-31.8-79.4h63.6c-1.8 31.2-13.1 59.2-31.8 79.4ZM96.2 120c1.8-31.2 13.1-59.2 31.8-79.4 18.7 20.2 30 48.2 31.8 79.4Zm10.4-76.3C91.5 64.6 82.6 91.5 81.2 120H40.4a88.2 88.2 0 0 1 66.2-76.3ZM40.4 136h40.8c1.4 28.5 10.3 55.4 25.4 76.3A88.2 88.2 0 0 1 40.4 136Zm109 76.3c15.1-20.9 24-47.8 25.4-76.3h40.8a88.2 88.2 0 0 1-66.2 76.3Z",
    "bell": "M221.8 175.9C216.2 166.3 208 139.1 208 104a80 80 0 1 0-160 0c0 35.1-8.2 62.3-13.8 71.9A16 16 0 0 0 48 200h40.8a40 40 0 0 0 78.4 0H208a16 16 0 0 0 13.8-24.1ZM128 216a24 24 0 0 1-22.6-16h45.2A24 24 0 0 1 128 216ZM48 184c7.7-13.2 16-43.7 16-80a64 64 0 1 1 128 0c0 36.3 8.3 66.8 16 80Z",
    "cal": "M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16ZM72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160v112Z",
    "pen": "M227.3 73.4 182.6 28.7a16 16 0 0 0-22.6 0L36.7 152A15.9 15.9 0 0 0 32 163.3V208a16 16 0 0 0 16 16h44.7a15.9 15.9 0 0 0 11.3-4.7L227.3 96a16 16 0 0 0 0-22.6ZM92.7 208H48v-44.7l88-88L180.7 120ZM192 108.7 147.3 64l24-24L216 84.7Z",
    "help": "M140 180a12 12 0 1 1-12-12 12 12 0 0 1 12 12ZM128 72c-22.1 0-40 16.1-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.8-20 24-20s24 9 24 20-10.8 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.7c18.2-3.3 32-17.3 32-34.3 0-19.9-17.9-36-40-36Zm104 56A104 104 0 1 1 128 24a104 104 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88 88 88 0 0 0 88-88Z",
    "doc": "M213.7 82.3l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.3-5.7ZM160 51.3 188.7 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48v120Z",
    "trash": "M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Z",
    "lock": "M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16ZM96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160v112Z",
    "cam": "M208 56h-27.7l-13.6-20.4A8 8 0 0 0 160 32H96a8 8 0 0 0-6.7 3.6L75.7 56H48a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h160a24 24 0 0 0 24-24V80a24 24 0 0 0-24-24Zm8 136a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h32a8 8 0 0 0 6.7-3.6L100.3 48h55.4l13.6 20.4A8 8 0 0 0 176 72h32a8 8 0 0 1 8 8ZM128 88a44 44 0 1 0 44 44 44 44 0 0 0-44-44Zm0 72a28 28 0 1 1 28-28 28 28 0 0 1-28 28Z",
}
FACE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0"/></svg>'
CHEV = '<svg class="chev" width="8" height="14" viewBox="0 0 8 14"><path d="m1 1 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
MARK = '<svg class="mk" viewBox="0 0 360 340" aria-hidden="true"><path class="l" d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path class="t" d="M146 330 L180 266 L214 330 Z"/></svg>'
SB = ('<div class="sb"><span>9:41</span><span class="ic2"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
      '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/></svg></span></div>')


def row(icon, title, sub=None, right="", cls="", need=None):
    s = f"<span>{sub}</span>" if sub else ""
    n = f' data-need="{need}"' if need else ""
    return f'<div class="row {cls}{" need" if need else ""}"{n}><span class="ic{" red" if "red" in cls else ""}">{icon}</span><span class="tx"><b>{title}</b>{s}</span>{right}</div>'


def kv(k, v):
    return f'<div class="row kv"><span class="k">{k}</span><span class="v">{v}</span></div>'


ON = '<span class="on">On</span>'


def body(phone):
    face_title = "Face ID" if phone else "Passkey sign-in"
    face_sub = "iPhone · Sign in with a glance" if phone else "MacBook Pro · Sign in without a password"
    security = ('<div class="sec"><h2>Sign-in and security</h2>'
                '<p class="lead">Your face or fingerprint never leaves your device.</p><div class="list">'
                + row(FACE, face_title, face_sub, ON + CHEV)
                + row(ic(P["devices"]), "Where you’re signed in", "This iPhone and 1 other device", CHEV, need="Codex")
                + '</div><p class="foot need" data-need="Codex" style="padding-right:70px">Last signed in today at 8:02 AM on this iPhone.</p></div>')
    prefs = ('<div class="sec"><h2>Preferences</h2><div class="list">'
             + row(ic(P["globe"]), "Language", None, '<span class="val">English</span>' + CHEV)
             + row(ic(P["bell"]), "Notifications", "Schedule changes and request updates", '<span class="off">Off</span>' + CHEV)
             + row(ic(P["cal"]), "Calendar", "Add your shifts to Apple, Google or Outlook", '<span class="val">Not set up</span>' + CHEV)
             + '</div></div>')
    work = ('<div class="sec"><h2>Your workplace</h2><div class="list">'
            + kv("Role", "Employee") + kv("Locations", "Main Office · West Office") + kv("Time zone", "Puerto Rico time")
            + '</div><p class="foot">Shift times are shown in this time zone.</p>'
            + '<div class="list" style="margin-top:12px">' + row(ic(P["pen"]), "Report a correction", "Tell your manager what’s wrong", CHEV, need="Codex") + '</div></div>')
    help_ = ('<div class="sec"><h2>Help and account</h2><div class="list">'
             + row(ic(P["help"]), "Help and support", None, CHEV)
             + row(ic(P["doc"]), "Privacy and terms", None, CHEV, need="Compliance")
             + row(ic(P["trash"]), "Delete my account", None, CHEV, cls="red", need="Compliance")
             + '</div></div>')
    tail = ('<div class="signout">Sign out</div>'
            f'<p class="privacy">{ic(P["lock"], 15)}<span>Your managers see your work details. They can’t see your password or Face ID.</span></p>'
            '<p class="ver">NEVORA by VELANI LLC</p>')
    return security + prefs + work + help_ + tail


CAM = f'<span class="cam">{ic(P["cam"], 13)}</span>'
WHO = (f'<div class="who"><span class="av need" data-need="Codex photo">AR{CAM}</span><div><span class="eb">Profile</span>'
       '<b>Alexandra Rivera</b><span class="s">Employee · Northside QA Workforce</span></div></div>')
WHO_P = WHO.replace(' need" data-need="Codex photo"', '"')

phone = (f'<div class="ios"><div class="band">{MARK}<div class="grain"></div></div>{SB}'
         '<div class="topbar"><span class="wm">NEVORA</span>' + ic(P["bell"], 22) + '</div>'
         f'{WHO_P}<div class="sheet">{body(True)}</div>'
         '<div class="tabbar"><span><i></i>Home</span><span><i></i>Schedule</span><span><i></i>Requests</span><span><i></i>Pay</span><span class="on"><i></i>More</span></div></div>')

sheet = (f'<div class="ios dim"><div class="band">{MARK}<div class="grain"></div></div>{SB}<div class="topbar"><span class="wm">NEVORA</span></div>{WHO_P}'
         '<div class="scrim"></div><div class="msheet"><div class="grab"></div><h3>Face ID</h3>'
         '<p class="sub">Sign in to NEVORA with a glance. Your face never leaves this iPhone.</p>'
         '<div class="list">' + row(FACE, "This iPhone", "Added Oct 20 · Last used today", ON)
         + row(ic(P["devices"]), "MacBook Pro", "Added Oct 12 · Last used Oct 19", "") + '</div>'
         '<div class="btn sec">Add another device</div>'
         '<div class="btn dan">Turn off Face ID on this iPhone</div>'
         '<p class="foot" style="text-align:center;margin-top:10px">You’ll sign in with your password next time.</p></div></div>')

desk = ('<div class="desk"><div class="side"><span class="wm">NEVORA</span><ul>'
        '<li><i></i>Home</li><li><i></i>My schedule</li><li><i></i>My time</li><li><i></i>Requests</li><li><i></i>Updates</li><li><i></i>My pay</li><li class="on"><i></i>Profile</li></ul></div>'
        f'<div class="band">{MARK}<div class="grain"></div>{WHO}</div><div class="col">{body(False)}</div></div>')


def page(b, t):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{t}</title><link rel="stylesheet" href="../profile2.css"></head><body>{b}</body></html>'


(OUT / "p2-phone-390.html").write_text(page(phone, "Profile"))
(OUT / "p2-phone-faceid-390.html").write_text(page(sheet, "Face ID"))
(OUT / "p2-desk-1440.html").write_text(page(desk, "Profile"))
print("ok")
