import XCTest

final class NevoraUITests: XCTestCase {
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
