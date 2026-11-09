import Foundation

/// The configured origin is a deployment choice, never a URL supplied by web content.
public struct BackendPolicy: Sendable {
    public enum Mode { case debug, release }
    public enum Navigation: Equatable { case internalPage, external, deny }
    public enum ConfigurationError: Error { case invalidOrigin }
    public let origin: URL

    public init(origin value: String, mode: Mode) throws {
        guard let components = URLComponents(string: value),
              let host = components.host?.lowercased(), !host.isEmpty,
              components.user == nil, components.password == nil,
              components.path.isEmpty || components.path == "/",
              components.query == nil, components.fragment == nil,
              components.port.map({ (1...65535).contains($0) }) ?? true,
              let url = components.url else { throw ConfigurationError.invalidOrigin }
        let canonicalHost = host.hasSuffix(".") ? String(host.dropLast()) : host
        let explicitLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].contains(canonicalHost)
        let loopback = explicitLoopback
            || canonicalHost.hasSuffix(".localhost") || canonicalHost.hasPrefix("127.")
        // Release uses an explicit DNS deployment hostname, never numeric/IP
        // aliases whose parsing can normalize into loopback on another layer.
        let labels = canonicalHost.split(separator: ".", omittingEmptySubsequences: false)
        let deploymentHost = labels.count >= 2 && canonicalHost.count <= 253
            && labels.allSatisfy { $0.range(of: "^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$", options: .regularExpression) != nil }
            && labels.last?.first?.isLetter == true
        guard components.scheme == "https" && (mode == .debug || deploymentHost && !loopback)
            || mode == .debug && components.scheme == "http" && explicitLoopback else {
            throw ConfigurationError.invalidOrigin
        }
        self.origin = url
    }

    public func contains(_ url: URL) -> Bool {
        url.user == nil && url.password == nil && url.scheme == origin.scheme
            && url.host?.lowercased() == origin.host?.lowercased()
            && effectivePort(url) == effectivePort(origin)
    }

    public func url(path: String) -> URL {
        // Callers supply compile-time paths, never a user-provided destination.
        origin.appendingPathComponent(path)
    }

    public func compatibilityRequest() -> URLRequest {
        var request = URLRequest(url: url(path: "/api/mobile/v1/session"), cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    public func navigation(to url: URL, method: String, userInitiated: Bool, mainFrame: Bool) -> Navigation {
        if contains(url) { return .internalPage }
        if userInitiated && mainFrame && method == "GET" && url.scheme == "https"
            && url.host != nil && url.user == nil && url.password == nil { return .external }
        return .deny
    }

    private func effectivePort(_ url: URL) -> Int? {
        url.port ?? (url.scheme == "https" ? 443 : url.scheme == "http" ? 80 : nil)
    }
}
