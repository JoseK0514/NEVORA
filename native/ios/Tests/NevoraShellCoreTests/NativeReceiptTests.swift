import XCTest

@testable import NevoraShellCore

final class NativeReceiptTests: XCTestCase {
  func testDetachedRevisionIsKeptWithoutBecomingAnActiveEnrollment() throws {
    let receipt = try XCTUnwrap(
      NativeReceipt(revision: "11111111-1111-4111-8111-111111111111", active: false))
    XCTAssertNil(receipt.generation)
    XCTAssertEqual(receipt.revision, "11111111-1111-4111-8111-111111111111")
    XCTAssertFalse(receipt.canRotate)
  }
  func testLateRotationCannotOverwriteAChangedOrDetachedReceipt() throws {
    let a = "11111111-1111-4111-8111-111111111111"
    let b = "22222222-2222-4222-8222-222222222222"
    let active = try XCTUnwrap(NativeReceipt(revision: b, active: true))
    let off = try XCTUnwrap(NativeReceipt(revision: a, active: false))
    XCTAssertFalse(active.acceptsRotation(expected: a))
    XCTAssertFalse(off.acceptsRotation(expected: a))
    XCTAssertTrue(active.acceptsRotation(expected: b))
  }
  func testUnchangedTokensDoNotRotateAndNewerTokenCannotBeAcknowledgedByOldCompletion() {
    let state = NativeTokenState()
    state.update("fictional-a")
    XCTAssertTrue(state.pending)
    state.acknowledge("fictional-a")
    XCTAssertFalse(state.pending)
    state.update("fictional-a")
    XCTAssertFalse(state.pending)
    state.update("fictional-b")
    state.acknowledge("fictional-a")
    XCTAssertTrue(state.pending)
    state.acknowledge("fictional-b")
    XCTAssertFalse(state.pending)
  }
}
