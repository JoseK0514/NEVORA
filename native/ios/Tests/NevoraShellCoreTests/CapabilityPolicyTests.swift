import XCTest

@testable import NevoraShellCore

final class CapabilityPolicyTests: XCTestCase {
  func testPendingLinksKeepOnlyApprovedExactOriginRoutes() throws {
    let p = try BackendPolicy(origin: "https://nevora.example", mode: .release)
    for path in [
      "/app", "/app/schedule?week=2030-01-07", "/activate?token=fictional",
      "/reset-access?token=fictional", "/forgot-access", "/login",
    ] {
      XCTAssertNotNil(
        NativeCapabilities.link(URL(string: "https://nevora.example" + path)!, policy: p), path)
    }
    for path in [
      "https://foreign.example/app", "https://user@nevora.example/app",
      "https://nevora.example/api/payroll", "https://nevora.example/app/%2e%2e/api",
      "https://nevora.example/app?x=1&x=2", "https://nevora.example/app#private",
      "https://nevora.example/app/../api", "https://nevora.example/application",
    ] {
      XCTAssertNil(NativeCapabilities.link(URL(string: path)!, policy: p), path)
    }
  }
  func testDocumentFallbackUsesOnlyKnownPortalDestinations() {
    for (path, destination) in [
      ("/api/payroll/documents/fictional", "/app"), ("/app/my-pay", "/app/my-pay"),
      ("/api/reports/export", "/app/reports"), ("/api/period-close/artifact", "/app/payroll-export"),
      ("/app/payroll-export", "/app/payroll-export"), ("/api/payroll-export", "/app/payroll-export"),
      ("/app/payroll/history", "/app/payroll"),
    ] {
      XCTAssertEqual(NativeCapabilities.documentBrowserPage(path), destination)
    }
    XCTAssertEqual(NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional", from: "/app/my-pay"), "/app/my-pay")
    XCTAssertEqual(NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional/view", from: "/app/payroll/history"), "/app/payroll")
    XCTAssertEqual(NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional", from: "/app/payroll-export"), "/app")
    for path in ["https://foreign.example/app/my-pay", "/api/other", "/app/payroll-foreign"] {
      XCTAssertNil(NativeCapabilities.documentBrowserPage(path))
    }
  }
  func testCapabilityAdmissionRejectsFrameOriginReplayAndRetiredDocuments() throws {
    let p = try BackendPolicy(origin: "https://nevora.example", mode: .release)
    let gate = NativeCapabilityGate(policy: p)
    let page = URL(string: "https://nevora.example/app")!
    let nonce = try XCTUnwrap(gate.begin(page))
    let id = UUID().uuidString.lowercased()
    let body = try JSONSerialization.data(withJSONObject: [
      "version": 1, "id": id, "nonce": nonce, "method": "hello", "payload": "",
    ])
    XCTAssertNil(gate.accept(body, source: page, mainFrame: false))
    XCTAssertNil(
      gate.accept(body, source: URL(string: "https://foreign.example/app")!, mainFrame: true))
    XCTAssertNotNil(gate.accept(body, source: page, mainFrame: true))
    XCTAssertNil(gate.accept(body, source: page, mainFrame: true))
    gate.suspend()
    XCTAssertNil(gate.accept(body, source: page, mainFrame: true))
    XCTAssertNotEqual(gate.begin(page), nonce)
    XCTAssertNil(gate.accept(body, source: page, mainFrame: true))
  }
  func testMessagesRejectAmbiguousJSONAndFenceTurnOffGeneration() throws {
    let p = try BackendPolicy(origin: "https://nevora.example", mode: .release)
    let gate = NativeCapabilityGate(
      policy: try BackendPolicy(origin: "https://nevora.example", mode: .release))
    let page = URL(string: "https://nevora.example/app")!
    _ = p
    let nonce = try XCTUnwrap(gate.begin(page))
    var fields: [String: Any] = [
      "version": 1, "id": UUID().uuidString.lowercased(), "nonce": nonce,
      "method": "notifications.detach", "payload": UUID().uuidString.lowercased(),
    ]
    XCTAssertNotNil(
      gate.accept(try JSONSerialization.data(withJSONObject: fields), source: page, mainFrame: true)
    )
    fields["id"] = UUID().uuidString.lowercased()
    fields["method"] = "hello"
    fields["payload"] = ""
    let raw = String(data: try JSONSerialization.data(withJSONObject: fields), encoding: .utf8)!
    XCTAssertNil(
      gate.accept(Data(("{\"version\":1," + raw.dropFirst()).utf8), source: page, mainFrame: true))
    XCTAssertNil(gate.accept(Data((raw + "{}").utf8), source: page, mainFrame: true))
    fields["method"] = "notifications.detach"
    fields["id"] = UUID().uuidString.lowercased()
    XCTAssertNil(
      gate.accept(try JSONSerialization.data(withJSONObject: fields), source: page, mainFrame: true)
    )
  }
}
