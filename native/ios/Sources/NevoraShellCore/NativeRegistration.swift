import CoreFoundation
import Foundation

public struct NativeEnrollmentScope {
  public let origin, environment, platform, appId, provider, keyFingerprint: String
  public init(
    origin: String, environment: String, platform: String, appId: String, provider: String,
    keyFingerprint: String
  ) {
    self.origin = origin
    self.environment = environment
    self.platform = platform
    self.appId = appId
    self.provider = provider
    self.keyFingerprint = keyFingerprint
  }
}
public enum NativeRegistrationError: Error { case invalid }
public enum NativeRegistration {
  public static func proofBytes(
    _ c: [String: Any], digest: String?, scope: NativeEnrollmentScope, now: Date
  ) throws -> Data {
    func matches(_ value: Any?, _ pattern: String) -> String? {
      guard let value = value as? String,
        value.range(of: pattern, options: .regularExpression) != nil
      else { return nil }
      return value
    }
    let fields = [
      "version", "operation", "challengeId", "nonce", "origin", "environment", "platform", "appId",
      "provider", "keyFingerprint", "expectedGeneration", "issuedAt", "expiresAt",
    ]
    let uuid = "^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$"
    guard Set(c.keys) == Set(fields),
      let version = c["version"] as? NSNumber, CFGetTypeID(version) != CFBooleanGetTypeID(),
      version == 1,
      let operation = c["operation"] as? String,
      ["enroll", "rotate", "detach"].contains(operation),
      let challengeId = matches(c["challengeId"], uuid),
      let nonce = matches(c["nonce"], "^[A-Za-z0-9_-]{43}$"),
      let nonceData = Data(
        base64Encoded: nonce.replacingOccurrences(of: "-", with: "+").replacingOccurrences(
          of: "_", with: "/") + "="), nonceData.count == 32,
      nonceData.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(
        of: "/", with: "_"
      ).replacingOccurrences(of: "=", with: "") == nonce,
      c["origin"] as? String == scope.origin, c["environment"] as? String == scope.environment,
      c["platform"] as? String == scope.platform, c["appId"] as? String == scope.appId,
      c["provider"] as? String == scope.provider,
      c["keyFingerprint"] as? String == scope.keyFingerprint,
      ["test", "production"].contains(scope.environment),
      ["ios", "android"].contains(scope.platform),
      scope.platform == "android"
        ? scope.provider == "fcm"
        : scope.provider == (scope.environment == "test" ? "apns-sandbox" : "apns-production"),
      matches(scope.keyFingerprint, "^[a-f0-9]{64}$") != nil,
      let issued = matches(
        c["issuedAt"], "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"),
      let expires = matches(
        c["expiresAt"], "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$")
    else { throw NativeRegistrationError.invalid }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let start = formatter.date(from: issued), let end = formatter.date(from: expires),
      formatter.string(from: start) == issued, formatter.string(from: end) == expires,
      end.timeIntervalSince(start) == 120, now >= start, now < end
    else { throw NativeRegistrationError.invalid }
    let generation: Any
    if c["expectedGeneration"] is NSNull {
      guard operation == "enroll" else { throw NativeRegistrationError.invalid }
      generation = NSNull()
    } else {
      guard let value = matches(c["expectedGeneration"], uuid) else {
        throw NativeRegistrationError.invalid
      }
      generation = value
    }
    if operation == "detach" {
      guard digest == nil else { throw NativeRegistrationError.invalid }
    } else if matches(digest, "^[a-f0-9]{64}$") == nil {
      throw NativeRegistrationError.invalid
    }
    let tuple: [Any] = [
      1, operation, challengeId, nonce, scope.origin, scope.environment, scope.platform,
      scope.appId, scope.provider, scope.keyFingerprint, generation, issued, expires,
      digest as Any? ?? NSNull(),
    ]
    return Data("NEVORA_NATIVE_REGISTRATION_V1\n".utf8)
      + (try JSONSerialization.data(withJSONObject: tuple, options: [.withoutEscapingSlashes]))
  }
}
