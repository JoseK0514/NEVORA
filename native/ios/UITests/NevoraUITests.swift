import XCTest

final class NevoraUITests: XCTestCase {
    func testRedirectedSubresourcesRequireRendererContainment() throws {
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_FIXTURE_ORIGIN"])
        func request(_ path: String, method: String = "GET") throws -> [String: Any] {
            let finished = expectation(description: "Owned renderer fixture")
            var result: Result<[String: Any], Error>?
            var request = URLRequest(url: try XCTUnwrap(URL(string: origin + path)))
            request.httpMethod = method; request.timeoutInterval = 3
            URLSession.shared.dataTask(with: request) { data, response, error in
                defer { finished.fulfill() }
                if let error { result = .failure(error); return }
                guard let response = response as? HTTPURLResponse, [200, 204].contains(response.statusCode) else {
                    result = .failure(URLError(.badServerResponse)); return
                }
                if response.statusCode == 204 { result = .success([:]); return }
                do { result = .success(try XCTUnwrap(JSONSerialization.jsonObject(with: data ?? Data()) as? [String: Any])) }
                catch { result = .failure(error) }
            }.resume()
            wait(for: [finished], timeout: 5)
            return try XCTUnwrap(result).get()
        }
        _ = try request("/__test/revoke-all", method: "POST")
        let app = XCUIApplication(); app.launchArguments = ["-nevora-debug-origin", origin]; app.launch()
        let signIn = app.webViews.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 20))
        app.webViews.textFields["Employee ID"].tap(); app.webViews.textFields["Employee ID"].typeText("FICTIONAL")
        app.webViews.secureTextFields["Password"].tap(); app.webViews.secureTextFields["Password"].typeText("fictional-test-password")
        signIn.tap(); XCTAssertTrue(app.webViews.staticTexts["Fictional Home"].waitForExistence(timeout: 15))
        app.webViews.links["Renderer control"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Containment complete"].waitForExistence(timeout: 15))
        XCTAssertGreaterThan(try XCTUnwrap(try request("/__test/renderer-result")["foreign"] as? Int), 0)
        app.webViews.links["Home"].tap(); app.webViews.links["Renderer protected"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Containment complete"].waitForExistence(timeout: 15))
        let protectedPage = try request("/__test/renderer-result")
        XCTAssertGreaterThanOrEqual(try XCTUnwrap(protectedPage["redirects"] as? Int), 2)
        XCTAssertGreaterThan(try XCTUnwrap(protectedPage["sameOrigin"] as? Int), 0)
        XCTAssertEqual(protectedPage["foreign"] as? Int, 0)
        app.webViews.links["Home"].tap(); app.webViews.buttons["Sign out"].tap()
        XCTAssertTrue(signIn.waitForExistence(timeout: 10))
    }
    func testNativePresentationMarker() throws {
        let app = XCUIApplication()
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_FIXTURE_ORIGIN"])
        app.launchArguments = ["-nevora-debug-origin", origin]
        app.launch()
        XCTAssertTrue(app.webViews.staticTexts["Native iOS v1"].waitForExistence(timeout: 20))
    }

    func testOnlineJourneyPersistsOnlyValidSession() throws {
        let app = XCUIApplication()
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_FIXTURE_ORIGIN"], "Run native/ios/test-ui.py to allocate an isolated fixture")
        app.launchArguments = ["-nevora-debug-origin", origin]
        app.launch()
        let signIn = app.webViews.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 20))
        app.webViews.textFields["Employee ID"].tap()
        app.webViews.textFields["Employee ID"].typeText("FICTIONAL")
        app.webViews.secureTextFields["Password"].tap()
        app.webViews.secureTextFields["Password"].typeText("fictional-test-password")
        signIn.tap()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Home"].waitForExistence(timeout: 15))
        let home = XCTAttachment(screenshot: app.screenshot())
        home.name = "Fictional Home in native container"
        home.lifetime = .keepAlways
        add(home)
        app.webViews.links["My Schedule"].tap()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Schedule"].waitForExistence(timeout: 10))
        let schedule = XCTAttachment(screenshot: app.screenshot())
        schedule.name = "Fictional Schedule in native container"
        schedule.lifetime = .keepAlways
        add(schedule)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Home"].waitForExistence(timeout: 15))
        app.webViews.buttons["Sign out"].tap()
        XCTAssertTrue(signIn.waitForExistence(timeout: 10))
        app.terminate()
        app.launch()
        XCTAssertTrue(signIn.waitForExistence(timeout: 15))
    }

    func testUnavailableBackendShowsRetryWithoutPrivateContent() throws {
        let app = XCUIApplication()
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_UNAVAILABLE_ORIGIN"])
        app.launchArguments = ["-nevora-debug-origin", origin]
        app.launch()
        XCTAssertTrue(app.buttons["Try again"].waitForExistence(timeout: 20))
        XCTAssertEqual(app.webViews.count, 0)
    }

    func testOwnerSessionIsSeparateAndPersistsAcrossRelaunch() throws {
        let app = XCUIApplication()
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_FIXTURE_ORIGIN"])
        app.launchArguments = ["-nevora-debug-origin", origin]
        app.launch()
        let signIn = app.webViews.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 20))
        app.webViews.textFields["Employee ID"].tap()
        app.webViews.textFields["Employee ID"].typeText("FICTIONAL-OWNER")
        app.webViews.secureTextFields["Password"].tap()
        app.webViews.secureTextFields["Password"].typeText("fictional-test-password")
        signIn.tap()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Owner Home"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.webViews.staticTexts["Fictional Home"].exists)
        app.terminate(); app.launch()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Owner Home"].waitForExistence(timeout: 15))
        app.webViews.buttons["Sign out"].tap()
        XCTAssertTrue(signIn.waitForExistence(timeout: 10))
    }

    func testRevocationWhileBackgroundedNeverRevealsOldHome() throws {
        let app = XCUIApplication()
        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["NEVORA_NATIVE_FIXTURE_ORIGIN"])
        app.launchArguments = ["-nevora-debug-origin", origin]
        app.launch()
        let signIn = app.webViews.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 20))
        app.webViews.textFields["Employee ID"].tap()
        app.webViews.textFields["Employee ID"].typeText("FICTIONAL")
        app.webViews.secureTextFields["Password"].tap()
        app.webViews.secureTextFields["Password"].typeText("fictional-test-password")
        signIn.tap()
        XCTAssertTrue(app.webViews.staticTexts["Fictional Home"].waitForExistence(timeout: 15))
        XCUIDevice.shared.press(.home)
        let revoked = expectation(description: "Fixture revocation acknowledged")
        var request = URLRequest(url: try XCTUnwrap(URL(string: origin + "/__test/revoke-all")))
        request.httpMethod = "POST"
        URLSession.shared.dataTask(with: request) { _, response, error in
            XCTAssertNil(error)
            XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 204)
            revoked.fulfill()
        }.resume()
        wait(for: [revoked], timeout: 5)
        app.activate()
        XCTAssertTrue(signIn.waitForExistence(timeout: 15))
        XCTAssertFalse(app.webViews.staticTexts["Fictional Home"].exists)
        app.terminate(); app.launch()
        XCTAssertTrue(signIn.waitForExistence(timeout: 15))
    }

    func testUnconfiguredAppFailsClosed() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["NEVORA is not configured"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.webViews.count, 0)
    }
}

/** Requires the separately owned full Next/PostgreSQL runner. */
final class NevoraBackendUITests: XCTestCase {
    private var app: XCUIApplication!
    private var origin = ""
    private var controlOrigin = ""
    private var owner = ""
    override func setUpWithError() throws {
        continueAfterFailure = false
        let environment = ProcessInfo.processInfo.environment
        origin = try XCTUnwrap(environment["NEVORA_NATIVE_BACKEND_ORIGIN"])
        controlOrigin = try XCTUnwrap(environment["NEVORA_NATIVE_CONTROL_ORIGIN"])
        owner = try XCTUnwrap(environment["NEVORA_NATIVE_TEST_OWNER"])
        XCTAssertNotNil(owner.range(of: "^[a-f0-9]{32}$", options: .regularExpression))
        for value in [origin, controlOrigin] {
            let url = try XCTUnwrap(URLComponents(string: value))
            XCTAssertEqual(url.scheme, "http"); XCTAssertEqual(url.host, "127.0.0.1"); XCTAssertNotNil(url.port)
            XCTAssertEqual(url.path, ""); XCTAssertNil(url.user); XCTAssertNil(url.query); XCTAssertNil(url.fragment)
        }
        try command("reset")
        app = XCUIApplication(); app.launchArguments = ["-nevora-debug-origin", origin, "-nevora-debug-focus-report"]; app.launch()
    }
    override func tearDownWithError() throws {
        defer { app?.terminate() }
        if app != nil { retain("Backend journey at teardown") }
        if !controlOrigin.isEmpty { try command("outage-off") }
    }
    private func command(_ action: String) throws {
        let finished = expectation(description: "Invocation-owned backend control")
        var successful = false
        var request = URLRequest(url: try XCTUnwrap(URL(string: controlOrigin + "/native-test")))
        request.httpMethod = "POST"; request.timeoutInterval = 5
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(owner, forHTTPHeaderField: "x-nevora-native-test-owner")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["action": action])
        URLSession.shared.dataTask(with: request) { _, response, error in
            successful = error == nil && (response as? HTTPURLResponse)?.statusCode == 200; finished.fulfill()
        }.resume()
        wait(for: [finished], timeout: 7); XCTAssertTrue(successful, "Owned backend command: \(action)")
    }
    private func expect(_ text: String) {
        XCTAssertTrue(app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch.waitForExistence(timeout: 20), "Actual backend text: \(text)")
    }
    private func link(_ text: String) -> XCUIElement {
        app.webViews.links.matching(NSPredicate(format: "label BEGINSWITH %@", text)).firstMatch
    }
    private func login(_ id: String) {
        let signIn = app.webViews.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 20))
        app.webViews.textFields["Employee ID"].tap(); app.webViews.textFields["Employee ID"].typeText(id)
        app.webViews.secureTextFields["Password"].tap(); app.webViews.secureTextFields["Password"].typeText("Fictional-Phase-A-only!")
        signIn.tap()
    }
    private func logout() {
        link("More, ").tap(); let signOut = app.webViews.buttons["Sign out"]
        XCTAssertTrue(signOut.waitForExistence(timeout: 20)); signOut.tap()
        XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20))
    }
    private func retain(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    private func openSchedule(owner: Bool) {
        let schedule = app.webViews.links["Schedule"].firstMatch
        XCTAssertTrue(schedule.waitForExistence(timeout: 20))
        retain("Home before Schedule touch")
        // XCTest cannot compute a WK fixed-link activation point on this runtime.
        // Send a real pointer event at the live accessibility frame instead.
        XCTAssertFalse(schedule.frame.isEmpty)
        XCTAssertTrue(app.frame.contains(schedule.frame))
        schedule.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let destination = owner ? app.webViews.buttons["More schedule actions"] : app.webViews.links["Next week"]
        XCTAssertTrue(destination.waitForExistence(timeout: 20), "Role-specific Schedule content")
        retain("Role-specific Schedule after native touch")
    }
    func testEmployeeActionRevocationOutageAndLogout() throws {
        login("QA-NATIVE-A"); expect("Welcome back, QA NATIVE")
        openSchedule(owner: false); link("More, ").tap(); expect("Your work"); link("Availability").tap(); expect("Your usual week")
        // WebKit exposes this aria-haspopup row as Other on iOS 26.5.
        let monday = app.webViews.otherElements.matching(NSPredicate(format: "label BEGINSWITH %@", "Monday,")).firstMatch
        XCTAssertTrue(monday.waitForExistence(timeout: 20)); monday.tap()
        let available = app.webViews.switches["Available on Monday"]
        XCTAssertTrue(available.waitForExistence(timeout: 20)); available.tap(); app.webViews.buttons["Done"].tap()
        app.webViews.buttons["Save"].tap(); expect("Usual hours saved"); try command("verify-employee"); retain("Employee availability saved")
        XCUIDevice.shared.press(.home); try command("revoke"); app.activate()
        XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20))
        login("QA-NATIVE-A"); expect("Welcome back, QA NATIVE")
        XCUIDevice.shared.press(.home); try command("outage-on"); app.activate()
        XCTAssertTrue(app.buttons["Try again"].waitForExistence(timeout: 20)); XCTAssertEqual(app.webViews.count, 0)
        try command("outage-off"); app.buttons["Try again"].tap(); expect("Welcome back, QA NATIVE")
        app.terminate(); app.launch(); XCTAssertEqual(app.state, .runningForeground); expect("Welcome back, QA NATIVE")
        logout(); app.terminate(); app.launch(); XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20)); retain("Employee signed out after restart")
    }
    func testOwnerActionAndPersistentSession() throws {
        login("QAOWNER"); expect("Welcome back, Fictional")
        openSchedule(owner: true); link("More, ").tap(); link("Settings").tap(); link("Company profile").tap()
        let name = app.webViews.textFields["Business name"]
        XCTAssertTrue(name.waitForExistence(timeout: 20)); XCTAssertEqual(name.value as? String, "QA")
        name.tap()
        // Documented iOS keyboard event, independent of caret position/menu layout.
        name.typeKey("a", modifierFlags: .command)
        name.typeText("Fictional iOS Company")
        XCTAssertEqual(name.value as? String, "Fictional iOS Company")
        app.webViews.buttons["Save"].tap(); expect("Company profile saved"); try command("verify-owner-ios"); retain("Owner company profile saved")
        app.terminate(); app.launch(); XCTAssertEqual(app.state, .runningForeground); expect("Welcome back, Fictional"); logout(); app.terminate(); app.launch()
        XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20)); retain("Owner signed out after process restart")
    }
    func testActivatedAccountCanSignIn() throws {
        XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20))
        link("Activate account").tap(); expect("Set up your account."); link("Already activated? Sign in").tap()
        // Activation used the real owned email/password browser flow first.
        login("QA-NATIVE-JOIN"); expect("Welcome back, Fictional")
        link("More, ").tap(); expect("Fictional Activation"); retain("Activated Employee in native app")
        app.webViews.buttons["Sign out"].tap(); XCTAssertTrue(app.webViews.buttons["Sign in"].waitForExistence(timeout: 20))
    }
}
