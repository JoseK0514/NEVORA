import CryptoKit
import XCTest

@testable import NevoraShellCore

final class NativeCompletionTests: XCTestCase {
  func testCompletionUsesFixedEndpointWithoutBrowserCookies() throws {
    let key = P256.Signing.PrivateKey()
    let scope = NativeEnrollmentScope(
      origin: "https://nevora.example", environment: "test", platform: "ios",
      appId: "com.nevora.test", provider: "apns-sandbox",
      keyFingerprint: String(repeating: "a", count: 64))
    let c: [String: Any] = [
      "version": 1, "operation": "enroll", "challengeId": "22222222-2222-4222-8222-222222222222",
      "nonce": String(repeating: "A", count: 43), "origin": scope.origin,
      "environment": scope.environment, "platform": scope.platform, "appId": scope.appId,
      "provider": scope.provider, "keyFingerprint": scope.keyFingerprint,
      "expectedGeneration": NSNull(), "issuedAt": "2030-01-01T12:00:00.000Z",
      "expiresAt": "2030-01-01T12:02:00.000Z",
    ]
    let request = try NativeCompletion.request(
      c, token: "a1b2", scope: scope,
      now: ISO8601DateFormatter().date(from: "2030-01-01T12:01:00Z")!,
      sign: { try key.signature(for: $0).derRepresentation })
    XCTAssertEqual(
      request.url?.absoluteString, "https://nevora.example/api/mobile/v1/notifications/complete")
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertFalse(request.httpShouldHandleCookies)
    XCTAssertNil(request.value(forHTTPHeaderField: "Cookie"))
    let body = try JSONSerialization.jsonObject(with: request.httpBody!) as! [String: String]
    XCTAssertEqual(Set(body.keys), Set(["challengeId", "nonce", "token", "signature"]))
    XCTAssertEqual(body["token"], "a1b2")
    XCTAssertThrowsError(
      try NativeCompletion.request(
        c, token: "RAW\nTOKEN", scope: scope, now: Date(),
        sign: { _ in
          XCTFail("Rejected input must not reach key signing")
          return Data()
        }))
  }
  func testOnlyBoundedMatchingStatusRepliesBecomePublicState() throws {
    let generation = "11111111-1111-4111-8111-111111111111"
    XCTAssertEqual(
      NativeCompletion.reply(
        Data("{\"state\":\"active\",\"generation\":\"\(generation)\"}".utf8), status: 200),
      ["state": "active", "generation": generation])
    for (body, code) in [
      ("{\"state\":\"active\",\"generation\":\"\(generation)\"}", 503),
      ("{\"state\":\"active\",\"generation\":\"bad\"}", 200),
      ("{\"state\":\"active\",\"generation\":\"\(generation)\",\"token\":\"private\"}", 200),
      (String(repeating: " ", count: 5000), 200),
    ] {
      XCTAssertEqual(
        NativeCompletion.reply(Data(body.utf8), status: code), ["state": "unavailable"])
    }
  }
}
