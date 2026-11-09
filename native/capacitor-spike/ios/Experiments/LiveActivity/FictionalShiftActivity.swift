import ActivityKit
import Foundation

/// Source for the local debug trigger; not included in the App build yet.
/// No APNs token, server call, or user information is requested.
@available(iOS 16.2, *)
@MainActor
enum FictionalShiftActivity {
    static func start() throws -> Activity<ShiftActivityAttributes> {
        let start = Calendar.current.nextDate(after: Date(), matching:
            DateComponents(hour: 8, minute: 0), matchingPolicy: .nextTime)!
        return try Activity.request(
            attributes: ShiftActivityAttributes(location: "Main Office"),
            content: ActivityContent(
                state: ShiftActivityAttributes.ContentState(startsAt: start),
                staleDate: Date().addingTimeInterval(8 * 60 * 60)),
            pushType: nil
        )
    }

    static func endAll() async {
        for activity in Activity<ShiftActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
