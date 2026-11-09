# Android backend selector review

Code quality CLEAR. Recommendation APPROVE for the test change. Code blockers none. Runtime acceptance remains pending the candidate backend rerun.

Scope is the working diff against detached 6b27f408cdab13f59ce08473a8ed80f5245fa707 in native/android/app/src/androidTest/java/com/velani/nevora/development/BackendInstrumentedTest.java, lines 85–91. No production code changed.

The original UiAutomator log api29-owner-process-logcat.txt lines 189–191 records a Settings prefix lookup followed by a click at (161,31) on the com.android.systemui SD-card notification. This corroborates settings-selector-red.json. The helper now restricts lookup to the installed target package and checks the live node's reported package before issuing the click. A missing app control still fails the test. The Owner journey at lines 128–131 still requires navigation, the profile save confirmation and backend verification. The diff preserves all downstream assertions and timeouts.

Checked the locally resolved UiAutomator 2.4.0 BySelector and UiObject2 sources. pkg(String) quotes the literal package and mutates the selector. A second package criterion would throw, but all current tap callers pass fresh selectors with no package criterion, and tap applies pkg once outside the wait. getApplicationPackage() reads the accessibility node. This guard is diagnostic at the touch boundary and does not establish the downstream journey succeeded.

CRITICAL, HIGH, MEDIUM, LOW findings — none at each severity. The programming and remove-ai-slops review perspectives ran. No violations found. No stand-alone test mirrors the fix, no extraction or parsing was added and the existing behavior test can still fail on the actual application. git diff --check passed. This reviewer inspected the red artifacts, dependency sources, diff and callers. The candidate instrumentation suite was not executed by this reviewer.
