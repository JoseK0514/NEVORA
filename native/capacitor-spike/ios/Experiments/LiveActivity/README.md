# Q3 source preparation — NOT a wired or compiled Live Activity

These three files are outside the Xcode App target. No Live Activity appears in
the current prototype, and no Q3 acceptance criterion is marked passed. The Linux
workspace cannot validate an Apple extension target, signing, WidgetKit, or
ActivityKit. Adding an unverified target to the generated project would risk
breaking the runnable shell before a macOS build can check it.

On the macOS runner:

1. Add a Widget Extension with Live Activity support, using a provisional bundle
   identifier under `com.nevora.spike`. Keep configuration Debug-only.
2. Put `ShiftActivityAttributes.swift` in both App and extension targets;
   `ShiftActivityWidget.swift` in the extension; `FictionalShiftActivity.swift`
   in App. Set the extension deployment target to iOS 16.2 or newer.
3. Add `NSSupportsLiveActivities = YES` to the App's Debug Info.plist.
4. Wire explicit local debug Start/End buttons to `start()` / `endAll()`, with
   availability and `ActivityAuthorizationInfo().areActivitiesEnabled` checks.
   Do not call from arbitrary website messages. No push capabilities are needed.
5. Verify simulator lock screen and Dynamic Island, largest standard/first
   accessibility text sizes, contrast, reduced motion, and spoken labels. Device
   VoiceOver remains separate evidence.
6. Verify ending a fictional shift explicitly dismisses the activity. The
   `staleDate` is not an end timer; it only marks content stale. ActivityKit's
   eight-hour lifecycle and lock-screen retention must be measured/documented.

The source displays only a fictional location and start time. It carries no
employee name, hours, pay, or production data. Store distribution and a working
widget are not established by these files.
