import base64, os, html
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'out')

def img(name):
    with open(os.path.join(OUT, name + '.png'), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

SECTIONS = [
    ('Employee: the everyday screens', 'One white page, 34pt titles, grouped rows and one teal, like the Owner app. Teal appears as a card only on Home, for the next shift.', [
        ('E01-Home', 'Home', 'Next shift as the one teal card; what needs you; the week in two rows.'),
        ('E02-Schedule', 'Schedule', 'Week strip, confirm the week, then today and what is coming up.'),
        ('E06-Requests', 'Requests', 'What is waiting, then what you can ask for. Plus starts a new request.'),
        ('E11-Pay', 'Pay', 'Next payday, this week’s hours, statements. Payroll wording unchanged.'),
        ('E15-More', 'More', 'A page, like the Owner’s, instead of a pop-up sheet.'),
    ]),
    ('Changing a shift: bottom sheets', 'Tapping a shift opens a sheet over the schedule. Swap and Unable to work are sheets, so there is no separate page and no false error.', [
        ('E03-ShiftSheet', 'Shift', 'The shift in full, then the three ways to change it.'),
        ('E04-SwapSheet', 'Swap', 'Pick the teammate’s shift; who approves is said once.'),
        ('E05-CalloutSheet', 'Unable to work', 'The same six reasons managers see.'),
        ('E08-TimeOffSheet', 'Request time off', 'Full days or part of a day, two date rows, an optional note.'),
    ]),
    ('Requests, time and updates', 'Segments replace the tab strip that scrolled off the screen; zero counts are hidden.', [
        ('E07-TimeOff', 'Time off', 'Waiting and decided requests.'),
        ('E09-ShiftRequests', 'Shift requests', 'Open shifts, for you, yours. One empty line, not two.'),
        ('E10-Availability', 'Availability', 'Seven rows, one per day; Save in the bar.'),
        ('E12-MyTime', 'My time', 'Hours at one size; corrections as a quiet button.'),
        ('E13-Updates', 'Updates', 'One list; opening doesn’t confirm.'),
        ('E14-Notifications', 'Notifications', 'Each schedule notice names its week.'),
    ]),
    ('Profile and Delete account', 'Delete account keeps every sentence, regrouped as three rows with icons. Asking a second time is a switch, and the red button only wakes when it is on.', [
        ('E16-Profile', 'Profile', 'Settings, work details, your account, sign out.'),
        ('E17-DeleteAccount', 'Delete account', 'Account, what happens, confirm, keep my account.'),
    ]),
    ('Lead and Manager', 'A Lead sees the same app with a team section and can message today’s team. A Manager without access gets one calm page.', [
        ('L01-LeadHome', 'Lead · Home', 'Shift lead on the card; today’s team.'),
        ('L02-LeadUpdates', 'Lead · Updates', 'Plus messages today’s team.'),
        ('M01-NoAccess', 'Manager · No access', 'Same words as today; tab bar shares its width.'),
    ]),
    ('Dark mode, every role', 'True black, lifted greys, one lifted teal for text and the active tab. The teal button keeps white text, and a selected segment sits lighter than its track. Sign-in follows the phone too.', [
        ('D01-HomeDark', 'Home', ''),
        ('D02-ScheduleDark', 'Schedule', ''),
        ('D03-RequestsDark', 'Requests', ''),
        ('D04-ProfileDark', 'Profile', ''),
        ('D05-SignInDark', 'Sign in', ''),
        ('D06-OwnerTodayDark', 'Owner · Today', 'Proposed: the Owner app follows the phone as well.'),
    ]),
]

DECISIONS = [
    ('Owner dark mode', 'Today the Owner and Manager app stays light even when the phone is dark. These mockups propose it follows the phone like everyone else (last screen).'),
    ('Delete account layout', 'The legal sentences are unchanged, but they are regrouped into rows and the long retention list opens from “What may be kept”. Needs your OK because it is account-deletion wording.'),
    ('More becomes a page', 'For employees, More opens a page (like the Owner’s) instead of a pop-up sheet.'),
    ('Shift changes as sheets', 'Swap, offer for cover and Unable to work start from a shift and open as sheets; the separate pages go away.'),
]

cards = []
for title, note, items in SECTIONS:
    figs = ''.join(f'''<figure class="shot"><img src="{img(n)}" alt="{html.escape(t)} mockup" loading="lazy"><figcaption><b>{html.escape(t)}</b>{f"<span>{html.escape(c)}</span>" if c else ""}</figcaption></figure>''' for n, t, c in items)
    cards.append(f'<section class="group"><header><h2>{html.escape(title)}</h2><p>{html.escape(note)}</p></header><div class="shots">{figs}</div></section>')
dec = ''.join(f'<li><b>{html.escape(a)}</b><span>{html.escape(b)}</span></li>' for a, b in DECISIONS)

page = f'''<title>NEVORA v5 One look</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: a quiet review board; phone screens in wrapping rows, grouped by job, decisions first. */
:root {{
  --bg: #F4F4F2; --card: #FFFFFF; --ink: #111413; --muted: #62625F; --line: #E2E2DE; --teal: #0B6E69;
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0E0F0F; --card: #1A1B1B; --ink: #F2F2F0; --muted: #A2A29E; --line: #2C2D2D; --teal: #5CC8BE; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #0E0F0F; --card: #1A1B1B; --ink: #F2F2F0; --muted: #A2A29E; --line: #2C2D2D; --teal: #5CC8BE; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--ink); font: 400 15px/1.5 var(--font); -webkit-font-smoothing: antialiased; }}
.wrap {{ max-width: 1240px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
.intro h1 {{ margin: 0; font-size: 34px; line-height: 41px; font-weight: 700; letter-spacing: -.6px; text-wrap: balance; }}
.intro p {{ margin: 8px 0 0; max-width: 64ch; color: var(--muted); font-size: 17px; line-height: 25px; }}
.decide {{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px 24px; }}
.decide h2 {{ margin: 0 0 12px; font-size: 20px; line-height: 25px; font-weight: 600; letter-spacing: -.4px; }}
.decide ul {{ margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }}
.decide li {{ display: grid; gap: 2px; }}
.decide li b {{ font-weight: 600; }}
.decide li span {{ color: var(--muted); max-width: 80ch; }}
.group header h2 {{ margin: 0; font-size: 20px; line-height: 25px; font-weight: 600; letter-spacing: -.4px; text-wrap: balance; }}
.group header p {{ margin: 4px 0 0; color: var(--muted); max-width: 72ch; }}
.shots {{ margin-top: 16px; display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }}
.shot {{ margin: 0; width: 220px; min-width: 0; display: grid; gap: 8px; }}
.shot img {{ display: block; width: 100%; height: auto; border-radius: 22px; box-shadow: 0 0 0 1px var(--line); background: #fff; }}
.shot figcaption {{ display: grid; gap: 2px; font-size: 13px; line-height: 18px; }}
.shot figcaption b {{ font-size: 15px; line-height: 20px; font-weight: 600; }}
.shot figcaption span {{ color: var(--muted); }}
.foot {{ color: var(--muted); font-size: 13px; }}
@media (max-width: 520px) {{ .shot {{ width: calc(50% - 10px); }} }}
</style>
<div class="wrap">
  <section class="intro">
    <h1>NEVORA v5 · One look</h1>
    <p>Every role on the approved Quiet base, so signing in and moving between Owner, Manager, Lead and Employee feels like one product. 26 phone screens with fictional people and data. Approve these and they are built exactly, as with v4.</p>
  </section>
  <section class="decide" aria-labelledby="decide-title">
    <h2 id="decide-title">Decisions for you</h2>
    <ul>{dec}</ul>
  </section>
  {''.join(cards)}
  <p class="foot">Built from the v4 kit (kit4.css) plus the v5 additions: the Home card, sheets, radio rows and dark tokens. Phosphor icons only; type scale 34 · 20 · 17 · 15 · 13 · 11.</p>
</div>
'''
open(os.path.join(D, 'NEVORA-v5-one-look.html'), 'w').write(page)
print('ok', len(page) // 1024, 'KB')
