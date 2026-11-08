import Foundation

/// Decode the cookie-free platform discovery response. This selects an exact
/// origin; the selected backend still checks the real session and permissions.
/// Callers use the configured platform endpoint and approved base domain.
public enum WorkspaceSelection {
 public enum ReadError: Error { case unavailable }
 public static func decode(statusCode: Int, data: Data, portalBaseDomain: String, expectedSlug: String) throws -> BackendPolicy {
  struct Envelope: Decodable { let schemaVersion: Int; let status: String; let origin: String }
  guard statusCode == 200, data.count <= 1024,
        portalBaseDomain == portalBaseDomain.lowercased(), !portalBaseDomain.hasSuffix("."),
        expectedSlug.range(of: "^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$", options: .regularExpression) != nil,
        let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        Set(object.keys) == Set(["schemaVersion", "status", "origin"]),
        let envelope = try? JSONDecoder().decode(Envelope.self, from: data),
        envelope.schemaVersion == 1, envelope.status == "ready",
        envelope.origin == "https://\(expectedSlug).\(portalBaseDomain)"
  else { throw ReadError.unavailable }
  let base = try BackendPolicy(origin: "https://\(portalBaseDomain)", mode: .release)
  guard base.origin.host == portalBaseDomain, base.origin.path.isEmpty, base.origin.port == nil
  else { throw ReadError.unavailable }
  return try BackendPolicy(origin: envelope.origin, mode: .release)
 }
}
