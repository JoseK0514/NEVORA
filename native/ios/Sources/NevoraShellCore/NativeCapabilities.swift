import CoreFoundation
import Foundation

public enum NativeCapabilities {
  public static func link(_ url: URL, policy: BackendPolicy) -> URL? {
    guard policy.contains(url), url.absoluteString.utf8.count <= 2048,
      let parts = URLComponents(url: url, resolvingAgainstBaseURL: false), parts.fragment == nil,
      !parts.percentEncodedPath.contains("%"), !parts.path.contains("\\"),
      !parts.path.split(separator: "/").contains(where: { $0 == "." || $0 == ".." }),
      parts.path == "/app" || parts.path.hasPrefix("/app/")
        || ["/login", "/activate", "/reset-access", "/forgot-access"].contains(parts.path)
    else { return nil }
    let items = parts.queryItems ?? []
    guard items.count <= 16, Set(items.map(\.name)).count == items.count,
      items.allSatisfy({
        $0.name.range(of: "^[A-Za-z][A-Za-z0-9_-]{0,63}$", options: .regularExpression) != nil
          && ($0.value ?? "").range(of: "[\\x00-\\x1f\\x7f\\\\]", options: .regularExpression)
            == nil
      })
    else { return nil }
    return url
  }
  public static func documentBrowserPage(_ path: String, from source: String? = nil) -> String? {
    if path.hasPrefix("/api/payroll/documents/") {
      if source == "/app/my-pay" { return "/app/my-pay" }
      if source == "/app/payroll" || source?.hasPrefix("/app/payroll/") == true { return "/app/payroll" }
      return "/app"
    }
    if path == "/app/my-pay" { return "/app/my-pay" }
    if path == "/api/reports/export" || path == "/app/reports" { return "/app/reports" }
    if path == "/api/payroll-export" || path == "/api/period-close/artifact"
      || path == "/app/payroll-export" { return "/app/payroll-export" }
    if path == "/app/payroll" || path.hasPrefix("/app/payroll/") { return "/app/payroll" }
    return nil
  }

}

public struct NativeCapabilityCommand {
  public let id: String
  public let method: String
  public let payload: String
}
public final class NativeCapabilityGate {
  private let policy: BackendPolicy
  private var ids = Set<String>()
  public private(set) var nonce: String?
  public init(policy: BackendPolicy) { self.policy = policy }
  public func begin(_ page: URL) -> String? {
    suspend()
    guard page.scheme == "https", NativeCapabilities.link(page, policy: policy) != nil else {
      return nil
    }
    nonce = UUID().uuidString.lowercased()
    return nonce
  }
  public func suspend() {
    nonce = nil
    ids.removeAll()
  }
  public func accept(_ data: Data, source: URL, mainFrame: Bool) -> NativeCapabilityCommand? {
    guard mainFrame, policy.contains(source), source.scheme == "https", let nonce,
      data.count <= 16384, ids.count < 64,
      let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
      Self.memberCount(data) == 5,
      Set(body.keys) == Set(["version", "id", "nonce", "method", "payload"]),
      let version = body["version"] as? NSNumber, CFGetTypeID(version) != CFBooleanGetTypeID(),
      version == 1,
      let id = body["id"] as? String, UUID(uuidString: id)?.uuidString.lowercased() == id,
      let supplied = body["nonce"] as? String,
      let method = body["method"] as? String,
      ["hello", "notifications.permission", "notifications.complete", "notifications.detach"]
        .contains(method),
      supplied == nonce || method == "hello" && supplied.isEmpty,
      let payload = body["payload"] as? String, payload.utf8.count <= 8192,
      method == "notifications.complete"
        ? !payload.isEmpty
        : method == "notifications.detach"
          ? UUID(uuidString: payload)?.uuidString.lowercased() == payload : payload.isEmpty,
      !ids.contains(id)
    else { return nil }
    ids.insert(id)
    return NativeCapabilityCommand(id: id, method: method, payload: payload)
  }
  private static func memberCount(_ data: Data) -> Int {
    // JSONSerialization has already checked grammar. Count only colons
    // outside strings; exactly five members and five decoded keys rejects
    // duplicate keys (including escaped aliases).
    var quoted = false
    var escaped = false
    var count = 0
    for byte in data {
      if quoted {
        if escaped {
          escaped = false
        } else if byte == 92 {
          escaped = true
        } else if byte == 34 {
          quoted = false
        }
      } else if byte == 34 {
        quoted = true
      } else if byte == 58 {
        count += 1
      }
    }
    return count
  }
}
