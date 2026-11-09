import ActivityKit
import SwiftUI
import WidgetKit

/// This file is intentionally outside the App target. Add to a dedicated Widget
/// Extension on the macOS runner before attempting Q3; it is not yet executable.
@available(iOS 16.2, *)
@main
struct ShiftActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ShiftActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                Text(context.attributes.location).font(.headline)
                HStack(spacing: 4) {
                    Text("Starts")
                    Text(context.state.startsAt, style: .time)
                }.font(.body)
            }
            .padding()
            .activityBackgroundTint(Color(red: 0.051, green: 0.212, blue: 0.204))
            .activitySystemActionForegroundColor(.white)
            .foregroundStyle(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.location).font(.headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 4) {
                        Text("Starts")
                        Text(context.state.startsAt, style: .time)
                    }
                }
            } compactLeading: {
                Image(systemName: "clock").accessibilityLabel("Shift starts")
            } compactTrailing: {
                Text(context.state.startsAt, style: .time)
            } minimal: {
                Image(systemName: "clock").accessibilityLabel("Shift starts")
            }
        }
    }
}
