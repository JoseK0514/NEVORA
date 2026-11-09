import CryptoKit
import XCTest

@testable import NevoraShellCore

final class NativeRegistrationTests: XCTestCase {
  private func vectors() throws -> [[String: Any]] {
    let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
      .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    let body =
      try JSONSerialization.jsonObject(
        with: Data(contentsOf: root.appendingPathComponent("contracts/registration-v1.json")))
      as! [String: Any]
    return body["vectors"] as! [[String: Any]]
  }
  func testPublicGoldenVectorsUseExactlyTheServerSignedBytes() throws {
    for v in try vectors() {
      let c = v["challenge"] as! [String: Any]
      let scope = NativeEnrollmentScope(
        origin: "https://nevora.example", environment: "test", platform: c["platform"] as! String,
        appId: "com.velani.nevora.development", provider: c["provider"] as! String,
        keyFingerprint: String(repeating: "a", count: 64))
      let digest: String? =
        c["operation"] as? String == "detach"
        ? nil : "85337816d263d362acb23a4255a636191075c2a90c47f2ee6db3362f7df11203"
      let bytes = try NativeRegistration.proofBytes(
        c, digest: digest, scope: scope,
        now: ISO8601DateFormatter().date(from: "2026-11-02T12:01:00Z")!)
      XCTAssertEqual(String(data: bytes, encoding: .utf8), v["utf8"] as? String)
      XCTAssertEqual(
        SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined(), v["sha256"] as? String
      )
      let key = P256.Signing.PrivateKey()
      let signature = try key.signature(for: bytes)
      XCTAssertTrue(
        key.publicKey.isValidSignature(
          try P256.Signing.ECDSASignature(derRepresentation: signature.derRepresentation),
          for: bytes))
    }
  }
  func testForeignScopeOrExpiredChallengesCannotBeSigned() throws {
    let c = try vectors()[0]["challenge"] as! [String: Any]
    let scope = NativeEnrollmentScope(
      origin: "https://nevora.example", environment: "test", platform: "ios",
      appId: "com.velani.nevora.development", provider: "apns-sandbox",
      keyFingerprint: String(repeating: "a", count: 64))
    for field in [
      "origin", "environment", "platform", "appId", "provider", "keyFingerprint", "nonce",
      "challengeId", "issuedAt", "expiresAt",
    ] {
      var changed = c
      changed[field] = "foreign"
      XCTAssertThrowsError(
        try NativeRegistration.proofBytes(
          changed, digest: String(repeating: "a", count: 64), scope: scope,
          now: ISO8601DateFormatter().date(from: "2026-11-02T12:01:00Z")!), field)
    }
    XCTAssertThrowsError(
      try NativeRegistration.proofBytes(
        c, digest: String(repeating: "a", count: 64), scope: scope, now: Date()))
  }
}
