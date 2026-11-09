import Foundation

/// Opaque installation revision is distinct from active enrollment. A native
/// rotation may update only the active revision it actually started from.
struct NativeReceipt {
  let revision: String
  let active: Bool
  init?(revision: String, active: Bool) {
    guard
      revision.range(
        of: "^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$",
        options: .regularExpression) != nil
    else { return nil }
    self.revision = revision
    self.active = active
  }
  var generation: String? { active ? revision : nil }
  var canRotate: Bool { active }
  func acceptsRotation(expected: String) -> Bool { active && revision == expected }
}

/// Main-queue native material only, never serialized or exposed to the page.
final class NativeTokenState {
  private(set) var token: String?
  private(set) var pending = false
  func update(_ value: String) {
    guard !value.isEmpty, value.utf8.count <= 4096 else { return }
    if token != value {
      token = value
      pending = true
    }
  }
  func acknowledge(_ sent: String) { if token == sent { pending = false } }
}
