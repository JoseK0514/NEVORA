import Foundation

public enum SessionStatus: Equatable, Sendable {
    case authenticated, unauthenticated
    public enum ReadError: Error { case unavailable }

    public static func decode(statusCode: Int, data: Data) throws -> Self {
        struct Envelope: Decodable { let protocolVersion: Int; let state: String }
        guard data.count <= 4096,
              let envelope = try? JSONDecoder().decode(Envelope.self, from: data),
              envelope.protocolVersion == 1 else { throw ReadError.unavailable }
        switch (statusCode, envelope.state) {
        case (200, "authenticated"): return .authenticated
        case (401, "unauthenticated"): return .unauthenticated
        default: throw ReadError.unavailable
        }
    }
}

/// Callback tickets are invalidated before hiding private content on suspension.
public struct ShellLifecycle {
    private var generation = 0
    private var active = false
    public init() {}
    public mutating func activate() -> Int {
        generation += 1
        active = true
        return generation
    }
    public mutating func suspend() {
        generation += 1
        active = false
    }
    public func accepts(_ ticket: Int) -> Bool { active && ticket == generation }
}
