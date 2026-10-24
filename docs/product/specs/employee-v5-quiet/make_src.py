# Writes the v5 "One look" mockup sources (Quiet kit) to src/. Fictional data only.
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
os.makedirs(D, exist_ok=True)
CHEV = '{{i:CaretRight:s chev}}'
WK = '''.wk{display:grid;grid-template-columns:repeat(7,1fr);margin:20px 12px 0}
.wk a{display:flex;flex-direction:column;align-items:center;gap:6px}
.wk small{font-size:13px;line-height:18px;font-weight:500;color:#8A8A87}
.wk b{display:grid;place-items:center;width:36px;height:36px;border-radius:18px;font-weight:400;font-variant-numeric:tabular-nums}
.wk .on b{background:#111413;color:#fff;font-weight:600}
.wk i{display:block;width:5px;height:5px;border-radius:3px;background:#C8C8C5;margin-top:-2px}
.wk .off i{background:transparent}
.sh{display:flex;align-items:baseline;justify-content:space-between;margin:32px 20px 4px}
.sh b{font-size:20px;line-height:25px;font-weight:600;letter-spacing:-.4px}
.sh span{font-size:15px;line-height:20px;color:#6B6B6B}
.dark .sh span{color:#9A9A96}'''
WHO = '''.who{display:flex;align-items:center;gap:16px;margin:12px 20px 0}
.who h1{margin:0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-.5px}
.who p{margin:2px 0 0;font-size:15px;line-height:20px;color:#6B6B6B}
.dark .who p{color:#9A9A96}'''
ROWICON = '''.row > .ic{color:#4A4A48}.dark .row > .ic{color:#C7C7CC}.row.danger > .ic{color:#C42B1C}.dark .row.danger > .ic{color:#FF6B5E}'''

def week(on='24'):
    days = [('M', '19'), ('T', '20'), ('W', '21'), ('T', '22'), ('F', '23'), ('S', '24'), ('S', '25')]
    out = []
    for d, n in days:
        cls = 'on' if n == on else ''
        out.append(f'<a class="{cls}" href="#"><small>{d}</small><b>{n}</b><i></i></a>')
    return '<div class="wk">' + ''.join(out) + '</div>'

def page(name, title, body, style='', dark=False, height=None):
    st = f'<style>\n{style}\n</style>\n' if style else ''
    cls = 'p dark' if dark else 'p'
    hs = f' style="height:{height}px"' if height else ''
    open(os.path.join(D, name + '.html'), 'w').write(f'@title {title}\n{st}<div class="{cls}"{hs}>\n{body}\n</div>\n')

# ---------------- Employee ----------------
def home(dark=False, lead=False):
    team = f'''
  <div class="sec">Today’s team</div>
  <div>
    <a class="row" href="#"><span class="rt"><b>4 on shift now</b><i>Main Office · you lead tomorrow</i></span>{CHEV}</a>
    <a class="row one" href="#"><span class="rt"><b>Message today’s team</b></span>{CHEV}</a>
  </div>''' if lead else f'''
  <div class="sec">This week</div>
  <div>
    <a class="row one" href="#"><span class="rt"><b>Shifts</b></span><span class="rv l">7 · 56 h</span>{CHEV}</a>
    <div class="row one"><span class="rt"><b>Clock</b></span><span class="rv l">Off clock</span></div>
  </div>
  <p class="help">Punches come from your location’s Clocker.</p>'''
    return f'''  <div class="bar"><span class="org">Northside QA Workforce</span><span class="sp"></span><a href="#" aria-label="Notifications">{{{{i:Bell}}}}</a></div>
  <div class="hd"><h1>Today</h1><p>Saturday, October 24</p></div>
  <a class="key" href="#"><small>Next shift · Tomorrow</small><b>Sunday, October 25</b><i>8:00 AM – 4:00 PM</i><em>Main Office · Customer Support{' · Shift lead' if lead else ''}</em></a>
  <div class="sec">Needs you</div>
  <div>
    <a class="row" href="#"><span class="rt"><b>Confirm your schedule</b><i>Oct 19 – 25 and Oct 26 – Nov 1</i></span><span class="count">2</span>{CHEV}</a>
  </div>{team}
  {{{{etabs:Home}}}}'''

page('E01-Home', 'Home', home())
page('L01-LeadHome', 'Lead · Home', home(lead=True))
page('D01-HomeDark', 'Dark · Home', home(dark=True), dark=True)

def schedule(dark=False):
    return f'''  <div class="bar"><span class="org">Northside QA Workforce</span><span class="sp"></span><a href="#" aria-label="Add to your calendar">{{{{i:CalendarCheck}}}}</a></div>
  <div class="hd"><h1>Schedule</h1><p>Oct 19 – 25 · 7 shifts · 56 h</p></div>
  <div class="seg"><span class="on">My shifts</span><span>Open shifts</span></div>
  {week()}
  <div style="margin-top:20px"><div class="row"><span class="rt"><b>Confirm this week</b><i>Your manager asked you to check it</i></span><a class="bs go" href="#">Confirm</a></div></div>
  <div class="sh"><b>Saturday</b><span>Day off</span></div>
  <p class="empty">No shift today.</p>
  <div class="sh"><b>Coming up</b></div>
  <div>
    <a class="row" href="#"><span class="rt"><b>Sunday, Oct 25</b><i>8:00 AM – 4:00 PM · Main Office</i></span>{CHEV}</a>
    <a class="row" href="#"><span class="rt"><b>Monday, Oct 26</b><i>8:00 AM – 4:00 PM · Main Office</i></span>{CHEV}</a>
  </div>
  {{{{etabs:Schedule}}}}'''
page('E02-Schedule', 'Schedule', schedule(), WK)
page('D02-ScheduleDark', 'Dark · Schedule', schedule(True), WK, dark=True)

BEHIND = '''  <div class="behind"><div class="hd" style="padding-top:62px"><h1>Schedule</h1><p>Oct 19 – 25 · 7 shifts · 56 h</p></div></div>
  <div class="dim"></div>'''
page('E03-ShiftSheet', 'Shift (sheet)', f'''{BEHIND}
  <div class="sheet">
    <div class="grab"></div>
    <div class="nav"><span></span><span class="t">Shift</span><a class="r b" href="#">Done</a></div>
    <div class="hd"><h1 style="font-size:28px;line-height:34px">Sunday, Oct 25</h1><p>8:00 AM – 4:00 PM · 8 hours</p></div>
    <div style="margin-top:16px">
      <div class="row one"><span class="rt"><b>Location</b></span><span class="rv l">Main Office</span></div>
      <div class="row one"><span class="rt"><b>Position</b></span><span class="rv l">Customer Support</span></div>
      <div class="row one"><span class="rt"><b>Shift lead</b></span><span class="rv l">Morgan Rivera</span></div>
    </div>
    <div class="grp">Change this shift</div>
    <div>
      <a class="row one" href="#">{{{{i:ArrowsLeftRight}}}}<span class="rt"><b>Swap with a teammate</b></span>{CHEV}</a>
      <a class="row one" href="#">{{{{i:HandCoins}}}}<span class="rt"><b>Offer it for cover</b></span>{CHEV}</a>
      <a class="row one danger" href="#">{{{{i:CalendarX}}}}<span class="rt"><b>Unable to work this shift</b></span>{CHEV}</a>
    </div>
  </div>''', ROWICON)

page('E04-SwapSheet', 'Swap (sheet)', f'''{BEHIND}
  <div class="sheet">
    <div class="grab"></div>
    <div class="nav"><a class="l t2" href="#">Cancel</a><span class="t">Swap shift</span><a class="r b" href="#">Send</a></div>
    <div class="grp grp m">Your shift</div>
    <div><div class="row one"><span class="rt"><b>Sun, Oct 25</b></span><span class="rv l">8:00 AM – 4:00 PM</span></div></div>
    <div class="grp">Trade with</div>
    <div>
      <a class="row av-row" href="#"><span class="av">MJ</span><span class="rt"><b>María José Rivera</b><i>Thu, Oct 29 · 9:00 AM – 5:00 PM</i></span><span class="radio on"></span></a>
      <a class="row av-row" href="#"><span class="av">MR</span><span class="rt"><b>Morgan Rivera</b><i>Wed, Oct 28 · 12:00 – 8:00 PM</i></span><span class="radio"></span></a>
      <a class="row av-row" href="#"><span class="av">TR</span><span class="rt"><b>Taylor Rivera</b><i>Fri, Oct 30 · 8:00 AM – 4:00 PM</i></span><span class="radio"></span></a>
    </div>
    <div class="fl"><label>Note · optional</label><div class="in ph area" style="height:88px">Add a note for María José</div></div>
    <p class="help">María José accepts first, then your manager approves the swap.</p>
  </div>''')

reasons = ['Illness / sick', 'Family emergency', 'Transportation issue', 'School conflict', 'Personal emergency', 'Other']
rrows = ''.join(f'<a class="row one" href="#"><span class="rt"><b>{r}</b></span><span class="radio{" on" if i == 0 else ""}"></span></a>' for i, r in enumerate(reasons))
page('E05-CalloutSheet', 'Unable to work (sheet)', f'''{BEHIND}
  <div class="sheet">
    <div class="grab"></div>
    <div class="nav"><a class="l t2" href="#">Cancel</a><span class="t">Unable to work</span><a class="r b" href="#">Send</a></div>
    <div class="grp grp m">Shift</div>
    <div><div class="row one"><span class="rt"><b>Sun, Oct 25</b></span><span class="rv l">8:00 AM – 4:00 PM</span></div></div>
    <div class="grp">Reason</div>
    <div>{rrows}</div>
    <div class="fl"><label>Note · optional</label><div class="in ph">Add a short note</div></div>
  </div>''')

def requests(dark=False):
    return f'''  <div class="bar"><span class="org">Northside QA Workforce</span><span class="sp"></span><a href="#" aria-label="New request">{{{{i:Plus}}}}</a></div>
  <div class="hd"><h1>Requests</h1><p>1 waiting for approval</p></div>
  <div class="grp">Waiting</div>
  <div>
    <a class="row" href="#"><span class="rt"><b>Time off · Nov 3 – 4</b><i>2 full days · Sent Oct 24</i></span><span class="rv">Waiting</span>{CHEV}</a>
  </div>
  <div class="grp">Ask for</div>
  <div>
    <a class="row one" href="#">{{{{i:CalendarMinus}}}}<span class="rt"><b>Time off</b></span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:ArrowsLeftRight}}}}<span class="rt"><b>Swap or cover a shift</b></span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:Clock}}}}<span class="rt"><b>Availability</b></span><span class="rv l">Due Fri</span>{CHEV}</a>
  </div>
  <a class="btn quiet" href="#" style="margin-top:16px">Which request should I use?</a>
  {{{{etabs:Requests}}}}'''
page('E06-Requests', 'Requests', requests(), ROWICON)
page('D03-RequestsDark', 'Dark · Requests', requests(True), ROWICON, dark=True)

page('E07-TimeOff', 'Time off', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Requests</a></div>
  <div class="hd"><h1>Time off</h1></div>
  <div class="seg"><span class="on">Waiting · 1</span><span>Decided</span></div>
  <div style="margin-top:16px">
    <a class="row" href="#"><span class="rt"><b>Tue, Nov 3 – Wed, Nov 4</b><i>2 full days · Sent Oct 24</i></span>{CHEV}</a>
  </div>
  <a class="btn" href="#">Request time off</a>
  {{{{etabs:Requests}}}}''')

page('E08-TimeOffSheet', 'Request time off (sheet)', f'''  <div class="behind"><div class="hd" style="padding-top:62px"><h1>Time off</h1></div></div>
  <div class="dim"></div>
  <div class="sheet">
    <div class="grab"></div>
    <div class="nav"><a class="l t2" href="#">Cancel</a><span class="t">Time off</span><a class="r b" href="#">Send</a></div>
    <div class="seg" style="margin-top:12px"><span class="on">Full days</span><span>Part of a day</span></div>
    <div style="margin-top:16px">
      <a class="row one" href="#"><span class="rt"><b>From</b></span><span class="rv go">Tue, Nov 3</span></a>
      <a class="row one" href="#"><span class="rt"><b>Until</b></span><span class="rv go">Wed, Nov 4</span></a>
    </div>
    <p class="help">2 full days</p>
    <div class="fl"><label>Note · optional</label><div class="in ph area" style="height:96px">Only include details you want to share.</div></div>
    <p class="help">Your manager reviews it. The time is yours once it’s approved.</p>
  </div>''')

page('E09-ShiftRequests', 'Shift requests', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Requests</a></div>
  <div class="hd"><h1>Shift requests</h1></div>
  <div class="seg"><span class="on">Open shifts</span><span>For you</span><span>Yours</span></div>
  <p class="empty" style="margin-top:48px;font-size:17px;line-height:22px;color:#111413">No open shifts right now</p>
  <p class="help">When a teammate offers a shift you can work, it shows up here.</p>
  {{{{etabs:Requests}}}}''')

days = [('Monday', '8:00 AM – 4:00 PM'), ('Tuesday', '8:00 AM – 4:00 PM'), ('Wednesday', 'Unavailable'), ('Thursday', '8:00 AM – 4:00 PM'), ('Friday', '12:00 – 8:00 PM'), ('Saturday', 'Unavailable'), ('Sunday', 'Unavailable')]
drows = ''.join(f'<a class="row one" href="#"><span class="rt"><b>{d}</b></span><span class="rv {"ph" if v == "Unavailable" else "l"}">{v}</span>{CHEV}</a>' for d, v in days)
page('E10-Availability', 'Availability', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Requests</a><span></span><a class="r b" href="#">Save</a></div>
  <div class="hd"><h1>Availability</h1><p>Your usual week · 32 h</p></div>
  <div style="margin-top:16px">{drows}</div>
  <p class="help">Send it by Friday, Oct 30 for the week of Nov 2. An end time of midnight includes the rest of that day.</p>
  {{{{etabs:Requests}}}}''')

page('E11-Pay', 'Pay', f'''  <div class="bar"><span class="org">Northside QA Workforce</span><span class="sp"></span></div>
  <div class="hd"><h1>Pay</h1></div>
  <div class="lead"><b>Next payday is Tuesday, October 27</b><i>In 3 days · for Oct 19 – 25</i></div>
  <div class="grp" style="margin-top:32px">This week</div>
  <div>
    <a class="row one" href="#"><span class="rt"><b>My time</b></span><span class="rv l">32.5 h</span>{CHEV}</a>
    <a class="row one" href="#"><span class="rt"><b>Timecards</b></span>{CHEV}</a>
  </div>
  <div class="grp">Statements</div>
  <p class="empty">No published statements yet.</p>
  <p class="help">Only your own published statements are available here. Downloaded files may contain personal pay information.</p>
  {{{{etabs:Pay}}}}''')

page('E12-MyTime', 'My time', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Pay</a></div>
  <div class="hd"><h1>My time</h1><p>Saturday, Oct 24 · Off clock</p></div>
  <div style="margin-top:16px">
    <div class="row one"><span class="rt"><b>Worked today</b></span><span class="rv l">0 h</span></div>
    <div class="row one"><span class="rt"><b>On break</b></span><span class="rv l">0 h</span></div>
    <a class="row one" href="#"><span class="rt"><b>This week</b></span><span class="rv l">32.5 h</span>{CHEV}</a>
  </div>
  <div class="grp">Today</div>
  <p class="empty">No recorded punches today.</p>
  <div class="grp">Corrections</div>
  <a class="btn sec" href="#" style="margin-top:12px">Request a correction</a>
  <p class="help">Your manager reviews each request. Your original times are kept.</p>
  {{{{etabs:Pay}}}}''')

def updates(lead=False):
    right = f'<a class="r" href="#" aria-label="Message today’s team">{{{{i:Plus}}}}</a>' if lead else '<span></span>'
    return f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}More</a><span></span>{right}</div>
  <div class="hd"><h1>Updates</h1><p>All caught up</p></div>
  <div class="seg"><span class="on">All</span><span>To review</span><span>Reviewed</span></div>
  <div style="margin-top:16px">
    <a class="row av-row" href="#"><span class="av">{{{{i:Megaphone}}}}</span><span class="rt"><b>This week’s team schedule</b><i>Morgan Rivera · Reviewed Oct 22</i></span>{CHEV}</a>
  </div>
  <p class="help">Opening an update doesn’t confirm it.</p>
  {{{{etabs:More}}}}'''
page('E13-Updates', 'Updates', updates())
page('L02-LeadUpdates', 'Lead · Updates', updates(lead=True))

page('E14-Notifications', 'Notifications', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Today</a></div>
  <div class="hd"><h1>Notifications</h1><p>2 to review</p></div>
  <div class="seg"><span class="on">All · 2</span><span>Unread · 2</span></div>
  <div style="margin-top:16px">
    <a class="row av-row" href="#"><span class="av">{{{{i:CalendarBlank}}}}</span><span class="rt"><b>Review your schedule</b><i>Week of Oct 26 – Nov 1 · 5:01 PM</i></span>{CHEV}</a>
    <a class="row av-row" href="#"><span class="av">{{{{i:CalendarBlank}}}}</span><span class="rt"><b>Review your schedule</b><i>Week of Oct 19 – 25 · 5:01 PM</i></span>{CHEV}</a>
  </div>
  <p class="help">Opening one doesn’t complete it.</p>
  {{{{etabs:Home}}}}''')

page('E15-More', 'More', f'''  <div class="hd" style="padding-top:62px"><h1>More</h1></div>
  <div style="margin-top:16px">
    <a class="row av-row" href="#"><span class="av">AR</span><span class="rt"><b>Alexandra Rivera</b><i>Employee · Profile</i></span>{CHEV}</a>
  </div>
  <div style="margin-top:24px">
    <a class="row one" href="#">{{{{i:Megaphone}}}}<span class="rt"><b>Updates</b></span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:Bell}}}}<span class="rt"><b>Notifications</b></span><span class="count">2</span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:Clock}}}}<span class="rt"><b>Availability</b></span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:CalendarCheck}}}}<span class="rt"><b>Add shifts to your calendar</b></span>{CHEV}</a>
  </div>
  <div style="margin-top:24px">
    <a class="row one" href="#">{{{{i:Info}}}}<span class="rt"><b>Support</b></span>{CHEV}</a>
    <a class="row one" href="#">{{{{i:ShieldCheck}}}}<span class="rt"><b>Privacy and terms</b></span>{CHEV}</a>
  </div>
  {{{{etabs:More}}}}''', ROWICON)

def profile(dark=False):
    return f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}More</a></div>
  <div class="who"><span class="av lg">AR</span><div><h1>Alexandra Rivera</h1><p>Employee · Northside QA Workforce</p></div></div>
  <div class="grp">Settings</div>
  <div>
    <a class="row one" href="#"><span class="rt"><b>Language</b></span><span class="rv l">English</span>{CHEV}</a>
    <a class="row one" href="#"><span class="rt"><b>Appearance</b></span><span class="rv l">Match this phone</span>{CHEV}</a>
    <a class="row one" href="#"><span class="rt"><b>Notifications</b></span><span class="rv l">On</span>{CHEV}</a>
  </div>
  <div class="grp">Work details</div>
  <div>
    <div class="row one"><span class="rt"><b>Locations</b></span><span class="rv l">Main · West Office</span></div>
    <div class="row one"><span class="rt"><b>Time zone</b></span><span class="rv l">Puerto Rico</span></div>
  </div>
  <p class="help">Something wrong here? Ask your manager to update it.</p>
  <div class="grp">Your account</div>
  <div>
    <a class="row one" href="#"><span class="rt"><b>Privacy Policy</b></span>{CHEV}</a>
    <a class="row one danger" href="#"><span class="rt"><b>Delete my account</b></span>{CHEV}</a>
  </div>
  <a class="btn danger" href="#" style="margin-top:16px">Sign out</a>
  {{{{etabs:More}}}}'''
page('E16-Profile', 'Profile', profile(), WHO, height=1010)
page('D04-ProfileDark', 'Dark · Profile', profile(True), WHO, dark=True, height=1010)

page('E17-DeleteAccount', 'Delete account', f'''  <div class="nav"><a class="l" href="#">{{{{i:CaretLeft:s}}}}Profile</a></div>
  <div class="hd"><h1>Delete your NEVORA account</h1><p>Read what happens before you confirm.</p></div>
  <div class="grp">Your account</div>
  <div>
    <div class="row one"><span class="rt"><b>Name</b></span><span class="rv l">Alexandra Rivera</span></div>
    <div class="row one"><span class="rt"><b>Role</b></span><span class="rv l">Employee</span></div>
    <div class="row one"><span class="rt"><b>Employee ID</b></span><span class="rv l">AUDIT-E</span></div>
  </div>
  <div class="grp">What happens</div>
  <div>
    <div class="row av-row" style="padding-top:12px;padding-bottom:12px"><span class="av">{{{{i:SignOut}}}}</span><span class="rt"><b>Your access ends now.</b><i>You’re signed out on every device and can’t sign in again. Calendar feed links stop working.</i></span></div>
    <div class="row av-row" style="padding-top:12px;padding-bottom:12px"><span class="av">{{{{i:Trash}}}}</span><span class="rt"><b>What is removed</b><i>Your profile, sign-in details, notification subscriptions, calendar links and the content you contributed, within 30 calendar days after we receive the request.</i></span></div>
    <a class="row av-row" href="#" style="padding-top:12px;padding-bottom:12px"><span class="av">{{{{i:ShieldCheck}}}}</span><span class="rt"><b>What may be kept</b><i>Some attendance, payroll, security or dispute records your employer or we must keep. They’re restricted and never used to restore your account.</i></span>{CHEV}</a>
  </div>
  <div class="grp">Confirm it’s you</div>
  <div class="fl" style="margin-top:8px"><label>Password</label><div class="in ph">Password{{{{i:Eye}}}}</div></div>
  <div style="margin-top:12px"><div class="row" style="padding-top:12px;padding-bottom:12px"><span class="rt"><b style="font-size:15px;line-height:20px">I understand my NEVORA account will be deleted and I won’t be able to sign in again.</b></span><span class="tog off"></span></div></div>
  <a class="btn off" href="#" style="margin-top:16px">Confirm deletion request</a>
  <a class="btn quiet" href="#">Keep my account</a>
  <div class="grp">Your job and your workplace</div>
  <p class="help">Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>
  {{{{etabs:More}}}}''', height=1330)

# ---------------- Manager ----------------
page('M01-NoAccess', 'Manager · No access', '''  <div class="hd" style="padding-top:62px"><h1>Team unavailable</h1></div>
  <p class="body" style="margin-top:12px;color:#6B6B6B">This page needs current company-wide management access. Return to Home, or sign in again if your access changed.</p>
  <a class="btn sec" href="#">Return to Home</a>
  <a class="btn quiet" href="#">Sign in again</a>
  <a class="btn quiet" href="#">Refresh current view</a>
  <nav class="tabs" style="grid-template-columns:repeat(2,1fr)"><a href="#">{{i:House}}Home</a><a class="on" href="#">{{f:DotsThreeCircle}}More</a></nav>''')

# ---------------- Dark: sign-in and Owner ----------------
page('D05-SignInDark', 'Dark · Sign in', '''  <div class="top">{{wordmark:#F2F2F0:104}}<a href="#">Español</a></div>
  <div class="hd"><h1>Good evening</h1><p>Northside QA Workforce</p></div>
  <div class="fl"><label>Employee ID</label><div class="in ph">e.g. 10482</div></div>
  <div class="fl"><label>Password</label><div class="in ph">Password{{i:Eye}}</div></div>
  <a class="btn" href="#">Sign in</a>
  <a class="btn sec" href="#" style="margin-top:12px">Sign in with Face ID</a>
  <div class="links"><a href="#">Forgot access?</a><a href="#">Activate account</a></div>
  <div class="foot">© 2026 VELANI LLC · <a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Support</a></div>''',
'''.top{display:flex;align-items:center;justify-content:space-between;height:44px;padding:54px 20px 0}
.top a{font-size:15px;line-height:20px;color:#9A9A96 !important}
.links{display:flex;justify-content:space-between;margin:8px 20px 0}
.links a{display:flex;align-items:center;height:44px;color:#5CC8BE !important}
.hd{padding-top:40px}
.dark .foot a{color:#C7C7CC !important}''', dark=True)

page('D06-OwnerTodayDark', 'Dark · Owner Today', f'''  <div class="bar"><span class="org">Northside QA Workforce</span><span class="sp"></span><a href="#" aria-label="Notifications">{{{{i:Bell}}}}</a></div>
  <div class="hd"><h1>Today</h1><p>Friday, October 23</p></div>
  <div class="sec">Right now</div>
  <div><a class="row" href="#"><span class="rt"><b>6 of 8 on shift</b><i>Marco Silva starts at 4:00 PM</i></span>{CHEV}</a></div>
  <div class="sec">Needs you</div>
  <div>
    <a class="row" href="#"><span class="rt"><b>Jordan Torres is late</b><i>Shift began at 9:00 AM</i></span><span class="rv alert">24 min</span>{CHEV}</a>
    <a class="row" href="#"><span class="rt"><b>2 open shifts</b><i>Today and tomorrow</i></span>{CHEV}</a>
    <a class="row" href="#"><span class="rt"><b>2 requests</b><i>Time off and a shift swap</i></span>{CHEV}</a>
  </div>
  <div class="sec">Setup</div>
  <div><a class="row" href="#"><span class="rt"><b>4 of 6 steps done</b><i>Next, add your positions</i></span>{CHEV}</a></div>
  {{{{tabs:Home}}}}''', dark=True)

print('written', len(os.listdir(D)))
