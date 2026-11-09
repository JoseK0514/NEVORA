import Foundation
import XCTest
@testable import NevoraShellCore

final class BackendPolicyTests: XCTestCase {
    func testDebugDoesNotMistakeDNSPrefixForLoopback() {
        for origin in ["http://127.attacker.example:1234", "http://127.0.0.1.attacker.example", "http://127.invalid"] {
            XCTAssertThrowsError(try BackendPolicy(origin: origin, mode: .debug), origin)
        }
    }

    func testMoreReleaseLoopbackAndNumericAliasesAreRejected() {
        for origin in ["https://LOCALHOST.", "https://test.localhost", "https://127.1", "https://0177.0.0.1", "https://0x7f000001", "https://127.attacker.localhost", "https://[2001:db8::1]", "https://nevora..example", "https://nevora.example:0", "https://nevora.example:65536"] {
            XCTAssertThrowsError(try BackendPolicy(origin: origin, mode: .release), origin)
        }
    }

    func testCanonicalHostAndDefaultPortsDoNotBroadenOrigin() throws {
        let policy = try BackendPolicy(origin: "https://NEVORA.example:443/", mode: .release)
        XCTAssertTrue(policy.contains(URL(string: "https://nevora.example/app")!))
        XCTAssertFalse(policy.contains(URL(string: "https://nevora.example.:443/app")!))
        XCTAssertFalse(policy.contains(URL(string: "https://nevora.example:444/app")!))
        XCTAssertFalse(policy.contains(URL(string: "https://nevora.example@attacker.example/app")!))
    }

    func testForeignWindowOrSubframeCannotPostOrRedirect() throws {
        let policy = try BackendPolicy(origin: "https://nevora.example", mode: .release)
        let foreign = URL(string: "https://foreign.example/path")!
        XCTAssertEqual(policy.navigation(to: foreign, method: "POST", userInitiated: true, mainFrame: true), .deny)
        XCTAssertEqual(policy.navigation(to: foreign, method: "GET", userInitiated: true, mainFrame: false), .deny)
        XCTAssertEqual(policy.navigation(to: foreign, method: "GET", userInitiated: false, mainFrame: true), .deny)
        for target in ["http://foreign.example", "data:text/html,private", "file:///private", "intent://app", "https://user@foreign.example"] {
            XCTAssertEqual(policy.navigation(to: URL(string: target)!, method: "GET", userInitiated: true, mainFrame: true), .deny)
        }
    }

    func testOversizedOrMismatchedProtocolCannotBecomeSuccessful() {
        let body = #"{"protocolVersion":1,"state":"authenticated"}"#
        XCTAssertThrowsError(try SessionStatus.decode(statusCode: 401, data: Data(body.utf8)))
        XCTAssertThrowsError(try SessionStatus.decode(statusCode: 200, data: Data((body + String(repeating: " ", count: 4097)).utf8)))
        for status in [204, 302, 400, 403, 500, 503] {
            XCTAssertThrowsError(try SessionStatus.decode(statusCode: status, data: Data(body.utf8)))
        }
    }

    func testNewActivationAndRepeatedSuspensionInvalidateOlderTickets() {
        var lifecycle = ShellLifecycle()
        let first = lifecycle.activate()
        let second = lifecycle.activate()
        XCTAssertFalse(lifecycle.accepts(first))
        XCTAssertTrue(lifecycle.accepts(second))
        lifecycle.suspend(); lifecycle.suspend()
        XCTAssertFalse(lifecycle.accepts(second))
        XCTAssertFalse(lifecycle.accepts(-1))
    }

    func testReleaseRefusesInsecureAmbiguousOrUnconfiguredOrigins() {
        for origin in ["", "http://nevora.example", "https://localhost", "https://localhost.", "https://2130706433", "https://[::ffff:127.0.0.1]", "https://127.0.0.1", "https://[::1]", "https://user:secret@nevora.example", "https://nevora.example/app", "https://nevora.example?host=evil", "https://nevora.example#proof"] {
            XCTAssertThrowsError(try BackendPolicy(origin: origin, mode: .release), origin)
        }
    }

    func testDebugCleartextIsLimitedToExplicitLoopback() throws {
        XCTAssertNoThrow(try BackendPolicy(origin: "http://127.0.0.1:43841", mode: .debug))
        XCTAssertNoThrow(try BackendPolicy(origin: "http://localhost:43841", mode: .debug))
        XCTAssertThrowsError(try BackendPolicy(origin: "http://nevora.example", mode: .debug))
    }

    func testOnlyExactOriginRemainsInWebView() throws {
        let policy = try BackendPolicy(origin: "https://nevora.example", mode: .release)
        for target in ["https://nevora.example/app", "https://nevora.example:443/login", "https://nevora.example/app?week=2026-10-26"] {
            XCTAssertTrue(policy.contains(URL(string: target)!))
        }
        for target in ["https://nevora.example.evil/app", "https://evil.example", "http://nevora.example", "https://nevora.example:444", "javascript:alert(1)", "file:///private", "https://user:secret@nevora.example/app"] {
            XCTAssertFalse(policy.contains(URL(string: target)!))
        }
        XCTAssertEqual(policy.url(path: "/api/mobile/v1/session").absoluteString, "https://nevora.example/api/mobile/v1/session")
    }

    func testExternalNavigationRequiresDeliberateHTTPSGetInMainFrame() throws {
        let policy = try BackendPolicy(origin: "https://nevora.example", mode: .release)
        let external = URL(string: "https://support.example/help")!
        XCTAssertEqual(policy.navigation(to: external, method: "GET", userInitiated: true, mainFrame: true), .external)
        for (method, user, main) in [("POST", true, true), ("GET", false, true), ("GET", true, false)] {
            XCTAssertEqual(policy.navigation(to: external, method: method, userInitiated: user, mainFrame: main), .deny)
        }
        XCTAssertEqual(policy.navigation(to: URL(string: "javascript:alert(1)")!, method: "GET", userInitiated: true, mainFrame: true), .deny)
    }

    func testProtocolErrorsAndOutagesNeverBecomeAuthenticatedOrLoggedOut() throws {
        XCTAssertEqual(try SessionStatus.decode(statusCode: 200, data: Data(#"{"protocolVersion":1,"state":"authenticated"}"#.utf8)), .authenticated)
        XCTAssertEqual(try SessionStatus.decode(statusCode: 401, data: Data(#"{"protocolVersion":1,"state":"unauthenticated"}"#.utf8)), .unauthenticated)
        for (status, body) in [(503, #"{"protocolVersion":1,"state":"unavailable"}"#), (200, #"{"protocolVersion":2,"state":"authenticated"}"#), (200, #"{"protocolVersion":1,"state":"unauthenticated"}"#), (302, #"{"protocolVersion":1,"state":"authenticated"}"#), (200, "<html>login</html>")] {
            XCTAssertThrowsError(try SessionStatus.decode(statusCode: status, data: Data(body.utf8)))
        }
    }

    func testBackgroundAndNewerResumeInvalidateInFlightResults() {
        var lifecycle = ShellLifecycle()
        let first = lifecycle.activate()
        XCTAssertTrue(lifecycle.accepts(first))
        lifecycle.suspend()
        XCTAssertFalse(lifecycle.accepts(first))
        let second = lifecycle.activate()
        XCTAssertFalse(lifecycle.accepts(first))
        XCTAssertTrue(lifecycle.accepts(second))
    }

    func testCompatibilityProbeNeverExtractsOrSendsWebViewCredentials() throws {
        let policy = try BackendPolicy(origin: "https://nevora.example", mode: .release)
        let request = policy.compatibilityRequest()
        XCTAssertEqual(request.url?.absoluteString, "https://nevora.example/api/mobile/v1/session")
        XCTAssertNil(request.value(forHTTPHeaderField: "Cookie"))
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
        XCTAssertEqual(request.cachePolicy, .reloadIgnoringLocalCacheData)
    }
}
