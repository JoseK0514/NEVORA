import CryptoKit
import Foundation

public enum NativeCompletion {
  public static func request(
    _ challenge: [String: Any], token: String?, scope: NativeEnrollmentScope, now: Date,
    sign: (Data) throws -> Data
  ) throws -> URLRequest {
    _ = try BackendPolicy(origin: scope.origin, mode: .release)
    let digest: String?
    if challenge["operation"] as? String == "detach" {
      guard token == nil else { throw NativeRegistrationError.invalid }
      digest = nil
    } else {
      guard let token, token.utf8.count <= (scope.platform == "ios" ? 2048 : 4096), !token.isEmpty,
        token.range(
          of: scope.platform == "ios" ? "^[a-f0-9]+$" : "^[\\x21-\\x7e]+$",
          options: .regularExpression) != nil,
        scope.platform != "ios" || token.utf8.count % 2 == 0
      else { throw NativeRegistrationError.invalid }
      digest = SHA256.hash(data: Data(token.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    let proof = try NativeRegistration.proofBytes(challenge, digest: digest, scope: scope, now: now)
    let signature = try sign(proof)
    guard (8...72).contains(signature.count), let id = challenge["challengeId"] as? String,
      let nonce = challenge["nonce"] as? String,
      let url = URL(string: scope.origin + "/api/mobile/v1/notifications/complete")
    else { throw NativeRegistrationError.invalid }
    let body = try JSONSerialization.data(withJSONObject: [
      "challengeId": id, "nonce": nonce, "token": token as Any? ?? NSNull(),
      "signature": signature.base64EncodedString().replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: ""),
    ])
    guard body.count <= 16384 else { throw NativeRegistrationError.invalid }
    var request = URLRequest(
      url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
    request.httpMethod = "POST"
    request.httpShouldHandleCookies = false
    request.httpBody = body
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    return request
  }
  public static func reply(_ data: Data, status: Int) -> [String: String] {
    let off = ["state": "unavailable"]
    guard data.count <= 4096,
      let value = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
      let state = value["state"] as? String
    else { return off }
    if ["active", "complete"].contains(state) {
      guard status == 200, Set(value.keys) == Set(["state", "generation"]),
        let generation = value["generation"] as? String,
        generation.range(
          of: "^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$",
          options: .regularExpression) != nil
      else { return off }
      return ["state": state, "generation": generation]
    }
    guard Set(value.keys) == Set(["state"]),
      ["conflict": 409, "denied": 403, "throttled": 429, "unavailable": 503][state] == status
    else { return off }
    return ["state": state]
  }
}
