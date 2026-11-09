import ActivityKit
import Foundation

/// Shared by a future App target and Widget extension. Fictional data only.
@available(iOS 16.2, *)
struct ShiftActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var startsAt: Date
    }
    var location: String
}
